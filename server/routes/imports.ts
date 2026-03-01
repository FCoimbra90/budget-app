import { Router, Request, Response } from 'express'
import multer from 'multer'
import { importTransactions } from '../services/importService.js'
import { db } from '../db.js'
import { importBatches, transactions } from '../schema.js'
import { eq } from 'drizzle-orm'

const router = Router()

// Configure multer for file uploads (keep file in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    // Only accept CSV files
    if (!file.originalname.endsWith('.csv')) {
      cb(new Error('Only CSV files are supported'))
    } else {
      cb(null, true)
    }
  },
})

/**
 * POST /api/imports
 * Upload and import a CSV file
 */
router.post('/', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file
    const accountId = req.body.accountId ? Number(req.body.accountId) : null

    // Validate inputs
    if (!file) {
      res.status(400).json({ error: 'No file provided' })
      return
    }

    if (!accountId || isNaN(accountId)) {
      res.status(400).json({ error: 'Invalid accountId' })
      return
    }

    // Read file content as UTF-8 string
    const csvText = file.buffer.toString('utf-8')

    // Call import service
    const result = await importTransactions(csvText, accountId, file.originalname)

    if (result.batchId === -1) {
      res.status(400).json({
        error: result.errors[0] || 'Failed to import transactions',
        errors: result.errors,
      })
      return
    }

    res.status(201).json({
      success: true,
      batchId: result.batchId,
      bankName: result.bankName,
      accountType: result.accountType,
      transactionsImported: result.transactionsImported,
      duplicatesSkipped: result.duplicatesSkipped,
      errors: result.errors.length > 0 ? result.errors : undefined,
    })
  } catch (error) {
    console.error('Import error:', error)
    res.status(500).json({
      error: 'Failed to process file upload',
      details: String(error),
    })
  }
})

/**
 * GET /api/imports
 * List all import batches
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const batches = await db.select().from(importBatches).orderBy(importBatches.id)

    res.json({
      batches: batches.map((b) => ({
        id: b.id,
        accountId: b.accountId,
        filename: b.filename,
        bankName: b.bankName,
        accountType: b.accountType,
        sourceType: b.sourceType,
        transactionCount: b.transactionCount,
        importedAt: b.importedAt,
      })),
    })
  } catch (error) {
    console.error('Error listing imports:', error)
    res.status(500).json({ error: 'Failed to list imports' })
  }
})

/**
 * GET /api/imports/:batchId
 * Get details of a specific import batch
 */
router.get('/:batchId', async (req: Request, res: Response) => {
  try {
    const batchId = Number(req.params.batchId)

    if (isNaN(batchId)) {
      res.status(400).json({ error: 'Invalid batch ID' })
      return
    }

    const batch = await db.select().from(importBatches).where(eq(importBatches.id, batchId))

    if (batch.length === 0) {
      res.status(404).json({ error: 'Batch not found' })
      return
    }

    // Get all transactions from this batch
    const batchTransactions = await db
      .select()
      .from(transactions)
      .where(eq(transactions.importBatchId, batchId))

    res.json({
      batch: batch[0],
      transactionCount: batchTransactions.length,
      transactions: batchTransactions,
    })
  } catch (error) {
    console.error('Error fetching batch:', error)
    res.status(500).json({ error: 'Failed to fetch batch details' })
  }
})

/**
 * DELETE /api/imports/:batchId
 * Undo an import by deleting all transactions from that batch
 */
router.delete('/:batchId', async (req: Request, res: Response) => {
  try {
    const batchId = Number(req.params.batchId)

    if (isNaN(batchId)) {
      res.status(400).json({ error: 'Invalid batch ID' })
      return
    }

    // Verify batch exists
    const batch = await db.select().from(importBatches).where(eq(importBatches.id, batchId))

    if (batch.length === 0) {
      res.status(404).json({ error: 'Batch not found' })
      return
    }

    // Delete all transactions from this batch
    const deleteResult = await db.delete(transactions).where(eq(transactions.importBatchId, batchId))

    // Delete the batch record
    await db.delete(importBatches).where(eq(importBatches.id, batchId))

    res.json({
      success: true,
      message: `Undo successful. Deleted ${deleteResult} transactions.`,
    })
  } catch (error) {
    console.error('Error undoing import:', error)
    res.status(500).json({ error: 'Failed to undo import' })
  }
})

export default router
