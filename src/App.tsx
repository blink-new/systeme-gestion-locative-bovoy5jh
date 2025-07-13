import { useState, useEffect } from 'react'
import { blink } from './blink/client'
import { Sidebar } from './components/Layout/Sidebar'
import { Dashboard } from './components/Pages/Dashboard'
import { Buildings } from './components/Pages/Buildings'
import { Tenants } from './components/Pages/Tenants'
import { Contracts } from './components/Pages/Contracts'
import { Invoices } from './components/Pages/Invoices'
import { Quittances } from './components/Pages/Quittances'
import { Reports } from './components/Pages/Reports'
import { Loader2 } from 'lucide-react'

type Page = 'dashboard' | 'buildings' | 'tenants' | 'contracts' | 'invoices' | 'quittances' | 'reports'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState<Page>('dashboard')

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setLoading(state.isLoading)
    })
    return unsubscribe
  }, [])

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />
      case 'buildings':
        return <Buildings />
      case 'tenants':
        return <Tenants />
      case 'contracts':
        return <Contracts />
      case 'invoices':
        return <Invoices />
      case 'quittances':
        return <Quittances />
      case 'reports':
        return <Reports />
      default:
        return <Dashboard />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Chargement de l'application...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Système de Gestion Locative
          </h1>
          <p className="text-gray-600 mb-8">
            Veuillez vous connecter pour accéder à l'application
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      <main className="flex-1 overflow-auto">
        {renderPage()}
      </main>
    </div>
  )
}

export default App