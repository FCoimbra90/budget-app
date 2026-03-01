import Papa from 'papaparse'
import { ParserInterface, ParserResult, ParserTransaction } from './types.js'

export class SafraParser implements ParserInterface {
  canParse(csvText: string): boolean {
    const lower = csvText.toLowerCase()
    return lower.includes('safra') || (lower.includes('data') && lower.includes('operação'))
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

      return { transactions, bankName: 'Safra', accountType: 'bank', sourceType: 'bank_statement', errors: [] }
    } catch (e) {
      return { transactions: [], bankName: 'Safra', accountType: 'bank', sourceType: 'bank_statement', errors: [String(e)] }
    }
  }

  private parseRow(row: any): ParserTransaction | null {
    const date = this.parseDate(row['Data Operação'] || row['Data movimentação'] || row.Data)
    if (!date) return null
    const desc = (row['Descrição da Operação'] || row.Descrição || '').toString().trim().toUpperCase()
    if (!desc) return null
    const amount = this.parseAmount(row['Valor da Operação'] || row.Valor)
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
