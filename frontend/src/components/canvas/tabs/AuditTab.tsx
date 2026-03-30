import { useSubmissionStore } from '../../../store/submissionStore'

export default function AuditTab() {
  const { currentSubmission } = useSubmissionStore()

  if (!currentSubmission) return null

  const entries = [...currentSubmission.auditLog].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  const actorColour = (type: string) =>
    type === 'agent' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'

  return (
    <div className="space-y-0 max-w-2xl">
      {entries.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">No audit entries yet</p>
      )}
      <ol className="relative border-l border-gray-200 space-y-0 ml-3">
        {entries.map((entry) => (
          <li key={entry.entryId} className="mb-6 ml-4">
            <span className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full border-2 border-white bg-indigo-400" />
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${actorColour(entry.actor.type)}`}>
                {entry.actor.displayName}
              </span>
              <span className="text-xs text-gray-500 font-mono">{entry.action}</span>
              <time className="ml-auto text-xs text-gray-400">
                {new Date(entry.timestamp).toLocaleString()}
              </time>
            </div>
            <p className="text-sm text-gray-700">{entry.summary}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}
