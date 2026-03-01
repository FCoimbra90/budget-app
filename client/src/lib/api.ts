// Cliente de API centralizado

const BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Erro desconhecido')
  }
  return res.json()
}

// ── Contas ──────────────────────────────────────
export const api = {
  accounts: {
    list: () => request<Account[]>('/accounts'),
    create: (data: Omit<Account, 'id' | 'createdAt' | 'active'>) =>
      request<Account>('/accounts', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Account>) =>
      request<Account>(`/accounts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: number) =>
      request<{ ok: boolean }>(`/accounts/${id}`, { method: 'DELETE' }),
  },

  categories: {
    list: () => request<CategoryTree[]>('/categories'),
    create: (data: Omit<Category, 'id' | 'createdAt' | 'active'>) =>
      request<Category>('/categories', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Category>) =>
      request<Category>(`/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    remove: (id: number) =>
      request<{ ok: boolean }>(`/categories/${id}`, { method: 'DELETE' }),
  },

  transactions: {
    list: (params: TransactionQuery) => {
      const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)]))
      return request<TransactionRow[]>(`/transactions?${qs}`)
    },
    update: (id: number, data: Partial<TransactionRow>) =>
      request<TransactionRow>(`/transactions/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    summary: (params: { month: number; year: number; dateMode?: string }) => {
      const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))
      return request<MonthlySummary>(`/transactions/summary?${qs}`)
    },
  },
}

// ── Tipos ──────────────────────────────────────
export type AccountType = 'bank' | 'credit_card' | 'brokerage'
export type TransactionType = 'income' | 'expense' | 'cc_payment' | 'internal_transfer'
export type CategoryType = 'income' | 'expense' | 'internal'
export type DateMode = 'transaction' | 'settlement'

export interface Account {
  id: number
  name: string
  type: AccountType
  institution: string
  color: string
  active: boolean
  createdAt: string
}

export interface Category {
  id: number
  name: string
  type: CategoryType
  parentId: number | null
  color: string
  active: boolean
  createdAt: string
}

export interface CategoryTree extends Category {
  subcategories: Category[]
}

export interface TransactionRow {
  id: number
  description: string
  amount: number
  dateTransaction: string
  dateSettlement: string
  transactionType: TransactionType
  isCategorized: boolean
  notes: string | null
  categoryId: number | null
  subcategoryId: number | null
  accountId: number
  accountName: string
  accountType: AccountType
  categoryName: string | null
}

export interface TransactionQuery {
  accountId?: number
  month?: number
  year?: number
  dateMode?: DateMode
  type?: TransactionType
}

export interface MonthlySummary {
  month: number
  year: number
  dateMode: string
  income: number
  expense: number
  balance: number
  byCategory: Array<{
    id: number
    name: string
    type: string
    color: string
    total: number
    count: number
  }>
}
