import { useState } from 'react'
import { workbenchApi } from '../../../services/api/workbenchApi'
import { useSubmissionStore } from '../../../store/submissionStore'

export default function RiskSummaryTab() {
  const { currentSubmission, setCurrentSubmission } = useSubmissionStore()
  const [binding, setBinding] = useState(false)
  const [bindError, setBindError] = useState<string | null>(null)
  const [acknowledgedRefer, setAcknowledgedRefer] = useState(false)

  if (!currentSubmission) return null

  const { riskDetails, namesClearance, legalReview, status, submissionId } = currentSubmission

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

  const field = (label: string, value: string) => (
    <div key={label}>
      <dt className="text-xs text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-gray-900">{value || '—'}</dd>
    </div>
  )

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Risk Details</h2>
        <dl className="grid grid-cols-2 gap-4">
          {field('Insured Name', riskDetails.insuredName)}
          {field('Cedant', riskDetails.cedant)}
          {field('Broker', riskDetails.broker)}
          {field('Territory', riskDetails.territory)}
          {field('Line of Business', riskDetails.lineOfBusiness)}
          {field('Coverage Type', riskDetails.coverageType)}
          {field('Inception Date', riskDetails.inceptionDate)}
          {field('Expiry Date', riskDetails.expiryDate)}
        </dl>
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
