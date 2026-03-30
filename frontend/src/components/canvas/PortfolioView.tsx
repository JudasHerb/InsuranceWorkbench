import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { workbenchApi, type CreateSubmissionRequest } from '../../services/api/workbenchApi'
import { usePortfolioStore } from '../../store/portfolioStore'
import { workbenchHub } from '../../services/signalr/workbenchHub'
import type { Submission } from '../../types'

const fmt = (n: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 }).format(n)

export default function PortfolioView() {
  const navigate = useNavigate()
  const { snapshot, filters, setSnapshot, applyPortfolioUpdated, setFilter, setLoading } = usePortfolioStore()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [showNewModal, setShowNewModal] = useState(false)
  const [form, setForm] = useState<CreateSubmissionRequest>({
    insuredName: '', cedant: '', broker: '', lineOfBusiness: '',
    territory: '', coverageType: '', inceptionDate: '', expiryDate: ''
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
      workbenchHub.joinPortfolio()

    const handler = (payload: Parameters<typeof applyPortfolioUpdated>[0]) => applyPortfolioUpdated(payload)
    workbenchHub.onPortfolioUpdated(handler)

    const load = async () => {
      setLoading(true)
      try {
        const [snap, list] = await Promise.all([
          workbenchApi.getPortfolio(filters.territory || filters.lineOfBusiness || filters.status
            ? { territory: filters.territory || undefined, lineOfBusiness: filters.lineOfBusiness || undefined, status: filters.status || undefined }
            : undefined),
          workbenchApi.listSubmissions({ pageSize: 100 })
        ])
        setSnapshot(snap)
        setSubmissions(list.items)
      } catch {
        // ignore
      } finally {
        setLoading(false)
      }
    }
    load()

    return () => {
      workbenchHub.offPortfolioUpdated(handler)
      workbenchHub.leavePortfolio()
    }
  }, [filters.territory, filters.lineOfBusiness, filters.status])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const result = await workbenchApi.createSubmission(form)
      setShowNewModal(false)
      navigate(`/submissions/${(result as { submissionId?: string }).submissionId ?? (result as { id?: string }).id}`)
    } catch {
      // ignore
    } finally {
      setSubmitting(false)
    }
  }

  const statusBadge = (status: string) => {
    const colours: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      'in-review': 'bg-yellow-100 text-yellow-700',
      bound: 'bg-green-100 text-green-700',
      declined: 'bg-red-100 text-red-700',
    }
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colours[status] ?? 'bg-gray-100 text-gray-700'}`}>{status}</span>
  }

  return (
    <div className="p-6 space-y-6">
      {/* KPI strip */}
      {snapshot && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total GWP', value: fmt(snapshot.kpis.totalGWP, snapshot.kpis.currency) },
            { label: 'Aggregate Limit', value: fmt(snapshot.kpis.aggregateLimit, snapshot.kpis.currency) },
            { label: 'Largest Single Risk', value: fmt(snapshot.kpis.largestSingleRisk, snapshot.kpis.currency) },
            { label: 'YTD Loss Ratio', value: `${(snapshot.kpis.ytdLossRatio * 100).toFixed(1)}%` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters + actions row */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="text" placeholder="Territory" value={filters.territory}
          onChange={(e) => setFilter('territory', e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm"
        />
        <input
          type="text" placeholder="Line of Business" value={filters.lineOfBusiness}
          onChange={(e) => setFilter('lineOfBusiness', e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm"
        />
        <select
          value={filters.status} onChange={(e) => setFilter('status', e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="in-review">In Review</option>
          <option value="bound">Bound</option>
          <option value="declined">Declined</option>
        </select>
        <button
          onClick={() => setShowNewModal(true)}
          className="ml-auto bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-1.5 rounded"
        >
          + New Submission
        </button>
      </div>

      {/* Exposure heatmap */}
      {snapshot && snapshot.exposureMatrix.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Exposure Heatmap (Territory × LOB)</h2>
          {(() => {
            const territories = [...new Set(snapshot.exposureMatrix.map((c) => c.territory))]
            const lobs = [...new Set(snapshot.exposureMatrix.map((c) => c.lineOfBusiness))]
            const maxLimit = Math.max(...snapshot.exposureMatrix.map((c) => c.totalLimit), 1)
            return (
              <div className="overflow-auto">
                <table className="text-xs border-collapse">
                  <thead>
                    <tr>
                      <th className="w-24 pr-2 text-left text-gray-500 font-medium pb-1"></th>
                      {lobs.map((lob) => (
                        <th key={lob} className="px-1 pb-1 text-center text-gray-500 font-medium">{lob}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {territories.map((territory) => (
                      <tr key={territory}>
                        <td className="pr-2 py-1 text-gray-600 font-medium">{territory}</td>
                        {lobs.map((lob) => {
                          const cell = snapshot.exposureMatrix.find((c) => c.territory === territory && c.lineOfBusiness === lob)
                          const intensity = cell ? Math.round((cell.totalLimit / maxLimit) * 100) : 0
                          return (
                            <td key={lob} className="px-1 py-1">
                              <div
                                title={cell ? `${cell.submissionCount} submissions · ${fmt(cell.totalLimit, snapshot.kpis.currency)}` : 'No exposure'}
                                style={{ opacity: cell ? 0.2 + (intensity / 100) * 0.8 : 0.05 }}
                                className="w-12 h-8 rounded bg-indigo-500 cursor-default"
                              />
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })()}
        </div>
      )}

      {/* Risk register table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Insured', 'Cedant', 'LOB', 'Territory', 'Status', 'Expiry'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {submissions.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No submissions found</td></tr>
            )}
            {submissions.map((s) => (
              <tr
                key={s.submissionId}
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/submissions/${s.submissionId}`)}
              >
                <td className="px-4 py-3 font-medium text-indigo-600 hover:underline">{s.riskDetails.insuredName}</td>
                <td className="px-4 py-3 text-gray-700">{s.riskDetails.cedant}</td>
                <td className="px-4 py-3 text-gray-700">{s.riskDetails.lineOfBusiness}</td>
                <td className="px-4 py-3 text-gray-700">{s.riskDetails.territory}</td>
                <td className="px-4 py-3">{statusBadge(s.status)}</td>
                <td className="px-4 py-3 text-gray-500">{s.riskDetails.expiryDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New submission modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-semibold mb-4">New Submission</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              {([
                ['insuredName', 'Insured Name'],
                ['cedant', 'Cedant'],
                ['broker', 'Broker'],
                ['lineOfBusiness', 'Line of Business'],
                ['territory', 'Territory'],
                ['coverageType', 'Coverage Type'],
              ] as [keyof CreateSubmissionRequest, string][]).map(([key, label]) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    required
                    value={form[key] as string}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Inception Date</label>
                  <input
                    required type="date" value={form.inceptionDate}
                    onChange={(e) => setForm((f) => ({ ...f, inceptionDate: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                  <input
                    required type="date" value={form.expiryDate}
                    onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value }))}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowNewModal(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded disabled:opacity-50">
                  {submitting ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
