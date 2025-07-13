import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Receipt, Plus, Edit2, CheckCircle, AlertCircle, DollarSign, Calendar, Upload, FileImage, Download } from 'lucide-react'
import { blink } from '@/blink/client'

interface InvoiceWithDetails {
  id: string
  tenantName: string
  unitNumber: string
  buildingName: string
  month: number
  year: number
  baseRent: number
  electricity: number
  water: number
  stairCleaning: number
  otherServices: number
  totalAmount: number
  isPaid: boolean
  paidDate: string | null
  dueDate: string
  documentUrl?: string | null
}

export function Invoices() {
  const [invoices, setInvoices] = useState<InvoiceWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all')
  const [monthFilter, setMonthFilter] = useState<string>('all')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    loadInvoices()
  }, [])

  const loadInvoices = async () => {
    try {
      const user = await blink.auth.me()
      if (!user) return

      // Charger toutes les données nécessaires
      const [invoicesData, contractsData, tenantsData, unitsData, buildingsData] = await Promise.all([
        blink.db.invoices.list({ where: { userId: user.id } }),
        blink.db.contracts.list({ where: { userId: user.id } }),
        blink.db.tenants.list({ where: { userId: user.id } }),
        blink.db.units.list({ where: { userId: user.id } }),
        blink.db.buildings.list({ where: { userId: user.id } })
      ])

      // Enrichir les factures avec les informations des contrats, locataires, unités et bâtiments
      const enrichedInvoices: InvoiceWithDetails[] = invoicesData.map(invoice => {
        const contract = contractsData.find(c => c.id === invoice.contractId)
        const tenant = contract ? tenantsData.find(t => t.id === contract.tenantId) : null
        const unit = contract ? unitsData.find(u => u.id === contract.unitId) : null
        const building = unit ? buildingsData.find(b => b.id === unit.buildingId) : null

        // Calculer la date d'échéance (généralement le 5 du mois suivant)
        const dueDate = new Date(invoice.year, invoice.month, 5)

        return {
          id: invoice.id,
          tenantName: tenant ? `${tenant.firstName} ${tenant.lastName}` : 'Locataire inconnu',
          unitNumber: unit ? unit.unitNumber : 'Unité inconnue',
          buildingName: building ? building.name : 'Bâtiment inconnu',
          month: invoice.month,
          year: invoice.year,
          baseRent: invoice.baseRent,
          electricity: invoice.electricity,
          water: invoice.water,
          stairCleaning: invoice.stairCleaning,
          otherServices: invoice.otherServices,
          totalAmount: invoice.totalAmount,
          isPaid: Number(invoice.isPaid) > 0,
          paidDate: invoice.paidDate,
          dueDate: dueDate.toISOString().split('T')[0],
          documentUrl: invoice.documentUrl
        }
      })

      setInvoices(enrichedInvoices)
    } catch (error) {
      console.error('Erreur lors du chargement des factures:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (invoiceId: string, file: File) => {
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
        `invoices/documents/${invoiceId}-${Date.now()}-${file.name}`,
        { upsert: true }
      )
      
      // Mettre à jour la facture avec l'URL du document
      await blink.db.invoices.update(invoiceId, {
        documentUrl: publicUrl
      })

      loadInvoices() // Recharger les données
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error)
      alert('Erreur lors de l\'upload du fichier')
    } finally {
      setUploading(false)
    }
  }

  const filteredInvoices = invoices.filter(invoice => {
    const matchesSearch = 
      invoice.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.buildingName.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'paid' && invoice.isPaid) ||
      (statusFilter === 'unpaid' && !invoice.isPaid)
    
    const matchesMonth = monthFilter === 'all' || 
      `${invoice.year}-${invoice.month.toString().padStart(2, '0')}` === monthFilter
    
    return matchesSearch && matchesStatus && matchesMonth
  })

  const totalUnpaid = invoices.filter(i => !i.isPaid).reduce((sum, i) => sum + i.totalAmount, 0)
  const totalPaid = invoices.filter(i => i.isPaid).reduce((sum, i) => sum + i.totalAmount, 0)
  const unpaidCount = invoices.filter(i => !i.isPaid).length

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR')
  }

  const getMonthName = (month: number) => {
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ]
    return months[month - 1]
  }

  const isOverdue = (dueDate: string, isPaid: boolean) => {
    if (isPaid) return false
    return new Date(dueDate) < new Date()
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
            Gestion des Factures
          </h1>
          <p className="text-gray-600">
            Gérez les factures mensuelles et suivez les paiements
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4 mr-2" />
          Générer factures
        </Button>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Receipt className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{invoices.length}</p>
                <p className="text-sm text-gray-600">Factures totales</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{totalPaid.toLocaleString('fr-FR')} DH</p>
                <p className="text-sm text-gray-600">Montant encaissé</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold">{totalUnpaid.toLocaleString('fr-FR')} DH</p>
                <p className="text-sm text-gray-600">En attente</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Calendar className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{unpaidCount}</p>
                <p className="text-sm text-gray-600">Factures impayées</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-4 mb-6">
        <Input
          placeholder="Rechercher une facture..."
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
            Toutes
          </Button>
          <Button
            variant={statusFilter === 'paid' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('paid')}
            size="sm"
          >
            Payées
          </Button>
          <Button
            variant={statusFilter === 'unpaid' ? 'default' : 'outline'}
            onClick={() => setStatusFilter('unpaid')}
            size="sm"
          >
            Impayées
          </Button>
        </div>
        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm"
        >
          <option value="all">Tous les mois</option>
          <option value="2023-12">Décembre 2023</option>
          <option value="2023-11">Novembre 2023</option>
          <option value="2023-10">Octobre 2023</option>
        </select>
      </div>

      {/* Liste des factures */}
      <div className="space-y-4">
        {filteredInvoices.map((invoice) => (
          <Card key={invoice.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4">
                  {/* Informations de base */}
                  <div>
                    <h3 className="font-medium text-lg mb-1">{invoice.tenantName}</h3>
                    <p className="text-sm text-gray-600">{invoice.unitNumber}</p>
                    <p className="text-xs text-gray-500">{invoice.buildingName}</p>
                  </div>

                  {/* Période */}
                  <div>
                    <p className="font-medium text-gray-900">
                      {getMonthName(invoice.month)} {invoice.year}
                    </p>
                    <p className="text-sm text-gray-600">
                      Échéance: {formatDate(invoice.dueDate)}
                    </p>
                    {isOverdue(invoice.dueDate, invoice.isPaid) && (
                      <Badge variant="destructive" className="text-xs mt-1">
                        En retard
                      </Badge>
                    )}
                  </div>

                  {/* Détail des charges */}
                  <div>
                    <p className="font-medium text-gray-900 mb-1">Détail</p>
                    <div className="text-xs text-gray-600 space-y-0.5">
                      <div>Loyer: {invoice.baseRent} DH</div>
                      <div>Électricité: {invoice.electricity} DH</div>
                      <div>Eau: {invoice.water} DH</div>
                      <div>Escaliers: {invoice.stairCleaning} DH</div>
                      {invoice.otherServices > 0 && (
                        <div>Autres: {invoice.otherServices} DH</div>
                      )}
                    </div>
                  </div>

                  {/* Montant total */}
                  <div>
                    <p className="font-medium text-gray-900 mb-1">Total</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {invoice.totalAmount.toLocaleString('fr-FR')} DH
                    </p>
                  </div>

                  {/* Statut et actions */}
                  <div>
                    <div className="mb-3">
                      {invoice.isPaid ? (
                        <div>
                          <Badge variant="default" className="mb-1">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Payée
                          </Badge>
                          {invoice.paidDate && (
                            <p className="text-xs text-gray-500">
                              Le {formatDate(invoice.paidDate)}
                            </p>
                          )}
                        </div>
                      ) : (
                        <Badge variant="secondary">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          En attente
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2">
                      {!invoice.isPaid && (
                        <Button size="sm" className="w-full">
                          Marquer payée
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="w-full">
                        <Edit2 className="w-3 h-3 mr-1" />
                        Modifier
                      </Button>
                      
                      {/* Document de la facture */}
                      {invoice.documentUrl ? (
                        <div className="space-y-1">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full"
                            onClick={() => window.open(invoice.documentUrl, '_blank')}
                          >
                            <Download className="w-3 h-3 mr-1" />
                            Voir document
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="w-full">
                                <Upload className="w-3 h-3 mr-1" />
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
                                        handleFileUpload(invoice.id, file)
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
                              <Upload className="w-3 h-3 mr-1" />
                              Ajouter document
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Ajouter un document</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label>Document de la facture (Image ou PDF)</Label>
                                <div className="mt-2">
                                  <input
                                    type="file"
                                    accept="image/*,.pdf"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0]
                                      if (file) {
                                        handleFileUpload(invoice.id, file)
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
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredInvoices.length === 0 && (
        <div className="text-center py-12">
          <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Aucune facture trouvée</p>
          <p className="text-sm text-gray-400">
            Essayez de modifier vos critères de recherche
          </p>
        </div>
      )}
    </div>
  )
}