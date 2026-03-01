import { Router } from 'express'
import { db } from '../db.js'
import { accounts } from '../schema.js'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const router = Router()

const AccountSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['bank', 'credit_card', 'brokerage']),
  institution: z.string().min(1),
  color: z.string().default('#6366f1'),
})

// GET /api/accounts
router.get('/', async (_req, res) => {
  try {
    const rows = await db.select().from(accounts).orderBy(accounts.name)
    res.json(rows)
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

// POST /api/accounts
router.post('/', async (req, res) => {
  try {
    const data = AccountSchema.parse(req.body)
    const [account] = await db.insert(accounts).values(data).returning()
    res.status(201).json(account)
  } catch (e) {
    res.status(400).json({ error: String(e) })
  }
})

// PATCH /api/accounts/:id
router.patch('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const data = AccountSchema.partial().parse(req.body)
    const [updated] = await db.update(accounts).set(data).where(eq(accounts.id, id)).returning()
    if (!updated) return res.status(404).json({ error: 'Conta não encontrada' })
    res.json(updated)
  } catch (e) {
    res.status(400).json({ error: String(e) })
  }
})

// DELETE /api/accounts/:id (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    await db.update(accounts).set({ active: false }).where(eq(accounts.id, id))
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

export default router
