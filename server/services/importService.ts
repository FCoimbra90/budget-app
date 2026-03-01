import { db } from '../db.js'
import { transactions, importBatches } from '../schema.js'
import { ParserTransaction } from '../parsers/types.js'
import { SantanderParser } from '../parsers/santander.js'
import { SafraParser } from '../parsers/safra.js'
import { ContabilizeiParser } from '../parsers/contabilizei.js'
import { XPBankParser } from '../parsers/xp-bank.js'
import { XPCardParser } from '../parsers/xp-card.js'
import { eq, and } from 'drizzle-orm'
import crypto from 'crypto'

interface ImportResult {
  batchId: number
  bankName: string
  accountType: string
  transactionsImported: number
  duplicatesSkipped: number
  errors: string[]
}

/**
 * Auto-detects the appropriate parser based on CSV content
 */
function detectParser(csvText: string) {
  const parsers = [
    new SantanderParser(),
    new SafraParser(),
    new ContabilizeiParser(),
    new XPBankParser(),
    new XPCardParser(),
  ]

  for (const parser of parsers) {
    if (parser.canParse(csvText)) {
      return parser
    }
  }

  return null
}

/**
 * Generates a hash for transaction deduplication
 * Hash of: accountId + date + amount + description
 */
function generateTransactionHash(accountId: number, tx: ParserTransaction): string {
  const hashInput = `${accountId}|${tx.date}|${tx.amount}|${tx.description}`
  return crypto.createHash('md5').update(hashInput).digest('hex')
}

/**
 * Detects if a transaction is a credit card payment in a bank statement
 * Credit card payments contain keywords like PAGAMENTO, FATURA
 */
function isCCPayment(description: string): boolean {
  const keywords = ['PAGAMENTO', 'FATURA', 'CARTÃO']
  const desc = description.toUpperCase()
  return keywords.some((keyword) => desc.includes(keyword))
}

/**
 * Main import service function
 * Handles file parsing, deduplication, and bulk insertion
 */
export async function importTransactions(
  csvText: string,
  accountId: number,
  filename: string,
): Promise<ImportResult> {
  const errors: string[] = []
  let transactionsImported = 0
  let duplicatesSkipped = 0

  try {
    // Step 1: Detect parser
    const parser = detectParser(csvText)
    if (!parser) {
      throw new Error(
        'Could not detect bank format. Make sure the CSV is from a supported bank (Santander, Safra, Contabilizei, XP).',
      )
    }

    // Step 2: Parse CSV
    const parseResult = parser.parse(csvText)
    if (parseResult.errors.length > 0) {
      errors.push(...parseResult.errors)
    }

    if (parseResult.transactions.length === 0) {
      throw new Error('No transactions found in the CSV file.')
    }

    // Step 3: Check for duplicates and prepare transactions for insertion
    const transactionsToInsert: typeof transactions.$inferInsert[] = []
    const existingTransactions = await db.select().from(transactions).where(eq(transactions.accountId, accountId))

    for (const tx of parseResult.transactions) {
      // Validate transaction
      if (!tx.date || !tx.description || tx.amount === null || tx.amount === undefined) {
        errors.push(`Invalid transaction: missing required fields (date: ${tx.date}, desc: ${tx.description}, amount: ${tx.amount})`)
        continue
      }

      const txHash = generateTransactionHash(accountId, tx)

      // Check if duplicate exists
      const isDuplicate = existingTransactions.some((existing) => {
        const existingHash = generateTransactionHash(accountId, {
          date: existing.dateTransaction,
          description: existing.description,
          amount: existing.amount,
          datePurchase: existing.datePurchase || undefined,
        })
        return existingHash === txHash
      })

      if (isDuplicate) {
        duplicatesSkipped++
        continue
      }

      // Determine transaction type
      let transactionType = 'expense'
      if (tx.amount > 0) {
        transactionType = 'income'
      } else if (parseResult.sourceType === 'bank_statement' && isCCPayment(tx.description)) {
        transactionType = 'cc_payment'
      }

      transactionsToInsert.push({
        accountId,
        dateTransaction: tx.datePurchase || tx.date, // For credit cards: purchase date; for bank: transaction date
        dateSettlement: tx.date, // For credit cards: same as transaction for now; for bank: transaction date
        description: tx.description,
        amount: tx.amount,
        transactionType,
        categoryId: null, // Will be categorized separately
      })
    }

    // Step 4: Create import batch record
    const batchResult = await db.insert(importBatches).values({
      accountId,
      filename,
      fileType: 'csv',
      bankName: parseResult.bankName,
      accountType: parseResult.accountType,
      sourceType: parseResult.sourceType,
      transactionCount: transactionsToInsert.length,
      importedAt: new Date(),
    })

    const batchId = Number(batchResult.lastInsertRowid)

    // Step 5: Bulk insert transactions
    if (transactionsToInsert.length > 0) {
      await db.insert(transactions).values(transactionsToInsert)
      transactionsImported = transactionsToInsert.length
    }

    return {
      batchId,
      bankName: parseResult.bankName,
      accountType: parseResult.accountType,
      transactionsImported,
      duplicatesSkipped,
      errors,
    }
  } catch (e) {
    errors.push(`Import error: ${String(e)}`)
    return {
      batchId: -1,
      bankName: 'Unknown',
      accountType: 'unknown',
      transactionsImported: 0,
      duplicatesSkipped: 0,
      errors,
    }
  }
}
