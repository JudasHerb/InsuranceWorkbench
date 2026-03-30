import { useRef, useState } from 'react'
import { workbenchApi } from '../../../services/api/workbenchApi'
import { useSubmissionStore } from '../../../store/submissionStore'
import {
  EUROPEAN_TERRITORIES,
  LINES_OF_BUSINESS,
  COVERAGE_BY_LOB,
  type LineOfBusiness,
} from '../../shared/referenceData'

export default function RiskSummaryTab() {
  const { currentSubmission, setCurrentSubmission } = useSubmissionStore()
  const [binding, setBinding] = useState(false)
  const [bindError, setBindError] = useState<string | null>(null)
  const [acknowledgedRefer, setAcknowledgedRefer] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState<{
    insuredName: string
    cedant: string
    broker: string
    territory: string
    lineOfBusiness: string
    coverageTypes: string[]
    inceptionDate: string
    expiryDate: string
  } | null>(null)
  const expiryManuallySet = useRef(false)

  if (!currentSubmission) return null

  const { riskDetails, namesClearance, legalReview, status, submissionId } = currentSubmission

  const openEdit = () => {
    expiryManuallySet.current = false
    setEditForm({
      insuredName: riskDetails.insuredName,
      cedant: riskDetails.cedant ?? '',
      broker: riskDetails.broker,
      territory: riskDetails.territory,
      lineOfBusiness: riskDetails.lineOfBusiness,
      coverageTypes: riskDetails.coverageTypes,
      inceptionDate: riskDetails.inceptionDate,
      expiryDate: riskDetails.expiryDate,
    })
    setEditing(true)
  }

  const handleInceptionChange = (value: string) => {
    if (!editForm) return
    const next = { ...editForm, inceptionDate: value }
    if (value && !expiryManuallySet.current) {
      const d = new Date(value)
      d.setFullYear(d.getFullYear() + 1)
      next.expiryDate = d.toISOString().slice(0, 10)
    }
    setEditForm(next)
  }

  const handleLobChange = (lob: string) => {
    setEditForm((f) => f ? { ...f, lineOfBusiness: lob, coverageTypes: [] } : f)
  }

  const toggleCoverage = (cov: string) => {
    setEditForm((f) => {
      if (!f) return f
      const already = f.coverageTypes.includes(cov)
      return { ...f, coverageTypes: already ? f.coverageTypes.filter((c) => c !== cov) : [...f.coverageTypes, cov] }
    })
  }

  const handleSave = async () => {
    if (!editForm) return
    setSaving(true)
    try {
      const updated = await workbenchApi.updateSubmission(submissionId, {
        riskDetails: {
          insuredName: editForm.insuredName,
          cedant: editForm.cedant || null,
          broker: editForm.broker,
          territory: editForm.territory,
          lineOfBusiness: editForm.lineOfBusiness,
          coverageTypes: editForm.coverageTypes,
          inceptionDate: editForm.inceptionDate,
          expiryDate: editForm.expiryDate,
        } as never,
      })
      setCurrentSubmission(updated)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const clearanceBadge = () => {
    if (namesClearance.status === 'blocked')
      return <span className="px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-700">BLOCKED</span>
    if (namesClearance.status === 'refer')
      return <span className="px-2 py-1 rounded text-xs font-semibold bg-yellow-100 text-yellow-700">REFER</span>
    if (namesClearance.status === 'clear')
      return <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-700">CLEAR</span>
    return <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-500">PENDING</span>
  }

  const canBind =
    status !== 'bound' &&
    namesClearance.status !== 'blocked' &&
    legalReview.recommendation !== null &&
    legalReview.recommendation !== 'escalate' &&
    (namesClearance.status !== 'refer' || acknowledgedRefer)

  const handleBind = async () => {
    setBindError(null)
    setBinding(true)
    try {
      await workbenchApi.bindSubmission(submissionId)
      const updated = await workbenchApi.getSubmission(submissionId)
      setCurrentSubmission(updated)
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { reason?: string } } }).response?.data
      setBindError(data?.reason ?? 'Bind failed')
    } finally {
      setBinding(false)
    }
  }

  const field = (label: string, value: string | null | undefined) => (
    <div key={label}>
      <dt className="text-xs text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-gray-900">{value || '—'}</dd>
    </div>
  )

  const availableCoverages = editForm?.lineOfBusiness
    ? (COVERAGE_BY_LOB[editForm.lineOfBusiness as LineOfBusiness] ?? [])
    : []

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Risk Details</h2>
          {status !== 'bound' && !editing && (
            <button
              onClick={openEdit}
              className="text-xs px-3 py-1.5 border border-gray-300 rounded text-gray-600 hover:bg-gray-50"
            >
              Edit
            </button>
          )}
        </div>

        {editing && editForm ? (
          <div className="space-y-3">
            {/* Insured Name */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Insured Name</label>
              <input
                value={editForm.insuredName}
                onChange={(e) => setEditForm((f) => f ? { ...f, insuredName: e.target.value } : f)}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
              />
            </div>

            {/* Cedant */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Cedant</label>
              <input
                value={editForm.cedant}
                onChange={(e) => setEditForm((f) => f ? { ...f, cedant: e.target.value } : f)}
                placeholder="Leave blank if not yet assigned"
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
              />
              <p className="text-xs text-gray-400 mt-0.5">Changing the cedant will trigger a new names clearance run.</p>
            </div>

            {/* Broker */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Broker</label>
              <input
                value={editForm.broker}
                onChange={(e) => setEditForm((f) => f ? { ...f, broker: e.target.value } : f)}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
              />
            </div>

            {/* Territory */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Territory</label>
              <select
                value={editForm.territory}
                onChange={(e) => setEditForm((f) => f ? { ...f, territory: e.target.value } : f)}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
              >
                <option value="">Select territory…</option>
                {EUROPEAN_TERRITORIES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Line of Business */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Line of Business</label>
              <select
                value={editForm.lineOfBusiness}
                onChange={(e) => handleLobChange(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
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
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Coverage Types</label>
                <div className="border border-gray-300 rounded p-2 space-y-1 max-h-40 overflow-y-auto">
                  {availableCoverages.map((cov) => (
                    <label key={cov} className="flex items-center gap-2 cursor-pointer text-sm hover:bg-gray-50 px-1 py-0.5 rounded">
                      <input
                        type="checkbox"
                        checked={editForm.coverageTypes.includes(cov)}
                        onChange={() => toggleCoverage(cov)}
                        className="rounded"
                      />
                      {cov}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Inception Date</label>
                <input
                  type="date"
                  value={editForm.inceptionDate}
                  onChange={(e) => handleInceptionChange(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wide mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={editForm.expiryDate}
                  onChange={(e) => {
                    expiryManuallySet.current = true
                    setEditForm((f) => f ? { ...f, expiryDate: e.target.value } : f)
                  }}
                  className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="px-4 py-1.5 text-sm border border-gray-300 rounded text-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <dl className="grid grid-cols-2 gap-4">
            {field('Insured Name', riskDetails.insuredName)}
            {field('Cedant', riskDetails.cedant)}
            {field('Broker', riskDetails.broker)}
            {field('Territory', riskDetails.territory)}
            {field('Line of Business', riskDetails.lineOfBusiness)}
            <div>
              <dt className="text-xs text-gray-500 uppercase tracking-wide">Coverage Types</dt>
              <dd className="mt-0.5 text-sm font-medium text-gray-900">
                {riskDetails.coverageTypes?.length
                  ? riskDetails.coverageTypes.join(', ')
                  : '—'}
              </dd>
            </div>
            {field('Inception Date', riskDetails.inceptionDate)}
            {field('Expiry Date', riskDetails.expiryDate)}
          </dl>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
        <h2 className="text-base font-semibold text-gray-900">Names Clearance</h2>
        <div className="flex items-center gap-3">
          {clearanceBadge()}
          <span className="text-sm text-gray-500">
            {namesClearance.completedAt
              ? `Completed ${new Date(namesClearance.completedAt).toLocaleString()}`
              : 'In progress…'}
          </span>
        </div>
        {namesClearance.status === 'blocked' && (
          <p className="text-sm text-red-600">Names clearance blocked — submission cannot be bound.</p>
        )}
        {namesClearance.status === 'refer' && !acknowledgedRefer && (
          <div className="flex items-center gap-3">
            <p className="text-sm text-yellow-700">One or more names require manual review.</p>
            <button
              onClick={() => setAcknowledgedRefer(true)}
              className="text-xs px-3 py-1.5 border border-yellow-400 rounded text-yellow-700 hover:bg-yellow-50"
            >
              Acknowledge
            </button>
          </div>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-3">
        <h2 className="text-base font-semibold text-gray-900">Legal Review</h2>
        {legalReview.recommendation ? (
          <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
            legalReview.recommendation === 'approve' ? 'bg-green-100 text-green-700' :
            legalReview.recommendation === 'amend' ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          }`}>
            {legalReview.recommendation.toUpperCase()}
          </span>
        ) : (
          <span className="text-sm text-gray-400">No legal review yet</span>
        )}
      </div>

      {status === 'bound' ? (
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded font-medium text-sm">Bound</span>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            disabled={!canBind || binding}
            onClick={handleBind}
            className="px-5 py-2 bg-indigo-600 text-white text-sm rounded font-medium disabled:opacity-40 hover:bg-indigo-700"
          >
            {binding ? 'Binding…' : 'Bind Submission'}
          </button>
          {bindError && <p className="text-sm text-red-600">{bindError}</p>}
        </div>
      )}
    </div>
  )
}
