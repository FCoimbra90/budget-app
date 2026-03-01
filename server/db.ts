import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema.js'
import { mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Em produção usa /data (Railway volume) ou ./data local
const DB_PATH = process.env.DB_PATH ||
  (process.env.NODE_ENV === 'production'
    ? '/data/budget.db'
    : join(__dirname, '../../data/budget.db'))

// Garante que a pasta existe
try {
  mkdirSync(dirname(DB_PATH), { recursive: true })
} catch {}

const sqlite = new Database(DB_PATH)
sqlite.pragma('journal_mode = WAL')
sqlite.pragma('foreign_keys = ON')

export const db = drizzle(sqlite, { schema })
export { sqlite }
