import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, Users, Receipt, DollarSign, AlertTriangle, CheckCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { blink } from '@/blink/client'

interface DashboardStats {
  totalBuildings: number
  totalUnits: number
  occupiedUnits: number
  totalTenants: number
  monthlyRevenue: number
  unpaidInvoices: number
  paidInvoices: number
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalBuildings: 0,
    totalUnits: 0,
    occupiedUnits: 0,
    totalTenants: 0,
    monthlyRevenue: 0,
    unpaidInvoices: 0,
    paidInvoices: 0
  })
  const [loading, setLoading] = useState(true)

  const revenueData = [
    { month: 'Jan', revenue: 4500 },
    { month: 'Fév', revenue: 4800 },
    { month: 'Mar', revenue: 4600 },
    { month: 'Avr', revenue: 5200 },
    { month: 'Mai', revenue: 5100 },
    { month: 'Juin', revenue: 5400 },
  ]

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      // Charger les statistiques depuis la base de données
      const [buildings, units, tenants, invoices] = await Promise.all([
        blink.db.buildings.list({ where: { userId: 'demo_user' } }),
        blink.db.units.list({ where: { userId: 'demo_user' } }),
        blink.db.tenants.list({ where: { userId: 'demo_user' } }),
        blink.db.invoices.list({ 
          where: { 
            userId: 'demo_user',
            month: 12,
            year: 2023
          } 
        })
      ])

      const occupiedUnits = units.filter(unit => unit.status === 'occupied').length
      const unpaidInvoices = invoices.filter(invoice => Number(invoice.isPaid) === 0)
      const paidInvoices = invoices.filter(invoice => Number(invoice.isPaid) > 0)
      const monthlyRevenue = paidInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0)

      setStats({
        totalBuildings: buildings.length,
        totalUnits: units.length,
        occupiedUnits,
        totalTenants: tenants.length,
        monthlyRevenue,
        unpaidInvoices: unpaidInvoices.length,
        paidInvoices: paidInvoices.length
      })
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error)
    } finally {
      setLoading(false)
    }
  }

  const occupancyRate = Math.round((stats.occupiedUnits / stats.totalUnits) * 100)

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Tableau de Bord
        </h1>
        <p className="text-gray-600">
          Vue d'ensemble de votre parc immobilier
        </p>
      </div>

      {/* Statistiques principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bâtiments</CardTitle>
            <Building2 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBuildings}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalUnits} unités au total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux d'occupation</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{occupancyRate}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.occupiedUnits}/{stats.totalUnits} unités occupées
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenus mensuels</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.monthlyRevenue.toLocaleString('fr-FR')} DH</div>
            <p className="text-xs text-muted-foreground">
              +8% par rapport au mois dernier
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Factures en attente</CardTitle>
            <Receipt className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.unpaidInvoices}</div>
            <p className="text-xs text-muted-foreground">
              {stats.paidInvoices} factures payées ce mois
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graphique des revenus */}
        <Card>
          <CardHeader>
            <CardTitle>Évolution des revenus</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value} DH`, 'Revenus']} />
                <Bar dataKey="revenue" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Alertes et notifications */}
        <Card>
          <CardHeader>
            <CardTitle>Alertes & Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">3 factures impayées</p>
                <p className="text-xs text-gray-500">
                  Relances à envoyer aux locataires
                </p>
                <Badge variant="outline" className="mt-1">
                  Action requise
                </Badge>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Contrat renouvelé</p>
                <p className="text-xs text-gray-500">
                  Appartement A1-03 renouvelé pour 1 an
                </p>
                <Badge variant="secondary" className="mt-1">
                  Terminé
                </Badge>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Fin de contrat prochaine</p>
                <p className="text-xs text-gray-500">
                  2 contrats expirent dans les 30 jours
                </p>
                <Badge variant="outline" className="mt-1">
                  À surveiller
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}