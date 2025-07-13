import { Building2, Users, FileText, Receipt, BarChart3, Home, FileCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  currentPage: string
  onPageChange: (page: string) => void
}

const menuItems = [
  { id: 'dashboard', label: 'Tableau de Bord', icon: Home },
  { id: 'buildings', label: 'Bâtiments', icon: Building2 },
  { id: 'tenants', label: 'Locataires', icon: Users },
  { id: 'contracts', label: 'Contrats', icon: FileText },
  { id: 'invoices', label: 'Factures', icon: Receipt },
  { id: 'quittances', label: 'Quittances', icon: FileCheck },
  { id: 'reports', label: 'Rapports', icon: BarChart3 },
]

export function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  return (
    <div className="w-64 bg-white border-r border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">
          Gestion Locative
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Système de gestion immobilière
        </p>
      </div>
      
      <nav className="mt-6">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPage === item.id
          
          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={cn(
                'w-full flex items-center px-6 py-3 text-left text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <Icon className={cn(
                'w-5 h-5 mr-3',
                isActive ? 'text-blue-700' : 'text-gray-400'
              )} />
              {item.label}
            </button>
          )
        })}
      </nav>
      
      <div className="absolute bottom-6 left-6 right-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">Version</p>
          <p className="text-sm font-medium text-gray-900">1.0.0</p>
        </div>
      </div>
    </div>
  )
}