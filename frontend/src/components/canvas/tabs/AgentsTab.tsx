import { useState } from 'react'
import { workbenchApi } from '../../../services/api/workbenchApi'
import { useSubmissionStore } from '../../../store/submissionStore'
import type { AgentTask } from '../../../types'

export default function AgentsTab() {
  const { currentSubmission, agentTasks, upsertAgentTask } = useSubmissionStore()
  const [showDispatch, setShowDispatch] = useState(false)
  const [dispatching, setDispatching] = useState(false)
  const [legalForm, setLegalForm] = useState({
    documentId: '',
    jurisdiction: 'UK',
    checklistType: 'standard',
  })

  if (!currentSubmission) return null

  const { submissionId, documents } = currentSubmission

  const handleDispatch = async (e: React.FormEvent) => {
    e.preventDefault()
    setDispatching(true)
    try {
      await workbenchApi.dispatchAgentTask(submissionId, {
        agentType: 'legal',
        input: legalForm,
      })
      setShowDispatch(false)
      // Refresh task list
      const r = await workbenchApi.listAgentTasks(submissionId)
      const tasks = Array.isArray(r) ? r : (r as { items: AgentTask[] }).items ?? []
      tasks.forEach(upsertAgentTask)
    } catch {
      // ignore
    } finally {
      setDispatching(false)
    }
  }

  const statusColour = (status: string) => {
    if (status === 'complete') return 'bg-green-100 text-green-700'
    if (status === 'running') return 'bg-blue-100 text-blue-700'
    if (status === 'failed') return 'bg-red-100 text-red-700'
    return 'bg-gray-100 text-gray-500'
  }

  const agentLabel = (type: string) => {
    const labels: Record<string, string> = {
      'legal': 'Legal',
      'names-clearance': 'Names Clearance',
      'developer': 'Developer',
      'b2b-comms': 'B2B Comms',
    }
    return labels[type] ?? type
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowDispatch(true)}
          className="text-sm px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Dispatch Legal Review
        </button>
      </div>

      <div className="space-y-3">
        {agentTasks.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">No agent tasks yet</p>
        )}
        {agentTasks.map((task) => (
          <div key={task.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-800">{agentLabel(task.agentType)}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColour(task.status)}`}>
                  {task.status}
                </span>
              </div>
              <span className="text-xs text-gray-400">
                {task.completedAt
                  ? `Completed ${new Date(task.completedAt).toLocaleString()}`
                  : task.startedAt
                  ? `Started ${new Date(task.startedAt).toLocaleString()}`
                  : `Created ${new Date(task.createdAt).toLocaleString()}`}
              </span>
            </div>
            {task.subTasks.length > 0 && (
              <div className="mt-3 flex gap-3">
                {task.subTasks.map((st) => (
                  <div key={st.subTaskId} className="flex items-center gap-1.5 text-xs">
                    <span className={`w-2 h-2 rounded-full ${
                      st.status === 'complete' ? 'bg-green-500' :
                      st.status === 'running' ? 'bg-blue-500 animate-pulse' :
                      st.status === 'failed' ? 'bg-red-500' :
                      'bg-gray-300'
                    }`} />
                    <span className="text-gray-600">{st.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {showDispatch && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-base font-semibold mb-4">Dispatch Legal Review</h2>
            <form onSubmit={handleDispatch} className="space-y-3">
              <div>
                <label htmlFor="dispatch-doc" className="block text-sm font-medium text-gray-700 mb-1">Document</label>
                <select id="dispatch-doc" value={legalForm.documentId} onChange={(e) => setLegalForm((f) => ({ ...f, documentId: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                  <option value="">No document (use context)</option>
                  {documents.map((d) => (
                    <option key={d.documentId} value={d.documentId}>{d.fileName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="dispatch-jurisdiction" className="block text-sm font-medium text-gray-700 mb-1">Jurisdiction</label>
                <input id="dispatch-jurisdiction" value={legalForm.jurisdiction}
                  onChange={(e) => setLegalForm((f) => ({ ...f, jurisdiction: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label htmlFor="dispatch-checklist" className="block text-sm font-medium text-gray-700 mb-1">Checklist Type</label>
                <select id="dispatch-checklist" value={legalForm.checklistType} onChange={(e) => setLegalForm((f) => ({ ...f, checklistType: e.target.value }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                  <option value="standard">Standard</option>
                  <option value="commercial">Commercial</option>
                  <option value="marine">Marine</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowDispatch(false)} className="px-4 py-2 text-sm border border-gray-300 rounded">Cancel</button>
                <button type="submit" disabled={dispatching} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded disabled:opacity-50">
                  {dispatching ? 'Dispatching…' : 'Dispatch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
