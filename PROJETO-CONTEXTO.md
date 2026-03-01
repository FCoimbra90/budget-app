# 📋 Budget App — Contexto do Projeto

> **LEIA ESTE ARQUIVO PRIMEIRO** em qualquer nova sessão de desenvolvimento.

---

## 🌐 Links Importantes

| Item | URL |
|------|-----|
| **App Online (produção)** | https://web-production-22a7d.up.railway.app |
| **GitHub** | https://github.com/FCoimbra90/budget-app |
| **Railway Dashboard** | https://railway.app |

---

## 👤 Dono do Projeto

- **Nome:** Francisco Coimbra
- **Email:** f.coimbra.pereira@gmail.com
- **GitHub:** FCoimbra90
- **Perfil:** Área financeira (M&A, reestruturação, controladoria). Heavy user de Excel. Não é desenvolvedor — prefere não usar terminal.

---

## 🎯 Conceito do Sistema

Sistema de **controle orçamentário pessoal** com as seguintes características:

### Fluxo principal
1. Francisco carrega mensalmente seus extratos bancários e faturas de cartão
2. O sistema categoriza automaticamente (por regras + aprendizado)
3. Francisco visualiza o fluxo de caixa mensal por tipo/subtipo de renda e despesa

### Regra crítica de negócio — Cartão de Crédito
- O **extrato bancário** mostra o pagamento da fatura como uma SAÍDA → marcar como `cc_payment` (não é despesa real)
- A **fatura do cartão** tem a discriminação de cada compra → essas SIM são as despesas reais
- **Nunca contar dois vezes** o mesmo gasto

### Duas visões temporais
- **Caixa:** usa `date_settlement` — quando o dinheiro saiu da conta
- **Competência:** usa `date_transaction` — quando a compra foi feita (cartão aparece no mês da compra, não do pagamento)

### Tipos de conta
- `bank` — Conta bancária (Santander, Safra, Contabilizei Bank)
- `credit_card` — Cartão de crédito (XP, outros)
- `brokerage` — Corretora (futuro)

---

## 🏗️ Arquitetura Técnica

### Stack
| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| Banco de dados | SQLite via better-sqlite3 + Drizzle ORM |
| ORM | Drizzle (fácil migrar para PostgreSQL no futuro) |
| Deploy | Railway (Dockerfile) |
| Código | GitHub: FCoimbra90/budget-app |

### Estrutura de pastas
```
budget-app/
├── client/src/
│   ├── pages/          # Dashboard, Transactions, Accounts, Categories
│   ├── lib/
│   │   ├── api.ts      # Cliente HTTP centralizado + tipos TypeScript
│   │   └── format.ts   # formatCurrency (R$ 1.234,56 / (R$ 1.234,56)), formatDate, etc.
│   └── App.tsx         # Navegação lateral
├── server/
│   ├── index.ts        # Entry point Express (serve API + frontend em produção)
│   ├── db.ts           # Conexão SQLite (usa /data/budget.db em produção)
│   ├── migrate.ts      # Cria tabelas automaticamente ao iniciar
│   ├── schema.ts       # Schema Drizzle (tipos TypeScript derivados)
│   └── routes/
│       ├── accounts.ts      # CRUD de contas
│       ├── categories.ts    # CRUD de categorias (árvore tipo > subtipo)
│       └── transactions.ts  # Listagem + categorização + summary mensal
├── Dockerfile          # Build para Railway (Node 20 Alpine + Python/gcc)
└── PROJETO-CONTEXTO.md # Este arquivo
```

### Banco de dados — tabelas
```sql
accounts            -- Contas (banco, cartão, corretora)
categories          -- Categorias hierárquicas (tipo > subtipo)
import_batches      -- Rastreio de cada arquivo importado
transactions        -- Transações (coração do sistema)
categorization_rules -- Regras de categorização automática
```

### Campos importantes de transactions
```
date_transaction  -- Data da compra/evento (competência)
date_settlement   -- Data de liquidação (caixa) 
transaction_type  -- income | expense | cc_payment | internal_transfer
amount            -- Positivo = entrada, negativo = saída
category_id       -- null = sem categoria (normal e esperado)
```

---

## ✅ O Que Já Está Pronto

- [x] Estrutura completa do projeto (frontend + backend)
- [x] Banco de dados SQLite com schema completo
- [x] Tela de Contas (cadastrar banco, cartão, corretora)
- [x] Tela de Categorias (hierarquia tipo > subtipo)
- [x] Tela de Transações (listagem com toggle Caixa/Competência)
- [x] Tela de Dashboard (fluxo mensal por categoria)
- [x] Formatação financeira BR (separador milhar, negativos entre parênteses)
- [x] Deploy no Railway funcionando
- [x] URL pública acessível de qualquer lugar

---

## 🚧 Próximos Passos (Prioridade)

### 1. Módulo de Importação de Extratos (MAIS URGENTE)
Sem isso o sistema não tem dados. Implementar:
- `server/routes/imports.ts` — rota POST /api/imports (upload de arquivo)
- `client/src/pages/ImportsPage.tsx` — tela de importação
- `server/importParsers/` — parsers por banco:
  - `santander.ts` — CSV Santander
  - `safra.ts` — CSV Safra  
  - `contabilizei.ts` — CSV Contabilizei Bank
  - `xp-card.ts` — CSV fatura XP
  - `generic.ts` — CSV genérico configurável
- Lógica de detecção de `cc_payment` no extrato bancário
- Lógica de deduplicação (não importar mesma transação duas vezes)

### 2. Motor de Categorização Automática
- Aplicar regras de `categorization_rules` ao importar
- Tela de gestão de regras (CRUD)
- Sugerir categoria com base em histórico (frequência)

### 3. Volume Persistente no Railway
**IMPORTANTE:** O banco SQLite em produção é apagado a cada novo deploy!
Para corrigir: no Railway Dashboard → seu projeto → "New Volume" → montar em `/data`
Sem isso, os dados de produção se perdem quando o código é atualizado.

### 4. Melhorias de UX
- Tela de importação com preview antes de confirmar
- Filtros avançados na tela de transações
- Exportar para Excel/CSV
- Relatórios mensais comparativos

---

## 🔄 Como Fazer Deploy de Novas Versões

Todo push para o branch `main` do GitHub dispara deploy automático no Railway.

Para fazer push, precisa de um **GitHub Personal Access Token**:
1. Abra https://github.com/settings/tokens/new
2. Note: qualquer nome, Expiration: 7 days, Scope: repo
3. Copie o token (começa com `ghp_...`)
4. Passe para o Claude fazer o push

---

## 💰 Formatação de Números

Seguir **sempre** a preferência do Francisco:
- Separador de milhar: `.` (ponto)
- Números negativos: entre parênteses ex: `(R$ 1.234,56)`
- Positivos: `R$ 1.234,56`
- Função: `formatCurrency()` em `client/src/lib/format.ts`

---

## 📁 Dados de Exemplo Disponíveis

Na pasta `Orçamento Mensal/` há extratos reais em:
- `Extratos/Santander/` — extratos bancários Santander
- `Extratos/Safra/` — extratos Safra
- `Extratos/Banco XP/` — conta XP
- `Extratos/Cartão XP/` — fatura cartão XP
- `Extratos/ContabilizeiBank/` — conta Contabilizei
- `CSV Regras/` — arquivos CSV com regras de categorização do projeto anterior

Estes arquivos são a referência para implementar os parsers de importação.
