import { useState, useEffect } from 'react'
import { api, TransactionRow, DateMode, CategoryTree } from '../lib/api'
import { formatCurrency, formatDate, transactionTypeLabel } from '../lib/format'

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

export default function TransactionsPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [dateMode, setDateMode] = useState<DateMode>('settlement')
  const [transactions, setTransactions] = useState<TransactionRow[]>([])
  const [categories, setCategories] = useState<CategoryTree[]>([])
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [txs, cats] = await Promise.all([
        api.transactions.list({ month, year, dateMode }),
        api.categories.list(),
      ])
      setTransactions(txs)
      setCategories(cats)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [month, year, dateMode])

  const categorize = async (id: number, categoryId: number | null) => {
    await api.transactions.update(id, { categoryId })
    setTransactions(txs => txs.map(t => t.id === id ? { ...t, categoryId } : t))
  }

  // Totais rápidos
  const income = transactions.filter(t => t.transactionType === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = transactions.filter(t => t.transactionType === 'expense').reduce((s, t) => s + t.amount, 0)
  const uncategorized = transactions.filter(t => t.transactionType === 'expense' && !t.categoryId).length

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Transações</h2>
          <p className="text-sm text-gray-500 mt-0.5">Extrato mensal consolidado</p>
        </div>
        {/* Navegação de mês */}
        <div className="flex items-center gap-2 ml-auto">
          <button className="btn-secondary px-2" onClick={prevMonth}>‹</button>
          <span className="font-medium text-gray-800 min-w-[120px] text-center">{MONTHS[month-1]} {year}</span>
          <button className="btn-secondary px-2" onClick={nextMonth}>›</button>
        </div>
        {/* Modo de data */}
        <div className="flex rounded-lg border border-gray-300 overflow-hidden">
          {(['settlement','transaction'] as DateMode[]).map(mode => (
            <button key={mode} onClick={() => setDateMode(mode)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors
                ${dateMode === mode ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
              {mode === 'settlement' ? '💵 Caixa' : '📅 Competência'}
            </button>
          ))}
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Entradas</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(income)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Saídas</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(expense)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500 mb-1">Saldo</p>
          <p className={`text-xl font-bold ${income + expense >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(income + expense)}
          </p>
        </div>
      </div>

      {uncategorized > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-sm text-amber-800 flex items-center gap-2">
          <span>⚠️</span>
          <span><strong>{uncategorized} despesa{uncategorized > 1 ? 's' : ''}</strong> sem categoria neste mês.</span>
        </div>
      )}

      {/* Tabela */}
      {loading ? (
        <div className="card p-12 text-center text-gray-400">Carregando...</div>
      ) : transactions.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-3xl mb-3">📄</p>
          <p className="font-medium text-gray-700">Nenhuma transação neste período</p>
          <p className="text-sm text-gray-400 mt-1">Importe um extrato para começar</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Data</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Descrição</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Conta</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Categoria</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map(t => (
                <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {formatDate(dateMode === 'settlement' ? t.dateSettlement : t.dateTransaction)}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="text-gray-900 truncate" title={t.description}>{t.description}</p>
                    {t.transactionType !== 'expense' && (
                      <span className="text-xs text-gray-400">{transactionTypeLabel(t.transactionType)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{t.accountName}</td>
                  <td className="px-4 py-3">
                    {t.transactionType === 'expense' ? (
                      <select
                        className="text-xs border border-gray-200 rounded px-2 py-1 bg-white w-40"
                        value={t.categoryId ?? ''}
                        onChange={e => categorize(t.id, e.target.value ? Number(e.target.value) : null)}
                      >
                        <option value="">— sem categoria —</option>
                        {categories.map(cat => (
                          <optgroup key={cat.id} label={cat.name}>
                            <option value={cat.id}>{cat.name}</option>
                            {cat.subcategories.map(sub => (
                              <option key={sub.id} value={sub.id}>  {sub.name}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono font-medium whitespace-nowrap
                    ${t.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(t.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
