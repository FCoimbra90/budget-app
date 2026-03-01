/**
 * Tipos compartilhados para todos os parsers de importação
 */

export type SourceType = 'bank_statement' | 'credit_card_bill'

export interface ParserTransaction {
  date: string // YYYY-MM-DD (data de movimentação / compra)
  description: string
  amount: number // positivo = entrada, negativo = saída
  datePurchase?: string // YYYY-MM-DD (apenas para cartão de crédito — data da compra)
}

export interface ParserResult {
  transactions: ParserTransaction[]
  bankName: string // ex: "Santander", "XP", "Safra"
  accountType: 'bank' | 'credit_card'
  sourceType: SourceType
  errors: string[] // erros encontrados durante parsing
}

export interface ParserInterface {
  /**
   * Detecta se este parser consegue processar o CSV baseado na estrutura
   */
  canParse(csvText: string): boolean

  /**
   * Faz o parsing do CSV e retorna transações normalizadas
   */
  parse(csvText: string): ParserResult
}
