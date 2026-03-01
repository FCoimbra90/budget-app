import Papa from 'papaparse'
import { ParserInterface, ParserResult, ParserTransaction } from './types.js'

interface SantanderRow {
  data?: string | number
  'Data Movimento'?: string
  'Data movimentação'?: string
  descricao?: string
  'Descrição'?: string
  'Descrição da Operação'?: string
  valor?: string | number
  'Valor'?: string | number
  'Débito'?: string | number
  'Crédito'?: string | number
  'Saldo'?: string | number
  [key: string]: any
}

export class SantanderParser implements ParserInterface {
  canParse(csvText: string): boolean {
    // Detecta se é CSV Santander procurando por padrões específicos
    const lowerText = csvText.toLowerCase()
    return (
      lowerText.includes('santander') ||
      lowerText.includes('data mov') ||
      lowerText.includes('débito') ||
      lowerText.includes('crédito') ||
      (lowerText.includes('descrição') && lowerText.includes('valor'))
    )
  }

  parse(csvText: string): ParserResult {
    const errors: ParserTransaction[] = []
    const transactions: ParserTransaction[] = []

    try {
      // Parse CSV com PapaParse
      const result = Papa.parse<SantanderRow>(csvText, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        encoding: 'UTF-8',
      })

      if (result.errors.length > 0) {
        return {
          transactions: [],
          bankName: 'Santander',
          accountType: 'bank',
          sourceType: 'bank_statement',
          errors: result.errors.map(e => `CSV Parse error: ${e.message}`),
        }
      }

      // Processa cada linha
      for (const row of result.data) {
        if (!row || Object.keys(row).length === 0) continue

        try {
          const tx = this.parseRow(row)
          if (tx) {
            transactions.push(tx)
          }
        } catch (e) {
          // Registra erro mas continua processando outras linhas
        }
      }

      return {
        transactions,
        bankName: 'Santander',
        accountType: 'bank',
        sourceType: 'bank_statement',
        errors: [],
      }
    } catch (e) {
      return {
        transactions: [],
        bankName: 'Santander',
        accountType: 'bank',
        sourceType: 'bank_statement',
        errors: [`Parsing error: ${String(e)}`],
      }
    }
  }

  private parseRow(row: SantanderRow): ParserTransaction | null {
    // Extrai data (tenta vários nomes de coluna)
    const dataStr = (
      row['Data Movimento'] ||
      row['Data movimentação'] ||
      row.data ||
      ''
    )
      ?.toString()
      .trim()

    if (!dataStr) return null

    // Descrição
    const descricao = (
      row['Descrição da Operação'] ||
      row['Descrição'] ||
      row.descricao ||
      ''
    )
      ?.toString()
      .trim()
      .toUpperCase()

    if (!descricao) return null

    // Converte data DD/MM/YYYY → YYYY-MM-DD
    const dateParts = dataStr.split('/')
    if (dateParts.length !== 3) return null
    const date = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`

    // Extrai valor (tenta múltiplas colunas — débito/crédito ou valor único)
    let amount = 0

    const debito = this.parseAmount(row['Débito'])
    const credito = this.parseAmount(row['Crédito'])

    if (debito !== null && debito !== 0) {
      amount = -debito // Débito = saída (negativo)
    } else if (credito !== null && credito !== 0) {
      amount = credito // Crédito = entrada (positivo)
    } else {
      // Tenta coluna de valor único
      const valor = this.parseAmount(row['Valor'] || row.valor)
      if (valor === null) return null
      amount = valor
    }

    if (amount === 0) return null

    return {
      date,
      description: descricao,
      amount,
    }
  }

  private parseAmount(value: any): number | null {
    if (value === null || value === undefined || value === '') return null

    let str = value.toString().trim()
    if (!str) return null

    // Remove espaços
    str = str.replace(/\s+/g, '')

    // Detecta formato brasileiro (. como milhar, , como decimal)
    // vs formato internacional (, como milhar, . como decimal)
    let num: number

    if (str.includes('.') && str.includes(',')) {
      // Tem ambos — detecta qual é milhar
      if (str.lastIndexOf('.') > str.lastIndexOf(',')) {
        // Último é ponto → . é decimal (internacional)
        num = parseFloat(str.replace(/,/g, ''))
      } else {
        // Último é vírgula → , é decimal (brasileiro)
        num = parseFloat(str.replace(/\./g, '').replace(',', '.'))
      }
    } else if (str.includes(',')) {
      // Só vírgula → é decimal (brasileiro)
      num = parseFloat(str.replace(/\./g, '').replace(',', '.'))
    } else if (str.includes('.')) {
      // Só ponto → pode ser milhar ou decimal
      const parts = str.split('.')
      if (parts[parts.length - 1].length === 2) {
        // Último parte tem 2 dígitos → é decimal
        num = parseFloat(str)
      } else {
        // Último parte tem 3+ dígitos → é milhar
        num = parseFloat(str.replace(/\./g, ''))
      }
    } else {
      // Só dígitos
      num = parseFloat(str)
    }

    return isNaN(num) ? null : num
  }
}
