import { useState, useEffect } from 'react'
import { api, Category, CategoryTree, CategoryType } from '../lib/api'

const CATEGORY_TYPES: { value: CategoryType; label: string; color: string }[] = [
  { value: 'income',   label: 'Receita',    color: 'text-green-600 bg-green-50' },
  { value: 'expense',  label: 'Despesa',    color: 'text-red-600 bg-red-50' },
  { value: 'internal', label: 'Interno',    color: 'text-gray-600 bg-gray-100' },
]

const COLORS = ['#6366f1','#16a34a','#dc2626','#d97706','#0891b2','#7c3aed','#db2777','#65a30d','#6b7280']
const EMPTY_FORM = { name: '', type: 'expense' as CategoryType, parentId: null as number | null, color: '#6366f1' }

export default function CategoriesPage() {
  const [tree, setTree] = useState<CategoryTree[]>([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [showForm, setShowForm] = useState(false)
  const [parentContext, setParentContext] = useState<Category | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const load = async () => { setTree(await api.categories.list()) }
  useEffect(() => { load() }, [])

  const openNew = (parent?: Category) => {
    setParentContext(parent ?? null)
    setForm({
      ...EMPTY_FORM,
      parentId: parent?.id ?? null,
      type: parent?.type ?? 'expense',
    })
    setShowForm(true)
    setError('')
  }

  const save = async () => {
    if (!form.name.trim()) { setError('Digite o nome da categoria.'); return }
    setLoading(true)
    try {
      await api.categories.create(form)
      setShowForm(false)
      await load()
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const remove = async (id: number) => {
    if (!confirm('Remover esta categoria?')) return
    await api.categories.remove(id)
    await load()
  }

  const byType = (type: CategoryType) => tree.filter(c => c.type === type)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Categorias</h2>
          <p className="text-sm text-gray-500 mt-0.5">Tipos e subtipos de receitas e despesas</p>
        </div>
        <button className="btn-primary" onClick={() => openNew()}>+ Nova Categoria</button>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="card p-6 w-full max-w-md mx-4">
            <h3 className="font-semibold text-gray-900 mb-1">
              {parentContext ? `Novo subtipo em "${parentContext.name}"` : 'Nova Categoria'}
            </h3>
            {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
            <div className="space-y-3 mt-3">
              <div>
                <label className="label">Nome</label>
                <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="ex: Alimentação" autoFocus />
              </div>
              {!parentContext && (
                <div>
                  <label className="label">Tipo</label>
                  <select className="input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as CategoryType }))}>
                    {CATEGORY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="label">Cor</label>
                <div className="flex gap-2 flex-wrap mt-1">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                      className={`w-7 h-7 rounded-full border-2 ${form.color === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button className="btn-primary" onClick={save} disabled={loading}>{loading ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Lista por tipo */}
      {CATEGORY_TYPES.map(({ value, label, color }) => {
        const items = byType(value)
        if (items.length === 0 && value === 'internal') return null
        return (
          <div key={value} className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{label}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>{items.length}</span>
              </div>
              <button className="text-xs text-indigo-600 hover:underline" onClick={() => openNew()}>+ Adicionar</button>
            </div>
            {items.length === 0 ? (
              <div className="card p-6 text-center text-sm text-gray-400">Nenhuma categoria de {label.toLowerCase()} ainda</div>
            ) : (
              <div className="space-y-2">
                {items.map(cat => (
                  <div key={cat.id} className="card overflow-hidden">
                    {/* Linha da categoria raiz */}
                    <div className="flex items-center gap-3 p-3">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="font-medium text-gray-900 flex-1">{cat.name}</span>
                      <button className="text-xs text-indigo-600 hover:underline mr-2" onClick={() => openNew(cat)}>+ Subtipo</button>
                      <button className="text-xs text-gray-400 hover:text-red-600" onClick={() => remove(cat.id)}>✕</button>
                    </div>
                    {/* Subtipos */}
                    {cat.subcategories?.length > 0 && (
                      <div className="border-t border-gray-100 bg-gray-50 divide-y divide-gray-100">
                        {cat.subcategories.map(sub => (
                          <div key={sub.id} className="flex items-center gap-3 px-4 py-2 pl-8">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: sub.color }} />
                            <span className="text-sm text-gray-700 flex-1">{sub.name}</span>
                            <button className="text-xs text-gray-400 hover:text-red-600" onClick={() => remove(sub.id)}>✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
