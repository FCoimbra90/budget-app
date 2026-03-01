import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// ─────────────────────────────────────────────
// CONTAS (Banco, Cartão de Crédito, Corretora)
// ─────────────────────────────────────────────
export const accounts = sqliteTable('accounts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),                          // ex: "Santander Corrente", "XP Visa"
  type: text('type').notNull(),                          // 'bank' | 'credit_card' | 'brokerage'
  institution: text('institution').notNull(),            // ex: "Santander", "XP", "Safra"
  color: text('color').notNull().default('#6366f1'),     // cor para identificação visual
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

// ─────────────────────────────────────────────
// CATEGORIAS (hierarquia: Tipo > Subtipo)
// ─────────────────────────────────────────────
export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type').notNull(),                          // 'income' | 'expense' | 'internal'
  parentId: integer('parent_id'),                        // null = categoria raiz
  color: text('color').notNull().default('#6366f1'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

// ─────────────────────────────────────────────
// LOTES DE IMPORTAÇÃO (rastreabilidade)
// ─────────────────────────────────────────────
export const importBatches = sqliteTable('import_batches', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  accountId: integer('account_id').notNull(),
  filename: text('filename').notNull(),
  fileType: text('file_type').notNull(),                 // 'csv' | 'ofx' | 'pdf'
  bankName: text('bank_name').notNull(),                 // ex: "Santander", "XP Investimentos"
  accountType: text('account_type').notNull(),           // 'bank' | 'credit_card'
  sourceType: text('source_type').notNull(),             // 'bank_statement' | 'credit_card_bill'
  periodMonth: integer('period_month'),                  // mês de referência (1–12)
  periodYear: integer('period_year'),                    // ano de referência
  transactionCount: integer('transaction_count').notNull().default(0),
  importedAt: text('imported_at').notNull().default(sql`(datetime('now'))`),
})

// ─────────────────────────────────────────────
// TRANSAÇÕES — entidade central do sistema
// ─────────────────────────────────────────────
export const transactions = sqliteTable('transactions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  importBatchId: integer('import_batch_id'),             // null = lançado manualmente
  accountId: integer('account_id').notNull(),

  // Descrição original do extrato e versão normalizada
  description: text('description').notNull(),
  descriptionNormalized: text('description_normalized'),

  // Valor: positivo = entrada, negativo = saída
  amount: real('amount').notNull(),

  // DUAS DATAS — coração da visão caixa x competência
  // Para banco: as duas são iguais
  // Para cartão: dateTransaction = data da compra, dateSettlement = vencimento da fatura
  dateTransaction: text('date_transaction').notNull(),   // YYYY-MM-DD
  dateSettlement: text('date_settlement').notNull(),     // YYYY-MM-DD

  // Tipo da transação
  // 'income'           = entrada de dinheiro
  // 'expense'          = saída / despesa real
  // 'cc_payment'       = pagamento de fatura no extrato bancário (NÃO é despesa real)
  // 'internal_transfer'= transferência entre contas próprias
  transactionType: text('transaction_type').notNull().default('expense'),

  // Categorização
  categoryId: integer('category_id'),                   // null = sem categoria
  subcategoryId: integer('subcategory_id'),              // null = sem subcategoria

  // Controle
  isCategorized: integer('is_categorized', { mode: 'boolean' }).notNull().default(false),
  notes: text('notes'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (t) => ({
  idxAccount: index('idx_transactions_account').on(t.accountId),
  idxDateTransaction: index('idx_transactions_date_tx').on(t.dateTransaction),
  idxDateSettlement: index('idx_transactions_date_settle').on(t.dateSettlement),
  idxCategory: index('idx_transactions_category').on(t.categoryId),
  idxType: index('idx_transactions_type').on(t.transactionType),
}))

// ─────────────────────────────────────────────
// REGRAS DE CATEGORIZAÇÃO AUTOMÁTICA
// ─────────────────────────────────────────────
export const categorizationRules = sqliteTable('categorization_rules', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pattern: text('pattern').notNull(),                    // texto a buscar na descrição
  matchType: text('match_type').notNull().default('contains'), // 'contains' | 'exact' | 'starts_with'
  categoryId: integer('category_id').notNull(),
  subcategoryId: integer('subcategory_id'),
  priority: integer('priority').notNull().default(0),    // maior = mais prioritário
  matchCount: integer('match_count').notNull().default(0),// quantas vezes foi aplicada
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

// Types derivados para uso no frontend e backend
export type Account = typeof accounts.$inferSelect
export type NewAccount = typeof accounts.$inferInsert
export type Category = typeof categories.$inferSelect
export type NewCategory = typeof categories.$inferInsert
export type Transaction = typeof transactions.$inferSelect
export type NewTransaction = typeof transactions.$inferInsert
export type ImportBatch = typeof importBatches.$inferSelect
export type NewImportBatch = typeof importBatches.$inferInsert
export type CategorizationRule = typeof categorizationRules.$inferSelect
export type NewCategorizationRule = typeof categorizationRules.$inferInsert
