import { Router } from 'express'
import { db } from '../db.js'
import { categories } from '../schema.js'
import { eq, isNull } from 'drizzle-orm'
import { z } from 'zod'

const router = Router()

const CategorySchema = z.object({
  name: z.string().min(1),
  type: z.enum(['income', 'expense', 'internal']),
  parentId: z.number().nullable().default(null),
  color: z.string().default('#6366f1'),
})

// GET /api/categories — retorna árvore completa
router.get('/', async (_req, res) => {
  try {
    const all = await db.select().from(categories).where(eq(categories.active, true))

    // Monta árvore: raízes com suas subcategorias
    const roots = all.filter(c => c.parentId === null)
    const tree = roots.map(root => ({
      ...root,
      subcategories: all.filter(c => c.parentId === root.id),
    }))

    res.json(tree)
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

// POST /api/categories
router.post('/', async (req, res) => {
  try {
    const data = CategorySchema.parse(req.body)
    const [category] = await db.insert(categories).values(data).returning()
    res.status(201).json(category)
  } catch (e) {
    res.status(400).json({ error: String(e) })
  }
})

// PATCH /api/categories/:id
router.patch('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    const data = CategorySchema.partial().parse(req.body)
    const [updated] = await db.update(categories).set(data).where(eq(categories.id, id)).returning()
    if (!updated) return res.status(404).json({ error: 'Categoria não encontrada' })
    res.json(updated)
  } catch (e) {
    res.status(400).json({ error: String(e) })
  }
})

// DELETE /api/categories/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    await db.update(categories).set({ active: false }).where(eq(categories.id, id))
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: String(e) })
  }
})

export default router
