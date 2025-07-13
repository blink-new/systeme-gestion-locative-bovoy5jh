import { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Download, Printer, Plus, Trash2 } from 'lucide-react'
import { QuittanceData, nombreEnLettres } from '@/lib/quittance-utils'
import { blink } from '@/blink/client'

interface QuittanceTemplateProps {
  data?: Partial<QuittanceData>
  onSave?: (data: QuittanceData) => void
  readOnly?: boolean
}

export function QuittanceTemplate({ data, onSave, readOnly = false }: QuittanceTemplateProps) {
  const [formData, setFormData] = useState<QuittanceData>({
    numeroQuittance: data?.numeroQuittance || '',
    nomProprietaire: data?.nomProprietaire || '',
    nomLocataire: data?.nomLocataire || '',
    adresseComplete: data?.adresseComplete || '',
    dateDebutPeriode: data?.dateDebutPeriode || '',
    dateFinPeriode: data?.dateFinPeriode || '',
    loyerNet: data?.loyerNet || 0,
    chargesGardien: data?.chargesGardien || 0,
    chargesElectricite: data?.chargesElectricite || 0,
    chargesEau: data?.chargesEau || 0,
    autresCharges: data?.autresCharges || [],
    villeSignataire: data?.villeSignataire || '',
    dateEmission: data?.dateEmission || new Date().toISOString().split('T')[0]
  })

  const [tenants, setTenants] = useState<any[]>([])
  const [buildings, setBuildings] = useState<any[]>([])
  const [units, setUnits] = useState<any[]>([])
  const [contracts, setContracts] = useState<any[]>([])
  const [selectedTenantId, setSelectedTenantId] = useState('')
  const [selectedBuildingId, setSelectedBuildingId] = useState('')

  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!readOnly) {
      loadData()
    }
  }, [readOnly])

  const loadData = async () => {
    try {
      const user = await blink.auth.me()
      if (!user) return

      const [tenantsData, buildingsData, unitsData, contractsData] = await Promise.all([
        blink.db.tenants.list({ where: { userId: user.id } }),
        blink.db.buildings.list({ where: { userId: user.id } }),
        blink.db.units.list({ where: { userId: user.id } }),
        blink.db.contracts.list({ where: { userId: user.id, status: 'active' } })
      ])

      setTenants(tenantsData)
      setBuildings(buildingsData)
      setUnits(unitsData)
      setContracts(contractsData)
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error)
    }
  }

  const handleTenantSelect = (tenantId: string) => {
    setSelectedTenantId(tenantId)
    const tenant = tenants.find(t => t.id === tenantId)
    if (tenant) {
      setFormData(prev => ({
        ...prev,
        nomLocataire: `${tenant.firstName} ${tenant.lastName}`
      }))

      // Trouver le contrat actif du locataire pour récupérer le loyer et l'adresse
      const contract = contracts.find(c => c.tenantId === tenantId)
      if (contract) {
        const unit = units.find(u => u.id === contract.unitId)
        if (unit) {
          const building = buildings.find(b => b.id === unit.buildingId)
          if (building) {
            setFormData(prev => ({
              ...prev,
              adresseComplete: `${unit.unitNumber}, ${building.address}`,
              loyerNet: contract.rentAmount
            }))
            setSelectedBuildingId(building.id)
          }
        }
      }
    }
  }

  const handleBuildingSelect = (buildingId: string) => {
    setSelectedBuildingId(buildingId)
    const building = buildings.find(b => b.id === buildingId)
    if (building) {
      // Si aucun locataire sélectionné, juste mettre l'adresse du bâtiment
      if (!selectedTenantId) {
        setFormData(prev => ({
          ...prev,
          adresseComplete: building.address
        }))
      }
    }
  }

  // Calcul automatique du total
  const calculerTotal = () => {
    const total = formData.loyerNet + 
                 formData.chargesGardien + 
                 formData.chargesElectricite + 
                 formData.chargesEau + 
                 formData.autresCharges.reduce((sum, charge) => sum + charge.montant, 0)
    return total
  }

  const ajouterAutreCharge = () => {
    setFormData(prev => ({
      ...prev,
      autresCharges: [...prev.autresCharges, { libelle: '', montant: 0 }]
    }))
  }

  const supprimerAutreCharge = (index: number) => {
    setFormData(prev => ({
      ...prev,
      autresCharges: prev.autresCharges.filter((_, i) => i !== index)
    }))
  }

  const modifierAutreCharge = (index: number, field: 'libelle' | 'montant', value: string | number) => {
    setFormData(prev => ({
      ...prev,
      autresCharges: prev.autresCharges.map((charge, i) => 
        i === index ? { ...charge, [field]: value } : charge
      )
    }))
  }

  const handlePrint = () => {
    if (printRef.current) {
      const printContent = printRef.current.innerHTML
      const originalContent = document.body.innerHTML
      document.body.innerHTML = printContent
      window.print()
      document.body.innerHTML = originalContent
      window.location.reload()
    }
  }

  const handleSave = () => {
    if (onSave) {
      onSave(formData)
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('fr-FR')
  }

  const total = calculerTotal()

  return (
    <div className="space-y-6">
      {/* Formulaire de saisie (masqué en mode lecture seule) */}
      {!readOnly && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Données de la quittance</h3>
            
            {/* Sélection rapide */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-blue-50 rounded-lg">
              <div>
                <Label htmlFor="selectTenant">Sélectionner un locataire existant</Label>
                <Select value={selectedTenantId} onValueChange={handleTenantSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un locataire..." />
                  </SelectTrigger>
                  <SelectContent>
                    {tenants.map((tenant) => (
                      <SelectItem key={tenant.id} value={tenant.id}>
                        {tenant.firstName} {tenant.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="selectBuilding">Sélectionner un bâtiment existant</Label>
                <Select value={selectedBuildingId} onValueChange={handleBuildingSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un bâtiment..." />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.map((building) => (
                      <SelectItem key={building.id} value={building.id}>
                        {building.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="numeroQuittance">Numéro de quittance</Label>
                <Input
                  id="numeroQuittance"
                  value={formData.numeroQuittance}
                  onChange={(e) => setFormData(prev => ({ ...prev, numeroQuittance: e.target.value }))}
                  placeholder="Q-2024-001"
                />
              </div>
              <div>
                <Label htmlFor="nomProprietaire">Nom du propriétaire/gestionnaire</Label>
                <Input
                  id="nomProprietaire"
                  value={formData.nomProprietaire}
                  onChange={(e) => setFormData(prev => ({ ...prev, nomProprietaire: e.target.value }))}
                  placeholder="M. Dupont"
                />
              </div>
              <div>
                <Label htmlFor="nomLocataire">Nom du locataire</Label>
                <Input
                  id="nomLocataire"
                  value={formData.nomLocataire}
                  onChange={(e) => setFormData(prev => ({ ...prev, nomLocataire: e.target.value }))}
                  placeholder="M./Mme Martin"
                />
              </div>
              <div>
                <Label htmlFor="adresseComplete">Adresse complète du bien</Label>
                <Textarea
                  id="adresseComplete"
                  value={formData.adresseComplete}
                  onChange={(e) => setFormData(prev => ({ ...prev, adresseComplete: e.target.value }))}
                  placeholder="N° 15, Rue de la Paix, 75001 Paris"
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="dateDebutPeriode">Date début période</Label>
                <Input
                  id="dateDebutPeriode"
                  type="date"
                  value={formData.dateDebutPeriode}
                  onChange={(e) => setFormData(prev => ({ ...prev, dateDebutPeriode: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="dateFinPeriode">Date fin période</Label>
                <Input
                  id="dateFinPeriode"
                  type="date"
                  value={formData.dateFinPeriode}
                  onChange={(e) => setFormData(prev => ({ ...prev, dateFinPeriode: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="loyerNet">Loyer net (DH)</Label>
                <Input
                  id="loyerNet"
                  type="number"
                  value={formData.loyerNet}
                  onChange={(e) => setFormData(prev => ({ ...prev, loyerNet: parseFloat(e.target.value) || 0 }))}
                  placeholder="1500"
                />
              </div>
              <div>
                <Label htmlFor="chargesGardien">Charges gardien/concierge (DH)</Label>
                <Input
                  id="chargesGardien"
                  type="number"
                  value={formData.chargesGardien}
                  onChange={(e) => setFormData(prev => ({ ...prev, chargesGardien: parseFloat(e.target.value) || 0 }))}
                  placeholder="50"
                />
              </div>
              <div>
                <Label htmlFor="chargesElectricite">Charges électricité (DH)</Label>
                <Input
                  id="chargesElectricite"
                  type="number"
                  value={formData.chargesElectricite}
                  onChange={(e) => setFormData(prev => ({ ...prev, chargesElectricite: parseFloat(e.target.value) || 0 }))}
                  placeholder="100"
                />
              </div>
              <div>
                <Label htmlFor="chargesEau">Charges eau (DH)</Label>
                <Input
                  id="chargesEau"
                  type="number"
                  value={formData.chargesEau}
                  onChange={(e) => setFormData(prev => ({ ...prev, chargesEau: parseFloat(e.target.value) || 0 }))}
                  placeholder="50"
                />
              </div>
              <div>
                <Label htmlFor="villeSignataire">Ville du signataire</Label>
                <Input
                  id="villeSignataire"
                  value={formData.villeSignataire}
                  onChange={(e) => setFormData(prev => ({ ...prev, villeSignataire: e.target.value }))}
                  placeholder="Casablanca"
                />
              </div>
              <div>
                <Label htmlFor="dateEmission">Date d'émission</Label>
                <Input
                  id="dateEmission"
                  type="date"
                  value={formData.dateEmission}
                  onChange={(e) => setFormData(prev => ({ ...prev, dateEmission: e.target.value }))}
                />
              </div>
            </div>

            {/* Autres charges */}
            <div className="mt-6">
              <div className="flex justify-between items-center mb-4">
                <Label>Autres charges</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={ajouterAutreCharge}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter une charge
                </Button>
              </div>
              {formData.autresCharges.map((charge, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <Input
                    placeholder="Libellé de la charge"
                    value={charge.libelle}
                    onChange={(e) => modifierAutreCharge(index, 'libelle', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    placeholder="Montant"
                    value={charge.montant}
                    onChange={(e) => modifierAutreCharge(index, 'montant', parseFloat(e.target.value) || 0)}
                    className="w-32"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => supprimerAutreCharge(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                Sauvegarder
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Aperçu de la quittance */}
      <Card>
        <CardContent className="p-0">
          <div className="flex justify-between items-center p-4 border-b">
            <h3 className="text-lg font-semibold">Aperçu de la quittance</h3>
            <div className="space-x-2">
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                Imprimer
              </Button>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>

          {/* Template de la quittance */}
          <div ref={printRef} className="p-8 bg-white" style={{ fontFamily: 'Arial, sans-serif' }}>
            {/* En-tête */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-blue-600 mb-2">QUITTANCE DE LOYER</h1>
              <p className="text-lg">Quittance N° {formData.numeroQuittance || '[NUMERO_QUITTANCE]'}</p>
            </div>

            {/* Corps principal */}
            <div className="mb-8">
              <p className="text-base leading-relaxed mb-4">
                Je soussigné(e) <strong>{formData.nomProprietaire || '[NOM_PROPRIETAIRE/GESTIONNAIRE]'}</strong>, 
                atteste avoir reçu de Monsieur/Madame <strong>{formData.nomLocataire || '[NOM_LOCATAIRE]'}</strong>, 
                la somme de :
              </p>

              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-lg mb-2">
                  <strong>Montant en chiffres :</strong> {total.toLocaleString('fr-FR')} DH
                </p>
                <p className="text-lg">
                  <strong>Montant en lettres :</strong> {nombreEnLettres(total)} dirhams
                </p>
              </div>

              <p className="text-base mb-4">
                Correspondant au loyer du bien situé à l'adresse suivante :
              </p>
              <p className="text-base font-medium mb-6 pl-4 border-l-4 border-blue-600">
                {formData.adresseComplete || '[ADRESSE_COMPLETE]'}
              </p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <p className="text-base">
                  <strong>Pour la période du :</strong> {formatDate(formData.dateDebutPeriode) || '[DATE_DEBUT_PERIODE]'}
                </p>
                <p className="text-base">
                  <strong>Au :</strong> {formatDate(formData.dateFinPeriode) || '[DATE_FIN_PERIODE]'}
                </p>
              </div>
            </div>

            {/* Tableau des charges */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">Détail des Postes de Dépenses</h3>
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-3 text-left">Désignation</th>
                    <th className="border border-gray-300 p-3 text-right">Montant (DH)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-300 p-3">Loyer Net</td>
                    <td className="border border-gray-300 p-3 text-right">{formData.loyerNet.toLocaleString('fr-FR')}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3">Charges de Gardien/Concierge</td>
                    <td className="border border-gray-300 p-3 text-right">{formData.chargesGardien.toLocaleString('fr-FR')}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3">Charges d'Électricité</td>
                    <td className="border border-gray-300 p-3 text-right">{formData.chargesElectricite.toLocaleString('fr-FR')}</td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 p-3">Charges d'Eau</td>
                    <td className="border border-gray-300 p-3 text-right">{formData.chargesEau.toLocaleString('fr-FR')}</td>
                  </tr>
                  {formData.autresCharges.map((charge, index) => (
                    <tr key={index}>
                      <td className="border border-gray-300 p-3">{charge.libelle || 'Autres Charges'}</td>
                      <td className="border border-gray-300 p-3 text-right">{charge.montant.toLocaleString('fr-FR')}</td>
                    </tr>
                  ))}
                  <tr className="bg-blue-50 font-bold">
                    <td className="border border-gray-300 p-3">TOTAL À PAYER</td>
                    <td className="border border-gray-300 p-3 text-right">{total.toLocaleString('fr-FR')}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Mentions légales */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">Mentions Légales et Avertissements</h3>
              <ul className="space-y-2 text-sm">
                <li>• Le locataire ne peut sous-louer tout ou partie du bien à des tiers sans l'autorisation écrite préalable du propriétaire.</li>
                <li>• Le locataire ne peut quitter les lieux avant d'avoir réglé l'intégralité des sommes dues au propriétaire.</li>
                <li>• Le locataire ne peut quitter les lieux avant d'avoir notifié le propriétaire de son départ dans les délais convenus par écrit.</li>
                <li>• Le locataire ne peut quitter les lieux avant d'avoir effectué les réparations locatives nécessaires conformément à la loi.</li>
              </ul>
            </div>

            {/* Signature */}
            <div className="flex justify-between items-end">
              <div>
                <p className="text-base mb-4">
                  Fait à <strong>{formData.villeSignataire || '[VILLE_SIGNATAIRE]'}</strong>, 
                  le <strong>{formatDate(formData.dateEmission) || '[DATE_EMISSION_QUITTANCE]'}</strong>
                </p>
              </div>
              <div className="text-center">
                <p className="text-base mb-8">Signature du Propriétaire / Gestionnaire</p>
                <div className="w-48 h-16 border-b border-gray-400"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}