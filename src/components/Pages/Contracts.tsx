import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { FileText, Plus, Edit2, Trash2, Download, Calendar, DollarSign, User, Upload, FileImage } from 'lucide-react'
import { blink } from '@/blink/client'

interface ContractWithDetails {
  id: string
  tenantName: string
  unitNumber: string
  buildingName: string
  startDate: string
  endDate: string | null
  rentAmount: number
  deposit: number
  status: 'active' | 'inactive'
  documentUrl: string | null
}

export function Contracts() {
  const [contracts, setContracts] = useState<ContractWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    loadContracts()
  }, [])

  const loadContracts = async () => {
    try {
      const user = await blink.auth.me()
      if (!user) return

      // Charger toutes les données nécessaires
      const [contractsData, tenantsData, unitsData, buildingsData] = await Promise.all([
        blink.db.contracts.list({ where: { userId: user.id } }),
        blink.db.tenants.list({ where: { userId: user.id } }),
        blink.db.units.list({ where: { userId: user.id } }),
        blink.db.buildings.list({ where: { userId: user.id } })
      ])

      // Enrichir les contrats avec les informations des locataires, unités et bâtiments
      const enrichedContracts: ContractWithDetails[] = contractsData.map(contract => {
        const tenant = tenantsData.find(t => t.id === contract.tenantId)
        const unit = unitsData.find(u => u.id === contract.unitId)
        const building = unit ? buildingsData.find(b => b.id === unit.buildingId) : null

        return {
          id: contract.id,
          tenantName: tenant ? `${tenant.firstName} ${tenant.lastName}` : 'Locataire inconnu',
          unitNumber: unit ? unit.unitNumber : 'Unité inconnue',
          buildingName: building ? building.name : 'Bâtiment inconnu',
          startDate: contract.startDate,
          endDate: contract.endDate,
          rentAmount: contract.rentAmount,
          deposit: contract.deposit,
          status: contract.status,
          documentUrl: contract.documentUrl
        }
      })

      setContracts(enrichedContracts)
    } catch (error) {
      console.error('Erreur lors du chargement des contrats:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = 
      contract.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.buildingName.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const activeContracts = contracts.filter(c => c.status === 'active').length
  const totalRevenue = contracts
    .filter(c => c.status === 'active')
    .reduce((sum, c) => sum + c.rentAmount, 0)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR')
  }

  const getDaysUntilExpiry = (endDate: string | null) => {
    if (!endDate) return null
    const today = new Date()
    const expiry = new Date(endDate)
    const diffTime = expiry.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const handleFileUpload = async (contractId: string, file: File) => {
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
        `contracts/documents/${contractId}-${Date.now()}-${file.name}`,
        { upsert: true }
      )
      
      // Mettre à jour le contrat avec l'URL du document
      await blink.db.contracts.update(contractId, {
        documentUrl: publicUrl
      })

      loadContracts() // Recharger les données
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error)
      alert('Erreur lors de l\'upload du fichier')
    } finally {
      setUploading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded"></div>
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
            Gestion des Contrats
          </h1>
          <p className="text-gray-600">
            Gérez vos contrats de location et leurs documents
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Nouveau contrat
        </Button>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{activeContracts}</p>
                <p className="text-sm text-gray-600">Contrats actifs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <DollarSign className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{totalRevenue.toLocaleString('fr-FR')} DH</p>
                <p className="text-sm text-gray-600">Revenus mensuels</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Calendar className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">
                  {contracts.filter(c => {
                    const days = getDaysUntilExpiry(c.endDate)
                    return days !== null && days <= 60 && days > 0
                  }).length}
                </p>
                <p className="text-sm text-gray-600">Expirant bientôt</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <div className="flex space-x-4 mb-6">
        <Input
          placeholder="Rechercher un contrat..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
        <div className="flex space-x-2">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('all')}
            size="sm"
          >
            Tous
          </Button>
          <Button
            variant={statusFilter === 'active' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('active')}
            size="sm"
          >
            Actifs
          </Button>
          <Button
            variant={statusFilter === 'inactive' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('inactive')}
            size="sm"
          >
            Inactifs
          </Button>
        </div>
      </div>

      {/* Liste des contrats */}
      <div className="space-y-4">
        {filteredContracts.map((contract) => {
          const daysUntilExpiry = getDaysUntilExpiry(contract.endDate)
          const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 60 && daysUntilExpiry > 0
          const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0

          return (
            <Card key={contract.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Informations locataire */}
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">{contract.tenantName}</span>
                      </div>
                      <p className="text-sm text-gray-600">{contract.unitNumber}</p>
                      <p className="text-xs text-gray-500">{contract.buildingName}</p>
                    </div>

                    {/* Dates */}
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">Période</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Du {formatDate(contract.startDate)}
                      </p>
                      {contract.endDate && (
                        <p className="text-sm text-gray-600">
                          Au {formatDate(contract.endDate)}
                        </p>
                      )}
                      {isExpiringSoon && (
                        <Badge variant="destructive" className="mt-1 text-xs">
                          Expire dans {daysUntilExpiry} jours
                        </Badge>
                      )}
                      {isExpired && (
                        <Badge variant="destructive" className="mt-1 text-xs">
                          Expiré
                        </Badge>
                      )}
                    </div>

                    {/* Montants */}
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <DollarSign className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">Montants</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Loyer: {contract.rentAmount.toLocaleString('fr-FR')} DH
                      </p>
                      <p className="text-sm text-gray-600">
                        Dépôt: {contract.deposit.toLocaleString('fr-FR')} DH
                      </p>
                    </div>

                    {/* Statut et document */}
                    <div>
                      <div className="mb-2">
                        <Badge variant={contract.status === 'active' ? 'default' : 'secondary'}>
                          {contract.status === 'active' ? 'Actif' : 'Inactif'}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {contract.documentUrl ? (
                          <div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="w-full"
                              onClick={() => window.open(contract.documentUrl, '_blank')}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Voir le document
                            </Button>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm" className="w-full mt-1">
                                  <Upload className="w-4 h-4 mr-1" />
                                  Remplacer
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md">
                                <DialogHeader>
                                  <DialogTitle>Remplacer le document</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label>Nouveau document (Image ou PDF)</Label>
                                    <input
                                      type="file"
                                      accept="image/*,.pdf"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) {
                                          handleFileUpload(contract.id, file)
                                        }
                                      }}
                                      className="block w-full mt-2 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                      disabled={uploading}
                                    />
                                    {uploading && (
                                      <div className="flex items-center space-x-2 mt-2">
                                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-sm text-gray-600">Upload en cours...</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        ) : (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="w-full">
                                <Upload className="w-4 h-4 mr-1" />
                                Ajouter document
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Ajouter un document</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>Document du contrat (Image ou PDF)</Label>
                                  <div className="mt-2">
                                    <input
                                      type="file"
                                      accept="image/*,.pdf"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0]
                                        if (file) {
                                          handleFileUpload(contract.id, file)
                                        }
                                      }}
                                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                      disabled={uploading}
                                    />
                                    {uploading && (
                                      <div className="flex items-center space-x-2 mt-2">
                                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-sm text-gray-600">Upload en cours...</span>
                                      </div>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Formats acceptés: JPG, PNG, GIF, WebP, PDF (max 10MB)
                                  </p>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2 ml-4">
                    <Button variant="outline" size="sm">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredContracts.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Aucun contrat trouvé</p>
          <p className="text-sm text-gray-400">
            {contracts.length === 0 
              ? "Commencez par ajouter votre premier contrat" 
              : "Essayez de modifier vos critères de recherche"
            }
          </p>
        </div>
      )}
    </div>
  )
}