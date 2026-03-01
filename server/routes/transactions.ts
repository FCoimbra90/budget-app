import { Router } from 'express'
import { db } from '../db.js'
import { transactions, categories, accounts } from '../schema.js'
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm'
import { z } from 'zod'

const router = Router()

const TransactionUpdateSchema = z.object({
  categoryId: z.number().nullable().optional(),
  subcategoryId: z.number().nullable().optional(),
  transactionType: z.enum(['income', 'expense', 'cc_payment', 'internal_transfer']).optional(),
  notes: z.string().optional(),
})

// GET /api/transactions
// Query params: accountId, month, year, dateMode ('transaction' | 'settlement'), type
router.get('/', async (req, res) => {
  try {
    const { accountId, month, year, dateMode = 'settlement', type } = req.query
    const dateField = dateMode === 'transaction' ? transactions.dateTransaction : transactions.dateSettlement

    const conditions = []

    if (accountId) conditions.push(eq(transactions.accountId, Number(accountId)))
    if (type) conditions.push(eq(transactions.transactionType, String(type)))

    if (month && year) {
      const m = String(month).padStart(2, '0')
      const y = String(year)
      const start = `${y}-${m}-01`
      const end = `${y}-${m}-31`
      conditions.push(gte(dateField, start))
      conditions.push(lte(dateField, end))
    }

    const rows = await db
      .select({
        id: transactions.id,
        description: transactions.description,
        amount: transactions.amount,
        dateTransaction: transactions.dateTransaction,
        dateSettlement: transactions.dateSettlement,
        transactionType: transactions.transactionType,
        isCategorized: transactions.isCategorized,
        notes: transactions.notes,
        categoryId: transactions.categoryId,
        subcategoryId: transactions.subcategoryId,
        accountId: transactions.accountId,
        accountName: accounts.name,
        accountType: accounts.type,
        categoryName: categories.name,
      })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(dateField))

    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

// PATCH /api/transactions/:id — categorizar / editar
router.patch('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const data = TransactionUpdateSchema.parse(req.body)

    const updateData: Record<string, unknown> = { ...data }
    if (data.categoryId !== undefined) updateData.isCategorized = data.categoryId !== null

    const [updated] = await db.update(transactions).set(updateData).where(eq(transactions.id, id)).returning()
    if (!updated) return res.status(404).json({ error: 'Transação não encontrada' })
    res.json(updated)
  } catch (e) {
    res.status(400).json({ error: String(e) })
  }
})

// GET /api/transactions/summary — fluxo de caixa mensal
router.get('/summary', async (req, res) => {
  try {
    const { month, year, dateMode = 'settlement' } = req.query
    const dateField = dateMode === 'transaction' ? 'date_transaction' : 'date_settlement'

    if (!month || !year) return res.status(400).json({ error: 'month e year são obrigatórios' })

    const m = String(month).padStart(2, '0')
    const y = String(year)
    const start = `${y}-${m}-01`
    const end = `${y}-${m}-31`

    // Totais por tipo
    const totals = db.all(`
      SELECT
        transaction_type,
        SUM(amount) as total,
        COUNT(*) as count
      FROM transactions
      WHERE ${dateField} >= ? AND ${dateField} <= ?
        AND transaction_type != 'cc_payment'
        AND transaction_type != 'internal_transfer'
      GROUP BY transaction_type
    `, [start, end]) as Array<{ transaction_type: string; total: number; count: number }>

    // Totais por categoria
    const byCategory = db.all(`
      SELECT
        c.id,
        c.name,
        c.type,
        c.color,
        SUM(t.amount) as total,
        COUNT(*) as count
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.${dateField} >= ? AND t.${dateField} <= ?
        AND t.transaction_type != 'cc_payment'
        AND t.transaction_type != 'internal_transfer'
      GROUP BY c.id
      ORDER BY ABS(SUM(t.amount)) DESC
    `, [start, end]) as Array<{ id: number; name: string; type: string; color: string; total: number; count: number }>

    const income = totals.find(t => t.transaction_type === 'income')?.total ?? 0
    const expense = totals.find(t => t.transaction_type === 'expense')?.total ?? 0

    res.json({
      month: Number(month),
      year: Number(year),
      dateMode,
      income,
      expense,
      balance: income + expense, // expense é negativo
      byCategory,
    })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

export default router
