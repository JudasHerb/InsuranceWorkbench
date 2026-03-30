import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { workbenchApi, type CreateSubmissionRequest } from '../../services/api/workbenchApi'
import { usePortfolioStore } from '../../store/portfolioStore'
import { workbenchHub } from '../../services/signalr/workbenchHub'
import type { Submission } from '../../types'
import {
  EUROPEAN_TERRITORIES,
  LINES_OF_BUSINESS,
  COVERAGE_BY_LOB,
  type LineOfBusiness,
} from '../shared/referenceData'

const fmt = (n: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 }).format(n)

const EMPTY_FORM: CreateSubmissionRequest = {
  insuredName: '',
  broker: '',
  lineOfBusiness: '',
  territory: '',
  coverageTypes: [],
  inceptionDate: '',
  expiryDate: '',
}

export default function PortfolioView() {
  const navigate = useNavigate()
  const { snapshot, filters, setSnapshot, applyPortfolioUpdated, setFilter, setLoading } = usePortfolioStore()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [showNewModal, setShowNewModal] = useState(false)
  const [form, setForm] = useState<CreateSubmissionRequest>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const expiryManuallySet = useRef(false)

  useEffect(() => {
    workbenchHub.joinPortfolio()

    const handler = (payload: Parameters<typeof applyPortfolioUpdated>[0]) => applyPortfolioUpdated(payload)
    workbenchHub.onPortfolioUpdated(handler)

    const load = async () => {
      setLoading(true)
      try {
        const [snap, list] = await Promise.all([
          workbenchApi.getPortfolio(
            filters.territory || filters.lineOfBusiness || filters.status
              ? { territory: filters.territory || undefined, lineOfBusiness: filters.lineOfBusiness || undefined, status: filters.status || undefined }
              : undefined,
          ),
          workbenchApi.listSubmissions({ pageSize: 100 }),
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

  const openModal = () => {
    setForm(EMPTY_FORM)
    expiryManuallySet.current = false
    setShowNewModal(true)
  }

  const handleInceptionChange = (value: string) => {
    setForm((f) => {
      const next: CreateSubmissionRequest = { ...f, inceptionDate: value }
      if (value && !expiryManuallySet.current) {
        const d = new Date(value)
        d.setFullYear(d.getFullYear() + 1)
        next.expiryDate = d.toISOString().slice(0, 10)
      }
      return next
    })
  }

  const handleLobChange = (lob: string) => {
    setForm((f) => ({ ...f, lineOfBusiness: lob, coverageTypes: [] }))
  }

  const toggleCoverage = (coverage: string) => {
    setForm((f) => {
      const already = f.coverageTypes.includes(coverage)
      return {
        ...f,
        coverageTypes: already
          ? f.coverageTypes.filter((c) => c !== coverage)
          : [...f.coverageTypes, coverage],
      }
    })
  }

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

  const availableCoverages = form.lineOfBusiness
    ? (COVERAGE_BY_LOB[form.lineOfBusiness as LineOfBusiness] ?? [])
    : []

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
        <select
          value={filters.territory}
          onChange={(e) => setFilter('territory', e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm"
        >
          <option value="">All territories</option>
          {EUROPEAN_TERRITORIES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={filters.lineOfBusiness}
          onChange={(e) => setFilter('lineOfBusiness', e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm"
        >
          <option value="">All lines</option>
          {LINES_OF_BUSINESS.map((lob) => (
            <option key={lob} value={lob}>{lob}</option>
          ))}
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilter('status', e.target.value)}
          className="border border-gray-300 rounded px-3 py-1.5 text-sm"
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="in-review">In Review</option>
          <option value="bound">Bound</option>
          <option value="declined">Declined</option>
        </select>
        <button
          onClick={openModal}
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
                <td className="px-4 py-3 text-gray-700">{s.riskDetails.cedant ?? '—'}</td>
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
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">New Submission</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              {/* Insured Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Insured Name</label>
                <input
                  required
                  value={form.insuredName}
                  onChange={(e) => setForm((f) => ({ ...f, insuredName: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>

              {/* Broker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Broker</label>
                <input
                  required
                  value={form.broker}
                  onChange={(e) => setForm((f) => ({ ...f, broker: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                />
              </div>

              {/* Territory */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Territory</label>
                <select
                  required
                  value={form.territory}
                  onChange={(e) => setForm((f) => ({ ...f, territory: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  <option value="">Select territory…</option>
                  {EUROPEAN_TERRITORIES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Line of Business */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Line of Business</label>
                <select
                  required
                  value={form.lineOfBusiness}
                  onChange={(e) => handleLobChange(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                >
                  <option value="">Select line of business…</option>
                  {LINES_OF_BUSINESS.map((lob) => (
                    <option key={lob} value={lob}>{lob}</option>
                  ))}
                </select>
              </div>

              {/* Coverage Types */}
              {availableCoverages.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Coverage Types <span className="text-gray-400 font-normal">(select all that apply)</span>
                  </label>
                  <div className="border border-gray-300 rounded p-2 space-y-1 max-h-40 overflow-y-auto">
                    {availableCoverages.map((cov) => (
                      <label key={cov} className="flex items-center gap-2 cursor-pointer text-sm hover:bg-gray-50 px-1 py-0.5 rounded">
                        <input
                          type="checkbox"
                          checked={form.coverageTypes.includes(cov)}
                          onChange={() => toggleCoverage(cov)}
                          className="rounded"
                        />
                        {cov}
                      </label>
                    ))}
                  </div>
                  {form.coverageTypes.length === 0 && (
                    <p className="text-xs text-red-500 mt-1">Select at least one coverage type</p>
                  )}
                </div>
              )}

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Inception Date</label>
                  <input
                    required
                    type="date"
                    value={form.inceptionDate}
                    onChange={(e) => handleInceptionChange(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                  <input
                    required
                    type="date"
                    value={form.expiryDate}
                    onChange={(e) => {
                      expiryManuallySet.current = true
                      setForm((f) => ({ ...f, expiryDate: e.target.value }))
                    }}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || form.coverageTypes.length === 0}
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded disabled:opacity-50"
                >
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
