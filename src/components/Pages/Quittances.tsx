import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FileText, Plus, Eye, Download, Printer, Loader2 } from 'lucide-react'
import { QuittanceTemplate } from '@/components/QuittanceTemplate'
import { QuittanceData, generateQuittanceNumber, useQuittanceManager } from '@/lib/quittance-utils'

export function Quittances() {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedQuittance, setSelectedQuittance] = useState<QuittanceData | null>(null)
  const [showPreviewDialog, setShowPreviewDialog] = useState(false)
  const { quittances, loading, saveQuittance } = useQuittanceManager()

  const handleCreateNew = () => {
    setSelectedQuittance({
      numeroQuittance: generateQuittanceNumber(),
      nomProprietaire: '',
      nomLocataire: '',
      adresseComplete: '',
      dateDebutPeriode: '',
      dateFinPeriode: '',
      loyerNet: 0,
      chargesGardien: 0,
      chargesElectricite: 0,
      chargesEau: 0,
      autresCharges: [],
      villeSignataire: '',
      dateEmission: new Date().toISOString().split('T')[0]
    })
    setShowCreateDialog(true)
  }

  const handleSaveQuittance = async (data: QuittanceData) => {
    const success = await saveQuittance(data)
    if (success) {
      setShowCreateDialog(false)
      setSelectedQuittance(null)
      alert('Quittance sauvegardée avec succès!')
    } else {
      alert('Erreur lors de la sauvegarde')
    }
  }

  const handlePreview = (quittance: QuittanceData) => {
    setSelectedQuittance(quittance)
    setShowPreviewDialog(true)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR')
  }

  const getMonthName = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ]
    return `${months[date.getMonth()]} ${date.getFullYear()}`
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Chargement des quittances...</p>
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
            Quittances de Loyer
          </h1>
          <p className="text-gray-600">
            Générez et gérez vos quittances de loyer numériques
          </p>
        </div>
        <Button 
          onClick={handleCreateNew}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle Quittance
        </Button>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <FileText className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{quittances.length}</p>
                <p className="text-sm text-gray-600">Quittances créées</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Download className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {quittances.reduce((sum, q) => sum + (q.loyerNet + q.chargesGardien + q.chargesElectricite + q.chargesEau + q.autresCharges.reduce((s, c) => s + c.montant, 0)), 0).toLocaleString('fr-FR')} €
                </p>
                <p className="text-sm text-gray-600">Montant total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Printer className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">
                  {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </p>
                <p className="text-sm text-gray-600">Période courante</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des quittances */}
      {quittances.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Quittances créées</h3>
          {quittances.map((quittance, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <h4 className="font-medium text-lg mb-1">
                        Quittance N° {quittance.numeroQuittance}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {formatDate(quittance.dateEmission)}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">{quittance.nomLocataire}</p>
                      <p className="text-sm text-gray-600 truncate">
                        {quittance.adresseComplete}
                      </p>
                    </div>
                    <div>
                      <p className="font-medium">
                        {getMonthName(quittance.dateDebutPeriode)}
                      </p>
                      <p className="text-sm text-gray-600">
                        Du {formatDate(quittance.dateDebutPeriode)} au {formatDate(quittance.dateFinPeriode)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-blue-600">
                        {(quittance.loyerNet + quittance.chargesGardien + quittance.chargesElectricite + quittance.chargesEau + quittance.autresCharges.reduce((sum, charge) => sum + charge.montant, 0)).toLocaleString('fr-FR')} €
                      </p>
                      <p className="text-sm text-gray-600">Montant total</p>
                    </div>
                  </div>
                  <div className="ml-4 space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePreview(quittance)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Voir
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Aucune quittance créée
          </h3>
          <p className="text-gray-500 mb-6">
            Commencez par créer votre première quittance de loyer
          </p>
          <Button 
            onClick={handleCreateNew}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Créer ma première quittance
          </Button>
        </div>
      )}

      {/* Dialog pour créer/modifier une quittance */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedQuittance?.id ? 'Modifier la quittance' : 'Nouvelle quittance'}
            </DialogTitle>
          </DialogHeader>
          {selectedQuittance && (
            <QuittanceTemplate
              data={selectedQuittance}
              onSave={handleSaveQuittance}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog pour prévisualiser une quittance */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Aperçu - Quittance N° {selectedQuittance?.numeroQuittance}
            </DialogTitle>
          </DialogHeader>
          {selectedQuittance && (
            <QuittanceTemplate
              data={selectedQuittance}
              readOnly={true}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}