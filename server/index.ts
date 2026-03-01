import express from 'express'
import cors from 'cors'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'
import { runMigrations } from './migrate.js'
import accountsRouter from './routes/accounts.js'
import categoriesRouter from './routes/categories.js'
import transactionsRouter from './routes/transactions.js'
import importsRouter from './routes/imports.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = Number(process.env.PORT) || 3001
const isProd = process.env.NODE_ENV === 'production'

app.use(cors())
app.use(express.json())

// Roda migrations ao iniciar
runMigrations()

// Rotas da API
app.use('/api/accounts', accountsRouter)
app.use('/api/categories', categoriesRouter)
app.use('/api/transactions', transactionsRouter)
app.use('/api/imports', importsRouter)

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Em produção: serve o frontend React buildado
if (isProd) {
  const clientDist = join(__dirname, '../client')
  if (existsSync(clientDist)) {
    app.use(express.static(clientDist))
    // Qualquer rota não-API retorna o index.html (SPA)
    app.get('*', (_req, res) => {
      res.sendFile(join(clientDist, 'index.html'))
    })
  }
}

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`)
})
