import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, Plus, Edit2, Trash2, Mail, Phone, MapPin, Building2, FileImage, Upload, Save, X } from 'lucide-react'
import { blink, Tenant } from '@/blink/client'

interface TenantWithDetails extends Tenant {
  buildingName?: string
  unitNumber?: string
  hasActiveContract?: boolean
}

export function Tenants() {
  const [tenants, setTenants] = useState<TenantWithDetails[]>([])
  const [buildings, setBuildings] = useState<any[]>([])
  const [units, setUnits] = useState<any[]>([])
  const [contracts, setContracts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [editingTenant, setEditingTenant] = useState<TenantWithDetails | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [newTenant, setNewTenant] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    unitId: '',
    idDocumentUrl: ''
  })
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const user = await blink.auth.me()
      if (!user) return

      const [tenantsData, buildingsData, unitsData, contractsData] = await Promise.all([
        blink.db.tenants.list({ where: { userId: user.id } }),
        blink.db.buildings.list({ where: { userId: user.id } }),
        blink.db.units.list({ where: { userId: user.id } }),
        blink.db.contracts.list({ where: { userId: user.id } })
      ])
      
      // Enrichir les données des locataires avec les informations des bâtiments et unités
      const enrichedTenants = tenantsData.map(tenant => {
        // Trouver le contrat actif du locataire
        const activeContract = contractsData.find(contract => 
          contract.tenantId === tenant.id && contract.status === 'active'
        )
        
        let buildingName = ''
        let unitNumber = ''
        
        if (activeContract) {
          const unit = unitsData.find(u => u.id === activeContract.unitId)
          if (unit) {
            unitNumber = unit.unitNumber
            const building = buildingsData.find(b => b.id === unit.buildingId)
            if (building) {
              buildingName = building.name
            }
          }
        }

        return {
          ...tenant,
          buildingName,
          unitNumber,
          hasActiveContract: !!activeContract
        }
      })
      
      setTenants(enrichedTenants)
      setBuildings(buildingsData)
      setUnits(unitsData)
      setContracts(contractsData)
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Vérifier le type de fichier
    if (!file.type.match(/^(image\/(jpeg|jpg|png|gif|webp)|application\/pdf)$/)) {
      alert('Seuls les fichiers images (JPG, PNG, GIF, WebP) et PDF sont acceptés')
      return
    }

    // Vérifier la taille (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      alert('Le fichier ne doit pas dépasser 10MB')
      return
    }

    setUploading(true)
    try {
      const { publicUrl } = await blink.storage.upload(
        file,
        `tenants/id-documents/${Date.now()}-${file.name}`,
        { upsert: true }
      )
      
      if (isEdit && editingTenant) {
        setEditingTenant(prev => prev ? { ...prev, idDocumentUrl: publicUrl } : null)
      } else {
        setNewTenant(prev => ({ ...prev, idDocumentUrl: publicUrl }))
      }
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error)
      alert('Erreur lors de l\'upload du fichier')
    } finally {
      setUploading(false)
    }
  }

  const handleAddTenant = async () => {
    try {
      const user = await blink.auth.me()
      if (!user) return

      if (!newTenant.firstName.trim() || !newTenant.lastName.trim()) {
        alert('Le prénom et le nom sont obligatoires')
        return
      }

      await blink.db.tenants.create({
        firstName: newTenant.firstName,
        lastName: newTenant.lastName,
        email: newTenant.email,
        phone: newTenant.phone,
        address: newTenant.address,
        idDocumentUrl: newTenant.idDocumentUrl || null,
        userId: user.id
      })

      // Réinitialiser le formulaire
      setNewTenant({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        unitId: '',
        idDocumentUrl: ''
      })
      setIsAddDialogOpen(false)
      loadData() // Recharger les données
    } catch (error) {
      console.error('Erreur lors de l\'ajout du locataire:', error)
      alert('Erreur lors de l\'ajout du locataire')
    }
  }

  const handleEditTenant = async () => {
    try {
      if (!editingTenant) return

      if (!editingTenant.firstName.trim() || !editingTenant.lastName.trim()) {
        alert('Le prénom et le nom sont obligatoires')
        return
      }

      await blink.db.tenants.update(editingTenant.id, {
        firstName: editingTenant.firstName,
        lastName: editingTenant.lastName,
        email: editingTenant.email,
        phone: editingTenant.phone,
        address: editingTenant.address,
        idDocumentUrl: editingTenant.idDocumentUrl || null
      })

      setEditingTenant(null)
      setIsEditDialogOpen(false)
      loadData()
    } catch (error) {
      console.error('Erreur lors de la modification du locataire:', error)
      alert('Erreur lors de la modification du locataire')
    }
  }

  const handleDeleteTenant = async (tenantId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce locataire ? Tous les contrats associés seront également supprimés.')) {
      return
    }

    try {
      // Supprimer d'abord tous les contrats du locataire
      const tenantContracts = contracts.filter(contract => contract.tenantId === tenantId)
      for (const contract of tenantContracts) {
        await blink.db.contracts.delete(contract.id)
      }

      // Puis supprimer le locataire
      await blink.db.tenants.delete(tenantId)
      loadData()
    } catch (error) {
      console.error('Erreur lors de la suppression du locataire:', error)
      alert('Erreur lors de la suppression du locataire')
    }
  }

  const getAvailableUnits = () => {
    return units.filter(unit => {
      // Vérifier si l'unité n'a pas de contrat actif
      const hasActiveContract = contracts.some(contract => 
        contract.unitId === unit.id && contract.status === 'active'
      )
      return !hasActiveContract
    })
  }

  const filteredTenants = tenants.filter(tenant =>
    `${tenant.firstName} ${tenant.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.phone.includes(searchTerm)
  )

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Gestion des Locataires
          </h1>
          <p className="text-gray-600">
            Gérez vos locataires et leurs informations de contact
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Nouveau locataire
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Ajouter un nouveau locataire</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">Prénom *</Label>
                  <Input
                    id="firstName"
                    value={newTenant.firstName}
                    onChange={(e) => setNewTenant(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="Prénom"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Nom *</Label>
                  <Input
                    id="lastName"
                    value={newTenant.lastName}
                    onChange={(e) => setNewTenant(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Nom"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newTenant.email}
                  onChange={(e) => setNewTenant(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@exemple.com"
                />
              </div>

              <div>
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  value={newTenant.phone}
                  onChange={(e) => setNewTenant(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+212 6XX XXXXXX"
                />
              </div>

              <div>
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  value={newTenant.address}
                  onChange={(e) => setNewTenant(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Adresse complète"
                />
              </div>

              <div>
                <Label htmlFor="idDocument">Carte d'identité (Image ou PDF)</Label>
                <div className="mt-2">
                  <input
                    type="file"
                    id="idDocument"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileUpload(e, false)}
                    className="hidden"
                  />
                  <label htmlFor="idDocument" className="cursor-pointer">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                      {uploading ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-sm text-gray-600">Upload en cours...</span>
                        </div>
                      ) : newTenant.idDocumentUrl ? (
                        <div className="flex items-center justify-center space-x-2">
                          <FileImage className="w-5 h-5 text-green-600" />
                          <span className="text-sm text-green-600">Document téléchargé</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center space-x-2">
                          <Upload className="w-5 h-5 text-gray-400" />
                          <span className="text-sm text-gray-600">Cliquer pour télécharger</span>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <Button 
                  onClick={handleAddTenant} 
                  className="flex-1"
                  disabled={uploading}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Ajouter
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsAddDialogOpen(false)}
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Annuler
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Barre de recherche */}
      <div className="mb-6">
        <Input
          placeholder="Rechercher un locataire..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Users className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{tenants.length}</p>
                <p className="text-sm text-gray-600">Locataires enregistrés</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Building2 className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{tenants.filter(t => t.hasActiveContract).length}</p>
                <p className="text-sm text-gray-600">Avec contrat actif</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Mail className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{tenants.filter(t => t.email).length}</p>
                <p className="text-sm text-gray-600">Avec email</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des locataires */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTenants.map((tenant) => (
          <Card key={tenant.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">
                    {tenant.firstName} {tenant.lastName}
                  </CardTitle>
                  {tenant.hasActiveContract ? (
                    <Badge variant="default" className="mt-1">
                      Locataire actif
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="mt-1">
                      Sans contrat
                    </Badge>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setEditingTenant(tenant)
                      setIsEditDialogOpen(true)
                    }}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDeleteTenant(tenant.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              {/* Informations de contact */}
              <div className="space-y-2">
                {tenant.email && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4" />
                    <span>{tenant.email}</span>
                  </div>
                )}
                {tenant.phone && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    <span>{tenant.phone}</span>
                  </div>
                )}
                {tenant.address && (
                  <div className="flex items-start space-x-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mt-0.5" />
                    <span>{tenant.address}</span>
                  </div>
                )}
              </div>

              {/* Informations sur le logement */}
              {tenant.hasActiveContract && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-700">Logement actuel</span>
                  </div>
                  <p className="text-sm text-blue-600">
                    {tenant.unitNumber} - {tenant.buildingName}
                  </p>
                </div>
              )}

              {/* Document d'identité */}
              {tenant.idDocumentUrl && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <FileImage className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Pièce d'identité</span>
                  </div>
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="p-0 h-auto mt-1 text-blue-600"
                    onClick={() => window.open(tenant.idDocumentUrl, '_blank')}
                  >
                    Voir le document
                  </Button>
                </div>
              )}

              {/* Actions rapides */}
              <div className="pt-3 border-t">
                <div className="flex space-x-2">
                  {tenant.email && (
                    <Button variant="outline" size="sm" className="flex-1">
                      <Mail className="w-4 h-4 mr-1" />
                      Email
                    </Button>
                  )}
                  {tenant.phone && (
                    <Button variant="outline" size="sm" className="flex-1">
                      <Phone className="w-4 h-4 mr-1" />
                      Appel
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTenants.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Aucun locataire trouvé</p>
          <p className="text-sm text-gray-400">
            {tenants.length === 0 
              ? "Commencez par ajouter votre premier locataire" 
              : "Essayez de modifier vos critères de recherche"
            }
          </p>
        </div>
      )}

      {/* Dialog pour modifier un locataire */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier le locataire</DialogTitle>
          </DialogHeader>
          {editingTenant && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editFirstName">Prénom *</Label>
                  <Input
                    id="editFirstName"
                    value={editingTenant.firstName}
                    onChange={(e) => setEditingTenant(prev => prev ? { ...prev, firstName: e.target.value } : null)}
                    placeholder="Prénom"
                  />
                </div>
                <div>
                  <Label htmlFor="editLastName">Nom *</Label>
                  <Input
                    id="editLastName"
                    value={editingTenant.lastName}
                    onChange={(e) => setEditingTenant(prev => prev ? { ...prev, lastName: e.target.value } : null)}
                    placeholder="Nom"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="editEmail">Email</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editingTenant.email}
                  onChange={(e) => setEditingTenant(prev => prev ? { ...prev, email: e.target.value } : null)}
                  placeholder="email@exemple.com"
                />
              </div>

              <div>
                <Label htmlFor="editPhone">Téléphone</Label>
                <Input
                  id="editPhone"
                  value={editingTenant.phone}
                  onChange={(e) => setEditingTenant(prev => prev ? { ...prev, phone: e.target.value } : null)}
                  placeholder="+212 6XX XXXXXX"
                />
              </div>

              <div>
                <Label htmlFor="editAddress">Adresse</Label>
                <Input
                  id="editAddress"
                  value={editingTenant.address}
                  onChange={(e) => setEditingTenant(prev => prev ? { ...prev, address: e.target.value } : null)}
                  placeholder="Adresse complète"
                />
              </div>

              <div>
                <Label htmlFor="editIdDocument">Carte d'identité (Image ou PDF)</Label>
                <div className="mt-2">
                  <input
                    type="file"
                    id="editIdDocument"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileUpload(e, true)}
                    className="hidden"
                  />
                  <label htmlFor="editIdDocument" className="cursor-pointer">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors">
                      {uploading ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          <span className="text-sm text-gray-600">Upload en cours...</span>
                        </div>
                      ) : editingTenant.idDocumentUrl ? (
                        <div className="flex items-center justify-center space-x-2">
                          <FileImage className="w-5 h-5 text-green-600" />
                          <span className="text-sm text-green-600">Document téléchargé</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center space-x-2">
                          <Upload className="w-5 h-5 text-gray-400" />
                          <span className="text-sm text-gray-600">Cliquer pour télécharger</span>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <Button 
                  onClick={handleEditTenant} 
                  className="flex-1"
                  disabled={uploading}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Sauvegarder
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                  className="flex-1"
                >
                  <X className="w-4 h-4 mr-2" />
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}