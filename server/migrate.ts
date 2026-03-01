import { sqlite } from './db.js'

// Cria todas as tabelas se não existirem (migration simples sem Drizzle Kit)
export function runMigrations() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      type        TEXT NOT NULL CHECK(type IN ('bank','credit_card','brokerage')),
      institution TEXT NOT NULL,
      color       TEXT NOT NULL DEFAULT '#6366f1',
      active      INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      type        TEXT NOT NULL CHECK(type IN ('income','expense','internal')),
      parent_id   INTEGER REFERENCES categories(id),
      color       TEXT NOT NULL DEFAULT '#6366f1',
      active      INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS import_batches (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id        INTEGER NOT NULL REFERENCES accounts(id),
      filename          TEXT NOT NULL,
      file_type         TEXT NOT NULL,
      period_month      INTEGER,
      period_year       INTEGER,
      transaction_count INTEGER NOT NULL DEFAULT 0,
      imported_at       TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id                      INTEGER PRIMARY KEY AUTOINCREMENT,
      import_batch_id         INTEGER REFERENCES import_batches(id),
      account_id              INTEGER NOT NULL REFERENCES accounts(id),
      description             TEXT NOT NULL,
      description_normalized  TEXT,
      amount                  REAL NOT NULL,
      date_transaction        TEXT NOT NULL,
      date_settlement         TEXT NOT NULL,
      transaction_type        TEXT NOT NULL DEFAULT 'expense'
                              CHECK(transaction_type IN ('income','expense','cc_payment','internal_transfer')),
      category_id             INTEGER REFERENCES categories(id),
      subcategory_id          INTEGER REFERENCES categories(id),
      is_categorized          INTEGER NOT NULL DEFAULT 0,
      notes                   TEXT,
      created_at              TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_account   ON transactions(account_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_date_tx   ON transactions(date_transaction);
    CREATE INDEX IF NOT EXISTS idx_transactions_date_set  ON transactions(date_settlement);
    CREATE INDEX IF NOT EXISTS idx_transactions_category  ON transactions(category_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_type      ON transactions(transaction_type);

    CREATE TABLE IF NOT EXISTS categorization_rules (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      pattern         TEXT NOT NULL,
      match_type      TEXT NOT NULL DEFAULT 'contains'
                      CHECK(match_type IN ('contains','exact','starts_with','regex')),
      category_id     INTEGER NOT NULL REFERENCES categories(id),
      subcategory_id  INTEGER REFERENCES categories(id),
      priority        INTEGER NOT NULL DEFAULT 0,
      match_count     INTEGER NOT NULL DEFAULT 0,
      active          INTEGER NOT NULL DEFAULT 1,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  console.log('✅ Migrations concluídas')
}
