import { useState } from 'react'
import AccountsPage from './pages/AccountsPage'
import TransactionsPage from './pages/TransactionsPage'
import CategoriesPage from './pages/CategoriesPage'
import DashboardPage from './pages/DashboardPage'
import ImportsPage from './pages/ImportsPage'

type Page = 'dashboard' | 'transactions' | 'accounts' | 'categories' | 'imports'

const NAV_ITEMS: { id: Page; label: string; icon: string }[] = [
  { id: 'dashboard',    label: 'Dashboard',    icon: '📊' },
  { id: 'transactions', label: 'Transações',   icon: '💳' },
  { id: 'imports',      label: 'Importar',     icon: '📥' },
  { id: 'accounts',     label: 'Contas',       icon: '🏦' },
  { id: 'categories',   label: 'Categorias',   icon: '🏷️' },
]

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-5 border-b border-gray-100">
          <h1 className="text-lg font-bold text-indigo-600">💰 Budget</h1>
          <p className="text-xs text-gray-400 mt-0.5">Controle Financeiro</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setPage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left
                ${page === item.id
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">Budget App v1.0</p>
        </div>
      </aside>

      {/* Conteúdo */}
      <main className="flex-1 overflow-auto">
        {page === 'dashboard'    && <DashboardPage />}
        {page === 'transactions' && <TransactionsPage />}
        {page === 'imports'      && <ImportsPage />}
        {page === 'accounts'     && <AccountsPage />}
        {page === 'categories'   && <CategoriesPage />}
      </main>
    </div>
  )
}
