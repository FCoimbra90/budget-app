import { useState, useEffect } from 'react'
import { api, Account, ImportBatch } from '../lib/api'
import { formatDate, formatCurrency } from '../lib/format'
import { Trash2, Upload, AlertCircle, CheckCircle, XCircle } from 'lucide-react'

export default function ImportsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [importBatches, setImportBatches] = useState<ImportBatch[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastImport, setLastImport] = useState<{
    success: boolean
    batchId?: number
    bankName?: string
    transactionsImported?: number
    duplicatesSkipped?: number
    errors?: string[]
  } | null>(null)

  // Load accounts on mount
  useEffect(() => {
    loadAccounts()
    loadImports()
  }, [])

  async function loadAccounts() {
    try {
      const data = await api.accounts.list()
      setAccounts(data.filter((a) => a.active))
    } catch (err) {
      console.error('Erro ao carregar contas:', err)
    }
  }

  async function loadImports() {
    try {
      const data = await api.imports.list()
      setImportBatches(data)
    } catch (err) {
      console.error('Erro ao carregar histórico:', err)
    }
  }

  async function handleUpload() {
    if (!selectedFile || !selectedAccountId) {
      alert('Por favor selecione um arquivo e uma conta')
      return
    }

    setIsLoading(true)
    setLastImport(null)

    try {
      const result = await api.imports.upload(selectedFile, selectedAccountId)

      setLastImport({
        success: true,
        batchId: result.batchId,
        bankName: result.bankName,
        transactionsImported: result.transactionsImported,
        duplicatesSkipped: result.duplicatesSkipped,
        errors: result.errors,
      })

      setSelectedFile(null)
      loadImports()
    } catch (err) {
      setLastImport({
        success: false,
        errors: [String(err)],
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleUndo(batchId: number) {
    if (!confirm('Tem certeza que deseja desfazer esta importação?')) {
      return
    }

    try {
      await api.imports.undo(batchId)
      loadImports()
      setLastImport({
        success: true,
        bankName: 'Operação',
        transactionsImported: 0,
      })
    } catch (err) {
      alert('Erro ao desfazer: ' + String(err))
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Importar Transações</h1>
        <p className="text-gray-600 mt-2">Importe extratos bancários em formato CSV</p>
      </div>

      {/* Upload Card */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">Nova Importação</h2>

        <div className="space-y-4">
          {/* Account Select */}
          <div>
            <label className="block text-sm font-medium mb-2">Conta</label>
            <select
              value={selectedAccountId || ''}
              onChange={(e) => setSelectedAccountId(Number(e.target.value))}
              className="input"
            >
              <option value="">Selecione uma conta...</option>
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.institution})
                </option>
              ))}
            </select>
          </div>

          {/* File Input */}
          <div>
            <label className="block text-sm font-medium mb-2">Arquivo CSV</label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="input"
            />
            {selectedFile && <p className="text-sm text-gray-600 mt-1">✓ {selectedFile.name}</p>}
          </div>

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={isLoading || !selectedFile || !selectedAccountId}
            className="btn btn-primary w-full flex items-center justify-center gap-2"
          >
            <Upload size={18} />
            {isLoading ? 'Importando...' : 'Importar'}
          </button>
        </div>
      </div>

      {/* Result Summary */}
      {lastImport && (
        <div
          className={`p-4 rounded-lg border ${
            lastImport.success
              ? 'bg-green-50 border-green-200'
              : 'bg-red-50 border-red-200'
          }`}
        >
          <div className="flex gap-3">
            {lastImport.success ? (
              <CheckCircle size={24} className="text-green-600 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle size={24} className="text-red-600 flex-shrink-0 mt-0.5" />
            )}
            <div>
              {lastImport.success ? (
                <>
                  <h3 className="font-semibold text-green-900">Importação concluída!</h3>
                  <p className="text-green-800 text-sm mt-1">
                    ✓ {lastImport.transactionsImported} transações importadas do {lastImport.bankName}
                  </p>
                  {lastImport.duplicatesSkipped ? (
                    <p className="text-green-800 text-sm">
                      ⚠ {lastImport.duplicatesSkipped} duplicadas puladas
                    </p>
                  ) : null}
                  {lastImport.errors?.length ? (
                    <div className="text-yellow-800 text-sm mt-2">
                      {lastImport.errors.map((err, i) => (
                        <p key={i}>⚠ {err}</p>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                <>
                  <h3 className="font-semibold text-red-900">Erro na importação</h3>
                  <div className="text-red-800 text-sm mt-1">
                    {lastImport.errors?.map((err, i) => (
                      <p key={i}>{err}</p>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Import History */}
      <div className="card p-6">
        <h2 className="text-xl font-semibold mb-4">Histórico de Importações</h2>

        {importBatches.length === 0 ? (
          <p className="text-gray-600 text-center py-8">Nenhuma importação realizada ainda</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Data</th>
                  <th className="px-4 py-3 text-left font-semibold">Banco</th>
                  <th className="px-4 py-3 text-left font-semibold">Tipo</th>
                  <th className="px-4 py-3 text-right font-semibold">Transações</th>
                  <th className="px-4 py-3 text-center font-semibold">Ação</th>
                </tr>
              </thead>
              <tbody>
                {importBatches.map((batch) => (
                  <tr key={batch.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">{formatDate(batch.importedAt)}</td>
                    <td className="px-4 py-3 font-medium">{batch.bankName}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                        {batch.sourceType === 'bank_statement' ? 'Extrato' : 'Fatura CC'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">{batch.transactionCount}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleUndo(batch.id)}
                        className="text-red-600 hover:text-red-800 inline-flex items-center gap-1 text-xs"
                      >
                        <Trash2 size={16} />
                        Desfazer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="card p-6 bg-blue-50 border border-blue-200">
        <div className="flex gap-3">
          <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <h3 className="font-semibold mb-2">Bancos Suportados</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Santander (extrato de conta corrente)</li>
              <li>Safra (extrato de conta)</li>
              <li>Contabilizei (extrato bancário)</li>
              <li>XP Investimentos (extrato de conta)</li>
              <li>Cartão XP (fatura de cartão de crédito)</li>
            </ul>
            <p className="mt-3">
              O sistema detecta automaticamente o banco baseado na estrutura do CSV. Duplicatas são
              automaticamente puladas.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
