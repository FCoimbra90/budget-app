import Papa from 'papaparse'
import { ParserInterface, ParserResult, ParserTransaction } from './types.js'

export class XPBankParser implements ParserInterface {
  canParse(csvText: string): boolean {
    const lower = csvText.toLowerCase()
    return lower.includes('xp') || (lower.includes('extrato') && lower.includes('2025'))
  }

  parse(csvText: string): ParserResult {
    const transactions: ParserTransaction[] = []
    try {
      const result = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
      })

      for (const row of result.data as any[]) {
        if (!row) continue
        try {
          const tx = this.parseRow(row)
          if (tx) transactions.push(tx)
        } catch {}
      }

      return { transactions, bankName: 'XP Investimentos', accountType: 'bank', sourceType: 'bank_statement', errors: [] }
    } catch (e) {
      return { transactions: [], bankName: 'XP', accountType: 'bank', sourceType: 'bank_statement', errors: [String(e)] }
    }
  }

  private parseRow(row: any): ParserTransaction | null {
    const date = this.parseDate(row.Data || row.data)
    if (!date) return null
    const desc = (row.Descricao || row.descricao || row.Descrição || '').toString().trim().toUpperCase()
    if (!desc) return null
    const amount = this.parseAmount(row.Valor || row.valor)
    if (amount === null) return null
    return { date, description: desc, amount }
  }

  private parseDate(value: any): string | null {
    if (!value) return null
    const str = value.toString().trim()
    const parts = str.split('/')
    if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`
    return null
  }

  private parseAmount(value: any): number | null {
    if (!value) return null
    let str = value.toString().trim().replace(/\s+/g, '')
    str = str.replace(/[R$\s]/g, '')
    str = str.replace(/\./g, '').replace(',', '.')
    const num = parseFloat(str)
    return isNaN(num) ? null : num
  }
}
