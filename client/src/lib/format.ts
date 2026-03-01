// Formatação monetária brasileira: R$ 1.234,56 / (R$ 1.234,56)
export function formatCurrency(value: number): string {
  const abs = Math.abs(value)
  const formatted = abs.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return value < 0 ? `(R$ ${formatted})` : `R$ ${formatted}`
}

// Formatação de data
export function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

// Mês por extenso
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
export function formatMonth(month: number, year: number): string {
  return `${MONTHS[month - 1]} ${year}`
}

// Label do tipo de conta
export function accountTypeLabel(type: string): string {
  return { bank: 'Banco', credit_card: 'Cartão de Crédito', brokerage: 'Corretora' }[type] ?? type
}

// Label do tipo de transação
export function transactionTypeLabel(type: string): string {
  return {
    income: 'Entrada',
    expense: 'Saída',
    cc_payment: 'Pagamento Fatura',
    internal_transfer: 'Transferência Interna',
  }[type] ?? type
}
