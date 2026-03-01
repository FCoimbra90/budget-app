# Implementação do Módulo de Importação de Extratos

## Status: ✅ COMPLETO

### Fases Implementadas

#### Fase 1: Backend Infrastructure ✅
- **server/parsers/types.ts** - Interfaces compartilhadas para todos os parsers
  - `ParserInterface`: métodos `canParse()` e `parse()`
  - `ParserTransaction`: estrutura normalizada (date, description, amount, datePurchase?)
  - `ParserResult`: resultado com transações, bankName, accountType, sourceType, errors

- **server/parsers/** - 6 Parsers CSV:
  - `santander.ts` - Extrato Santander com suporte a múltiplas variações de colunas
  - `safra.ts` - Extrato Safra
  - `contabilizei.ts` - Extrato Contabilizei
  - `xp-bank.ts` - Extrato XP Investimentos
  - `xp-card.ts` - Fatura Cartão XP (com suporte a datePurchase)

Cada parser:
- Auto-detecta formato CSV via `canParse()`
- Normaliza datas (DD/MM/YYYY → YYYY-MM-DD)
- Converte formato numérico brasileiro (1.234,56 → 1234.56)
- Pula linhas vazias e recupera de erros por linha
- Retorna array normalizado de transações

#### Fase 2: API Backend ✅

**server/services/importService.ts**
- Auto-detecta banco tentando cada parser
- Deduplicação de transações (hash: accountId + date + amount + description)
- Detecta pagamentos CC (palavras-chave: PAGAMENTO, FATURA)
- Cria record em `import_batches`
- Bulk insert em `transactions`
- Retorna resumo: { batchId, transactionsImported, duplicatesSkipped, errors }

**server/routes/imports.ts**
- `POST /api/imports` - Upload de arquivo CSV via multer
  - Valida extensão .csv
  - Limite: 10MB
  - Retorna resultado da importação
- `GET /api/imports` - Lista todos os lotes
- `GET /api/imports/:batchId` - Detalha um lote específico
- `DELETE /api/imports/:batchId` - Desfaz importação (deleta transações e batch)

#### Fase 3: Frontend ✅

**client/src/pages/ImportsPage.tsx**
- Upload de arquivo com seletor de conta
- Exibe progresso enquanto importa
- Mostra resumo: transações importadas, duplicadas puladas, erros
- Histórico de importações em tabela
- Botão "Desfazer" para cada lote
- Seção de ajuda com bancos suportados

**Integração com App.tsx**
- Nova rota `imports` no router
- Nav item: "📥 Importar" entre Transações e Contas
- Importa `ImportsPage` e renderiza condicional

#### Fase 4: Database ✅

**server/schema.ts**
- Adicionado campos a `importBatches`:
  - `bankName` - Nome do banco (ex: "Santander", "XP Investimentos")
  - `accountType` - 'bank' ou 'credit_card'
  - `sourceType` - 'bank_statement' ou 'credit_card_bill'

**Migrations**
- `migrate.ts` cria tabelas automaticamente na inicialização
- Novos campos em `import_batches` serão criados no próximo start

#### Fase 5: API Client ✅

**client/src/lib/api.ts**
- `api.imports.upload(file, accountId)` - Upload com FormData
- `api.imports.list()` - GET /api/imports
- `api.imports.get(batchId)` - GET /api/imports/:batchId
- `api.imports.undo(batchId)` - DELETE /api/imports/:batchId
- Tipo `ImportBatch` com campos: id, accountId, filename, bankName, accountType, sourceType, transactionCount, importedAt

### Fluxo de Uso

1. Usuário vai para page "Importar"
2. Seleciona conta (bank/credit_card)
3. Escolhe arquivo CSV
4. Clica "Importar"
5. Sistema:
   - Auto-detecta banco baseado em conteúdo CSV
   - Normaliza datas e valores
   - Dedu realiza verificação de duplicatas
   - Detecta cc_payment se em extrato bancário
   - Bulk insere em transactions
   - Cria batch record
6. Mostra resultado: "42 transações importadas do Santander, 3 duplicatas puladas"
7. Transações aparecem em Transações page
8. Dashboard atualiza automaticamente
9. Usuário pode desfazer qualquer importação clicando "Desfazer" ao lado do lote

### Bancos Suportados

| Banco | Tipo | Arquivo | Detectado por |
|-------|------|---------|---------------|
| Santander | Bank | Extrato CSV | Palavra "santander" |
| Safra | Bank | Extrato CSV | Palavras "safra" ou "Data Operação" |
| Contabilizei | Bank | Extrato CSV | Palavra "contabilizei" |
| XP Investimentos | Bank | Extrato CSV | Palavra "xp" ou "extrato 2025" |
| Cartão XP | Credit Card | Fatura CSV | Palavra "cartão" ou "fatura" |

### Lógica de Deduplicação

Transação é considerada duplicata se já existe no banco com:
- Mesma accountId
- Mesma data (dateTransaction)
- Mesmo amount
- Mesma description (normalizada)

Hash MD5: `${accountId}|${date}|${amount}|${description}`

### Detecção de CC Payment

No extrato bancário, se description contém "PAGAMENTO", "FATURA" ou "CARTÃO":
- `transactionType = 'cc_payment'`
- Não é contado como despesa
- Não afeta saldo na visão Caixa

### Formato de Datas

Entrada (CSV): `DD/MM/YYYY` (ex: 31/12/2024)
Saída (DB): `YYYY-MM-DD` (ex: 2024-12-31)

### Formato de Números

Entrada (CSV): `1.234,56` ou `R$ 1.234,56`
Saída (DB): `1234.56`

### Compilação

✅ Build local: `npm run build`
- Frontend: Vite bundle → dist/client
- Backend: esbuild → dist/server/index.js
- Tamanho: ~228KB gzipped (frontend)

### Próximas Fases (Future)

- [ ] Fase 5: Aplicar regras de categorização automática durante importação
- [ ] Fase 6: Suporte a OFX e PDF (além de CSV)
- [ ] Fase 7: Preview de importação antes de confirmar
- [ ] Fase 8: Teste end-to-end com arquivos reais
- [ ] Fase 9: Deploy no Railway

### Deploy no Railway

Para deployar:

```bash
# Push para GitHub
git push origin main

# Railway detectará mudanças e redepoyará automaticamente
# Ou manualmente:
# 1. Ir para https://railway.app/dashboard
# 2. Clicar em "Deploy"
```

### Notas Técnicas

- PapaParse para CSV parsing com suporte a latin1 encoding
- Drizzle ORM para operações de banco de dados
- Multer middleware para upload de arquivo (10MB limit)
- md5 hash para deduplicação
- Renderização de strings de erro sempre em safe mode (try-catch)

### Testing

Para testar com arquivo real:

```bash
# 1. Preparar arquivo CSV do Santander/outro banco
# 2. Em ImportsPage: selecionar conta e fazer upload
# 3. Verificar em Transações page que transações aparecem
# 4. Ir para Dashboard e confirmar totais
# 5. Toggle Caixa/Competência para verificar datas

# Se quiser desfazer:
# Click em "Desfazer" na linha do import
```

---

**Desenvolvido em**: 2026-03-01
**Commits relacionados**: cb817c2 (Main import module implementation)
