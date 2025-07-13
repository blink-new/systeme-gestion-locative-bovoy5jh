import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BarChart3, Download, Calendar, CheckCircle, AlertCircle, Search, Filter } from 'lucide-react'
import { blink } from '@/blink/client'

interface PaymentStatus {
  id: string
  tenantName: string
  unitNumber: string
  buildingName: string
  month: string
  year: number
  amount: number
  isPaid: boolean
  paidDate: string | null
  dueDate: string
}

export function Reports() {
  const [payments, setPayments] = useState<PaymentStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all')
  const [monthFilter, setMonthFilter] = useState<string>('all')
  const [buildingFilter, setBuildingFilter] = useState<string>('all')
  const [buildings, setBuildings] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const user = await blink.auth.me()
      if (!user) return

      const [contractsData, tenantsData, unitsData, buildingsData, quittancesData] = await Promise.all([
        blink.db.contracts.list({ where: { userId: user.id, status: 'active' } }),
        blink.db.tenants.list({ where: { userId: user.id } }),
        blink.db.units.list({ where: { userId: user.id } }),
        blink.db.buildings.list({ where: { userId: user.id } }),
        blink.db.quittances.list({ where: { userId: user.id } })
      ])

      // Générer les statuts de paiement basés sur les contrats actifs et les quittances
      const currentDate = new Date()
      const currentYear = currentDate.getFullYear()
      const currentMonth = currentDate.getMonth() + 1

      const paymentStatuses: PaymentStatus[] = []

      // Générer les 6 derniers mois pour chaque contrat actif
      for (let monthOffset = 0; monthOffset < 6; monthOffset++) {
        const targetDate = new Date(currentYear, currentMonth - 1 - monthOffset, 1)
        const targetYear = targetDate.getFullYear()
        const targetMonth = targetDate.getMonth() + 1
        const monthName = targetDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })

        contractsData.forEach(contract => {
          const tenant = tenantsData.find(t => t.id === contract.tenantId)
          const unit = unitsData.find(u => u.id === contract.unitId)
          const building = unit ? buildingsData.find(b => b.id === unit.buildingId) : null

          if (tenant && unit && building) {
            // Vérifier s'il y a une quittance pour ce mois
            const quittance = quittancesData.find(q => {
              const qDate = new Date(q.dateDebutPeriode)
              return q.nomLocataire.includes(tenant.firstName) && 
                     q.nomLocataire.includes(tenant.lastName) &&
                     qDate.getFullYear() === targetYear &&
                     qDate.getMonth() + 1 === targetMonth
            })

            paymentStatuses.push({
              id: `${contract.id}-${targetYear}-${targetMonth}`,
              tenantName: `${tenant.firstName} ${tenant.lastName}`,
              unitNumber: unit.unitNumber,
              buildingName: building.name,
              month: monthName,
              year: targetYear,
              amount: contract.rentAmount,
              isPaid: !!quittance,
              paidDate: quittance ? quittance.dateEmission : null,
              dueDate: `${targetYear}-${targetMonth.toString().padStart(2, '0')}-05` // 5ème jour du mois
            })
          }
        })
      }

      setPayments(paymentStatuses)
      setBuildings(buildingsData)
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.buildingName.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'paid' && payment.isPaid) ||
      (statusFilter === 'unpaid' && !payment.isPaid)
    
    const matchesMonth = monthFilter === 'all' || payment.month === monthFilter
    
    const matchesBuilding = buildingFilter === 'all' || payment.buildingName === buildingFilter
    
    return matchesSearch && matchesStatus && matchesMonth && matchesBuilding
  })

  const totalPaid = filteredPayments.filter(p => p.isPaid).reduce((sum, p) => sum + p.amount, 0)
  const totalUnpaid = filteredPayments.filter(p => !p.isPaid).reduce((sum, p) => sum + p.amount, 0)
  const paidCount = filteredPayments.filter(p => p.isPaid).length
  const unpaidCount = filteredPayments.filter(p => !p.isPaid).length

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR')
  }

  const isOverdue = (dueDate: string, isPaid: boolean) => {
    if (isPaid) return false
    return new Date(dueDate) < new Date()
  }

  const getUniqueMonths = () => {
    const months = [...new Set(payments.map(p => p.month))]
    return months.sort((a, b) => {
      const dateA = new Date(a + ' 1')
      const dateB = new Date(b + ' 1')
      return dateB.getTime() - dateA.getTime()
    })
  }

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
            Supervision des Paiements
          </h1>
          <p className="text-gray-600">
            Suivez les paiements de vos locataires et identifiez les impayés
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exporter PDF
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exporter Excel
          </Button>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-600">{paidCount}</p>
                <p className="text-sm text-gray-600">Paiements reçus</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-red-600">{unpaidCount}</p>
                <p className="text-sm text-gray-600">Paiements en attente</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <BarChart3 className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-600">{totalPaid.toLocaleString('fr-FR')} DH</p>
                <p className="text-sm text-gray-600">Montant encaissé</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Calendar className="w-8 h-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-red-600">{totalUnpaid.toLocaleString('fr-FR')} DH</p>
                <p className="text-sm text-gray-600">Montant en attente</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filtres
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div>
              <Select value={statusFilter} onValueChange={(value: 'all' | 'paid' | 'unpaid') => setStatusFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="paid">Payé</SelectItem>
                  <SelectItem value="unpaid">Non payé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Mois" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les mois</SelectItem>
                  {getUniqueMonths().map((month) => (
                    <SelectItem key={month} value={month}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={buildingFilter} onValueChange={setBuildingFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Bâtiment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les bâtiments</SelectItem>
                  {buildings.map((building) => (
                    <SelectItem key={building.id} value={building.name}>
                      {building.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                  setMonthFilter('all')
                  setBuildingFilter('all')
                }}
                className="w-full"
              >
                Réinitialiser
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des paiements */}
      <Card>
        <CardHeader>
          <CardTitle>État des paiements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredPayments.map((payment) => (
              <div
                key={payment.id}
                className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                  payment.isPaid 
                    ? 'bg-green-50 border-green-200' 
                    : isOverdue(payment.dueDate, payment.isPaid)
                    ? 'bg-red-50 border-red-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    {payment.isPaid ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : isOverdue(payment.dueDate, payment.isPaid) ? (
                      <AlertCircle className="w-6 h-6 text-red-600" />
                    ) : (
                      <Calendar className="w-6 h-6 text-yellow-600" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="font-medium text-gray-900">{payment.tenantName}</p>
                        <p className="text-sm text-gray-600">
                          {payment.unitNumber} - {payment.buildingName}
                        </p>
                      </div>
                      
                      <div>
                        <p className="font-medium text-gray-900">{payment.month}</p>
                        <p className="text-sm text-gray-600">
                          Échéance: {formatDate(payment.dueDate)}
                        </p>
                      </div>
                      
                      <div>
                        <p className="font-bold text-lg text-gray-900">
                          {payment.amount.toLocaleString('fr-FR')} DH
                        </p>
                        {payment.isPaid && payment.paidDate && (
                          <p className="text-sm text-green-600">
                            Payé le {formatDate(payment.paidDate)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <Badge
                    variant={
                      payment.isPaid 
                        ? "default" 
                        : isOverdue(payment.dueDate, payment.isPaid)
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {payment.isPaid 
                      ? "Payé" 
                      : isOverdue(payment.dueDate, payment.isPaid)
                      ? "En retard"
                      : "En attente"
                    }
                  </Badge>
                  
                  {!payment.isPaid && (
                    <Button size="sm" variant="outline">
                      Marquer payé
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredPayments.length === 0 && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Aucun paiement trouvé</p>
              <p className="text-sm text-gray-400">
                Essayez de modifier vos critères de recherche
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Résumé par bâtiment */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Résumé par bâtiment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {buildings.map((building) => {
              const buildingPayments = filteredPayments.filter(p => p.buildingName === building.name)
              const buildingPaid = buildingPayments.filter(p => p.isPaid).length
              const buildingUnpaid = buildingPayments.filter(p => !p.isPaid).length
              const buildingTotal = buildingPayments.reduce((sum, p) => sum + p.amount, 0)
              const buildingPaidAmount = buildingPayments.filter(p => p.isPaid).reduce((sum, p) => sum + p.amount, 0)

              if (buildingPayments.length === 0) return null

              return (
                <div key={building.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900">{building.name}</h3>
                    <p className="text-sm text-gray-600">
                      {buildingPaid} payés • {buildingUnpaid} en attente
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">
                      {buildingPaidAmount.toLocaleString('fr-FR')} / {buildingTotal.toLocaleString('fr-FR')} DH
                    </p>
                    <p className="text-sm text-gray-600">
                      {buildingTotal > 0 ? Math.round((buildingPaidAmount / buildingTotal) * 100) : 0}% collecté
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}