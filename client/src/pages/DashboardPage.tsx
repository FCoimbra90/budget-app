import { useState, useEffect } from 'react'
import { api, MonthlySummary, DateMode } from '../lib/api'
import { formatCurrency, formatMonth } from '../lib/format'

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

export default function DashboardPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [dateMode, setDateMode] = useState<DateMode>('settlement')
  const [summary, setSummary] = useState<MonthlySummary | null>(null)
  const [loading, setLoading] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const data = await api.transactions.summary({ month, year, dateMode })
      setSummary(data)
    } catch { setSummary(null) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [month, year, dateMode])

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const expenses = summary?.byCategory.filter(c => c.type === 'expense' || (!c.type && c.total < 0)) ?? []
  const incomes = summary?.byCategory.filter(c => c.type === 'income' || (!c.type && c.total > 0)) ?? []
  const maxExpense = Math.max(...expenses.map(c => Math.abs(c.total)), 1)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>
          <p className="text-sm text-gray-500 mt-0.5">Visão geral do mês</p>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button className="btn-secondary px-2" onClick={prevMonth}>‹</button>
          <span className="font-medium text-gray-800 min-w-[130px] text-center">{MONTHS[month-1]} {year}</span>
          <button className="btn-secondary px-2" onClick={nextMonth}>›</button>
        </div>
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

      {loading ? (
        <div className="card p-12 text-center text-gray-400">Carregando...</div>
      ) : !summary ? (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-3">📊</p>
          <p className="font-medium text-gray-700">Nenhum dado para este período</p>
          <p className="text-sm text-gray-400 mt-1">Importe extratos para ver o dashboard</p>
        </div>
      ) : (
        <>
          {/* Cards de resumo */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="card p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Receitas</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.income)}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Despesas</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.expense)}</p>
            </div>
            <div className="card p-5">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Saldo</p>
              <p className={`text-2xl font-bold ${summary.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.balance)}
              </p>
            </div>
          </div>

          {/* Despesas por categoria */}
          {expenses.length > 0 && (
            <div className="card p-5 mb-4">
              <h3 className="font-semibold text-gray-800 mb-4">Despesas por Categoria</h3>
              <div className="space-y-3">
                {expenses.map(cat => {
                  const pct = (Math.abs(cat.total) / maxExpense) * 100
                  return (
                    <div key={cat.id ?? 'uncategorized'}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 flex items-center gap-1.5">
                          {cat.color && <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />}
                          {cat.name ?? '— sem categoria —'}
                          <span className="text-gray-400 text-xs">({cat.count})</span>
                        </span>
                        <span className="font-medium text-red-600">{formatCurrency(cat.total)}</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-red-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Receitas por categoria */}
          {incomes.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Receitas por Categoria</h3>
              <div className="space-y-2">
                {incomes.map(cat => (
                  <div key={cat.id ?? 'uncategorized'} className="flex justify-between text-sm">
                    <span className="text-gray-700 flex items-center gap-1.5">
                      {cat.color && <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />}
                      {cat.name ?? '— sem categoria —'}
                    </span>
                    <span className="font-medium text-green-600">{formatCurrency(cat.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
