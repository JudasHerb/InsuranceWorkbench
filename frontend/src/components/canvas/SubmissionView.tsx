import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { workbenchApi } from '../../services/api/workbenchApi'
import { useSubmissionStore } from '../../store/submissionStore'
import { workbenchHub } from '../../services/signalr/workbenchHub'
import RiskSummaryTab from './tabs/RiskSummaryTab'
import LayerStructureTab from './tabs/LayerStructureTab'
import DocumentsTab from './tabs/DocumentsTab'
import AgentsTab from './tabs/AgentsTab'
import AuditTab from './tabs/AuditTab'
import AgentPanel from '../panels/AgentPanel'
import ContextPanel from '../panels/ContextPanel'

const TABS = ['Risk Summary', 'Layers', 'Documents', 'Agents', 'Audit'] as const
type Tab = typeof TABS[number]

export default function SubmissionView() {
  const { id } = useParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState<Tab>('Risk Summary')
  const { currentSubmission, setCurrentSubmission, upsertAgentTask, appendOutputChunk } = useSubmissionStore()

  useEffect(() => {
    if (!id) return
    workbenchHub.joinSubmission(id)

    const taskHandler = (payload: import('../../types').AgentTaskUpdatePayload) => {
      if (payload.submissionId !== id) return
      if (payload.outputChunk) appendOutputChunk(payload.taskId, payload.outputChunk)
      workbenchApi.getAgentTask(id, payload.taskId).then(upsertAgentTask).catch(() => {})
    }
    workbenchHub.onAgentTaskUpdate(taskHandler)

    const statusHandler = (payload: import('../../types').SubmissionStatusChangedPayload) => {
      if (payload.submissionId !== id) return
      workbenchApi.getSubmission(id).then(setCurrentSubmission).catch(() => {})
    }
    workbenchHub.onSubmissionStatusChanged(statusHandler)

    workbenchApi.getSubmission(id).then(setCurrentSubmission).catch(() => {})
    workbenchApi.listAgentTasks(id).then((r) => {
      const tasks = Array.isArray(r) ? r : (r as { items: unknown[] }).items ?? []
      useSubmissionStore.getState().setAgentTasks(tasks as Parameters<typeof upsertAgentTask>[0][])
    }).catch(() => {})

    return () => {
      workbenchHub.offAgentTaskUpdate(taskHandler)
      workbenchHub.offSubmissionStatusChanged(statusHandler)
      workbenchHub.leaveSubmission(id)
    }
  }, [id])

  if (!currentSubmission) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Loading submission…
      </div>
    )
  }

  return (
    <div className="flex h-full">
      {/* Left: context panel */}
      <aside className="w-64 border-r border-gray-200 bg-white shrink-0">
        <ContextPanel />
      </aside>

      {/* Centre: tabs */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Tab bar */}
        <div className="border-b border-gray-200 bg-white px-6 flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-4 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-auto p-6">
          {activeTab === 'Risk Summary' && <RiskSummaryTab />}
          {activeTab === 'Layers' && <LayerStructureTab />}
          {activeTab === 'Documents' && <DocumentsTab />}
          {activeTab === 'Agents' && <AgentsTab />}
          {activeTab === 'Audit' && <AuditTab />}
        </div>
      </main>

      {/* Right: agent panel */}
      <aside className="w-80 border-l border-gray-200 bg-white shrink-0">
        <AgentPanel />
      </aside>
    </div>
  )
}
