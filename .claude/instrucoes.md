# Instruções para o Claude — Budget App

## Ao iniciar uma nova sessão:
1. Leia PROJETO-CONTEXTO.md primeiro
2. Verifique o estado atual das pastas client/src/pages e server/routes
3. Pergunte ao Francisco o que quer trabalhar hoje

## Regras de desenvolvimento:
- Formatação: sempre usar formatCurrency() de lib/format.ts
- Números negativos entre parênteses: (R$ 1.234,56)
- Separador de milhar com ponto: R$ 1.234,56
- Francisco não usa terminal — para fazer deploy, pedir token GitHub e fazer push pelo Claude
- Após cada mudança significativa: commit + push para Railway fazer deploy automático

## Repositório: https://github.com/FCoimbra90/budget-app
## App online: https://web-production-22a7d.up.railway.app
