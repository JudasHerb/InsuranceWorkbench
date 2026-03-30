import { useSubmissionStore } from '../../store/submissionStore'

export default function AgentPanel() {
  const { agentTasks, streamingChunks } = useSubmissionStore()

  const legalTask = [...agentTasks]
    .filter((t) => t.agentType === 'legal')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]

  const statusIcon = (status: string) => {
    if (status === 'complete') return '✓'
    if (status === 'running') return '⟳'
    if (status === 'failed') return '✗'
    return '○'
  }

  const statusColour = (status: string) => {
    if (status === 'complete') return 'text-green-600'
    if (status === 'running') return 'text-blue-600'
    if (status === 'failed') return 'text-red-600'
    return 'text-gray-400'
  }

  if (!legalTask) {
    return (
      <div className="p-4 h-full flex flex-col">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Agent Output</h2>
        <p className="text-xs text-gray-400">No agent tasks yet. Dispatch a legal review from the Agents tab.</p>
      </div>
    )
  }

  const streaming = streamingChunks[legalTask.id] ?? ''
  const output = legalTask.output as Record<string, unknown>
  const flags = output?.flags as Array<{ clause: string; clauseLocation: string; severity: string; note: string }> ?? []
  const summary = output?.summary as string | undefined
  const recommendation = output?.recommendation as string | undefined

  return (
    <div className="p-4 h-full flex flex-col overflow-hidden">
      <h2 className="text-sm font-semibold text-gray-700 mb-3">Legal Review</h2>

      {/* Sub-task progress */}
      {legalTask.subTasks.length > 0 && (
        <div className="mb-4 space-y-1.5">
          {legalTask.subTasks.map((st) => (
            <div key={st.subTaskId} className="flex items-center gap-2 text-xs">
              <span className={`font-mono ${statusColour(st.status)}`}>{statusIcon(st.status)}</span>
              <span className="text-gray-600 capitalize">{st.name.replace(/-/g, ' ')}</span>
            </div>
          ))}
        </div>
      )}

      {/* Streaming output */}
      {legalTask.status === 'running' && streaming && (
        <div className="mb-4 bg-gray-50 rounded p-2 text-xs text-gray-600 font-mono overflow-y-auto max-h-24">
          {streaming}
          <span className="animate-pulse">▌</span>
        </div>
      )}

      {/* Final output */}
      {legalTask.status === 'complete' && (
        <div className="flex-1 overflow-y-auto space-y-4">
          {summary && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Summary</p>
              <p className="text-sm text-gray-700">{summary}</p>
            </div>
          )}

          {flags.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Flagged Clauses</p>
              <div className="space-y-2">
                {flags.map((f, i) => (
                  <div key={i} className="border border-gray-200 rounded p-2 text-xs">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-gray-800">{f.clause}</span>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                        f.severity === 'high' ? 'bg-red-100 text-red-700' :
                        f.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{f.severity}</span>
                    </div>
                    {f.clauseLocation && <p className="text-gray-400 mb-1">{f.clauseLocation}</p>}
                    <p className="text-gray-600">{f.note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recommendation && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase mb-1">Recommendation</p>
              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                recommendation === 'approve' ? 'bg-green-100 text-green-700' :
                recommendation === 'amend' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {recommendation.toUpperCase()}
              </span>
            </div>
          )}
        </div>
      )}

      {legalTask.status === 'failed' && (
        <p className="text-xs text-red-500">Agent task failed. Please retry.</p>
      )}
    </div>
  )
}
