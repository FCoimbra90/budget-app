import { useState, useEffect } from 'react'
import { api, Account, AccountType } from '../lib/api'
import { accountTypeLabel } from '../lib/format'

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'bank', label: 'Banco' },
  { value: 'credit_card', label: 'Cartão de Crédito' },
  { value: 'brokerage', label: 'Corretora' },
]

const COLORS = ['#6366f1','#16a34a','#dc2626','#d97706','#0891b2','#7c3aed','#db2777','#65a30d']

const EMPTY_FORM = { name: '', type: 'bank' as AccountType, institution: '', color: '#6366f1' }

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editing, setEditing] = useState<Account | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    const data = await api.accounts.list()
    setAccounts(data.filter(a => a.active))
  }

  useEffect(() => { load() }, [])

  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true); setError('') }
  const openEdit = (a: Account) => {
    setEditing(a)
    setForm({ name: a.name, type: a.type, institution: a.institution, color: a.color })
    setShowForm(true)
    setError('')
  }

  const save = async () => {
    if (!form.name.trim() || !form.institution.trim()) { setError('Preencha nome e instituição.'); return }
    setLoading(true)
    try {
      if (editing) {
        await api.accounts.update(editing.id, form)
      } else {
        await api.accounts.create(form)
      }
      setShowForm(false)
      await load()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const remove = async (id: number) => {
    if (!confirm('Desativar esta conta?')) return
    await api.accounts.remove(id)
    await load()
  }

  const byType = (type: AccountType) => accounts.filter(a => a.type === type)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Contas</h2>
          <p className="text-sm text-gray-500 mt-0.5">Bancos, cartões e corretoras</p>
        </div>
        <button className="btn-primary" onClick={openNew}>+ Nova Conta</button>
      </div>

      {/* Modal de form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="card p-6 w-full max-w-md mx-4">
            <h3 className="font-semibold text-gray-900 mb-4">{editing ? 'Editar Conta' : 'Nova Conta'}</h3>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <div className="space-y-3">
              <div>
                <label className="label">Nome da conta</label>
                <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ex: Santander Corrente" />
              </div>
              <div>
                <label className="label">Tipo</label>
                <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as AccountType }))}>
                  {ACCOUNT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Instituição</label>
                <input className="input" value={form.institution} onChange={e => setForm(f => ({ ...f, institution: e.target.value }))} placeholder="ex: Santander" />
              </div>
              <div>
                <label className="label">Cor</label>
                <div className="flex gap-2 flex-wrap mt-1">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${form.color === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button className="btn-primary" onClick={save} disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista por tipo */}
      {ACCOUNT_TYPES.map(({ value, label }) => {
        const items = byType(value)
        if (items.length === 0) return null
        return (
          <div key={value} className="mb-6">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{label}</h3>
            <div className="space-y-2">
              {items.map(a => (
                <div key={a.id} className="card p-4 flex items-center gap-4">
                  <div className="w-3 h-10 rounded-full flex-shrink-0" style={{ backgroundColor: a.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{a.name}</p>
                    <p className="text-sm text-gray-500">{a.institution}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-secondary text-xs" onClick={() => openEdit(a)}>Editar</button>
                    <button className="btn text-xs text-red-600 hover:bg-red-50 border border-red-200" onClick={() => remove(a.id)}>Remover</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {accounts.length === 0 && !showForm && (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-3">🏦</p>
          <p className="font-medium text-gray-700">Nenhuma conta cadastrada</p>
          <p className="text-sm text-gray-400 mt-1">Comece adicionando suas contas bancárias e cartões</p>
          <button className="btn-primary mt-4" onClick={openNew}>+ Nova Conta</button>
        </div>
      )}
    </div>
  )
}
