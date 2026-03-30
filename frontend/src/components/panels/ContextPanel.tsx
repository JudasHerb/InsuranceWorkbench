import { useSubmissionStore } from '../../store/submissionStore'

export default function ContextPanel() {
  const { currentSubmission } = useSubmissionStore()

  if (!currentSubmission) return null

  const { riskDetails, namesClearance, legalReview, layers, status } = currentSubmission

  const clearanceBadge = () => {
    const colours: Record<string, string> = {
      clear: 'bg-green-100 text-green-700',
      refer: 'bg-yellow-100 text-yellow-700',
      blocked: 'bg-red-100 text-red-700',
      pending: 'bg-gray-100 text-gray-500',
    }
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium ${colours[namesClearance.status] ?? 'bg-gray-100 text-gray-500'}`}>
        {namesClearance.status}
      </span>
    )
  }

  const statusBadge = () => {
    const colours: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      'in-review': 'bg-yellow-100 text-yellow-700',
      bound: 'bg-green-100 text-green-700',
      declined: 'bg-red-100 text-red-700',
    }
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${colours[status] ?? 'bg-gray-100 text-gray-700'}`}>
        {status}
      </span>
    )
  }

  const row = (label: string, value: React.ReactNode) => (
    <div key={label} className="flex flex-col gap-0.5">
      <span className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</span>
      <span className="text-xs font-medium text-gray-800">{value}</span>
    </div>
  )

  return (
    <div className="p-4 space-y-4 text-sm">
      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Submission</h2>
        <div className="space-y-2">
          {row('Status', statusBadge())}
          {row('Insured', riskDetails.insuredName)}
          {row('Territory', riskDetails.territory)}
          {row('LOB', riskDetails.lineOfBusiness)}
          {row('Coverage', riskDetails.coverageTypes?.join(', '))}
          {row('Inception', riskDetails.inceptionDate)}
          {row('Expiry', riskDetails.expiryDate)}
        </div>
      </div>

      <hr className="border-gray-100" />

      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Names Clearance</h2>
        {clearanceBadge()}
      </div>

      <hr className="border-gray-100" />

      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Legal Review</h2>
        {legalReview.recommendation ? (
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
            legalReview.recommendation === 'approve' ? 'bg-green-100 text-green-700' :
            legalReview.recommendation === 'amend' ? 'bg-yellow-100 text-yellow-700' :
            'bg-red-100 text-red-700'
          }`}>
            {legalReview.recommendation}
          </span>
        ) : (
          <span className="text-xs text-gray-400">Not reviewed</span>
        )}
      </div>

      <hr className="border-gray-100" />

      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Layers</h2>
        <span className="text-xs text-gray-800">{layers.length} layer{layers.length !== 1 ? 's' : ''}</span>
        {layers.length > 0 && (
          <div className="mt-1 text-xs text-gray-500">
            Total exposure: {layers.reduce((s, l) => s + l.lineSize, 0).toLocaleString()} {layers[0]?.currency}
          </div>
        )}
      </div>
    </div>
  )
}
