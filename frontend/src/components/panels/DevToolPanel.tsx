import { useState } from 'react'
import { workbenchApi } from '../../services/api/workbenchApi'
import type { DevToolBuildLogPayload, NetworkPolicyApprovalPayload } from '../../types'

interface DevToolPanelProps {
  devToolId: string | null
  buildLogs: DevToolBuildLogPayload[]
  networkPolicyRequest: NetworkPolicyApprovalPayload | null
  routeUrl: string | null
  onClose: () => void
}

const PHASES = ['generating', 'building', 'pushing', 'deploying', 'ready'] as const

export default function DevToolPanel({
  devToolId,
  buildLogs,
  networkPolicyRequest,
  routeUrl,
  onClose,
}: DevToolPanelProps) {
  const [approving, setApproving] = useState(false)
  const [showPromote, setShowPromote] = useState(false)
  const [promoteName, setPromoteName] = useState('')
  const [promoteDesc, setPromoteDesc] = useState('')
  const [promoting, setPromoting] = useState(false)
  const [promoted, setPromoted] = useState(false)

  const currentPhase = buildLogs[buildLogs.length - 1]?.phase ?? null
  const isReady = currentPhase === 'ready'
  const isFailed = currentPhase === 'failed'

  const handleApprove = async (approved: boolean) => {
    if (!devToolId) return
    setApproving(true)
    try {
      await workbenchApi.approveDevToolNetworkPolicy(devToolId, approved)
    } catch {
      // ignore
    } finally {
      setApproving(false)
    }
  }

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!devToolId) return
    setPromoting(true)
    try {
      await workbenchApi.promoteDevTool(devToolId, promoteName, promoteDesc)
      setPromoted(true)
      setShowPromote(false)
    } catch {
      // ignore
    } finally {
      setPromoting(false)
    }
  }

  return (
    <div className="h-full flex flex-col border-l border-gray-200 bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-700">Developer Tool</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
      </div>

      {/* Network policy approval */}
      {networkPolicyRequest && !currentPhase && (
        <div className="p-4 border-b border-gray-200 bg-yellow-50">
          <h3 className="text-sm font-semibold text-gray-800 mb-2">Network Policy Approval Required</h3>
          <p className="text-xs text-gray-600 mb-2">{networkPolicyRequest.networkPolicyProposal.reasoning}</p>
          <div className="mb-3">
            <p className="text-xs font-medium text-gray-600 mb-1">Requested egress:</p>
            <ul className="text-xs font-mono text-gray-700 space-y-0.5">
              {networkPolicyRequest.networkPolicyProposal.allowedEgress.map((url) => (
                <li key={url} className="bg-white px-2 py-1 rounded border border-gray-200">{url}</li>
              ))}
            </ul>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleApprove(true)} disabled={approving}
              className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50">
              Approve
            </button>
            <button onClick={() => handleApprove(false)} disabled={approving}
              className="px-3 py-1.5 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50">
              Reject
            </button>
          </div>
        </div>
      )}

      {/* Phase stepper */}
      {(currentPhase || buildLogs.length > 0) && (
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex gap-1.5 items-center">
            {PHASES.map((phase) => {
              const idx = PHASES.indexOf(phase)
              const curIdx = currentPhase ? PHASES.indexOf(currentPhase as typeof PHASES[number]) : -1
              const done = idx < curIdx || (phase === currentPhase && isReady)
              const active = phase === currentPhase
              return (
                <div key={phase} className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${
                    isFailed && active ? 'bg-red-500' :
                    done ? 'bg-green-500' :
                    active ? 'bg-blue-500 animate-pulse' :
                    'bg-gray-200'
                  }`} />
                  <span className={`text-[10px] ${active ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>{phase}</span>
                </div>
              )
            })}
          </div>
          <div className="mt-2 max-h-24 overflow-y-auto space-y-0.5">
            {buildLogs.map((log, i) => (
              <p key={i} className="text-xs font-mono text-gray-600">{log.logLine}</p>
            ))}
          </div>
        </div>
      )}

      {/* Tool iframe */}
      {isReady && routeUrl && (
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
            <span className="text-xs text-gray-500 font-mono truncate">{routeUrl}</span>
            {!promoted && (
              <button onClick={() => setShowPromote(true)} className="text-xs text-indigo-600 hover:underline ml-2 shrink-0">
                Keep this tool
              </button>
            )}
            {promoted && <span className="text-xs text-green-600 ml-2">Saved</span>}
          </div>
          <iframe src={routeUrl} className="flex-1 w-full border-0" title="Developer Tool" />
        </div>
      )}

      {isFailed && (
        <div className="p-4 flex-1">
          <p className="text-sm text-red-500">Build failed. Please try again.</p>
        </div>
      )}

      {!currentPhase && !networkPolicyRequest && buildLogs.length === 0 && (
        <div className="p-4 flex-1">
          <p className="text-xs text-gray-400">Awaiting tool generation…</p>
        </div>
      )}

      {/* Promote modal */}
      {showPromote && (
        <div className="absolute inset-0 bg-white z-10 flex flex-col p-4">
          <h3 className="font-semibold text-gray-800 mb-4">Save Tool</h3>
          <form onSubmit={handlePromote} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tool Name</label>
              <input required value={promoteName} onChange={(e) => setPromoteName(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input value={promoteDesc} onChange={(e) => setPromoteDesc(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowPromote(false)}
                className="px-3 py-2 text-sm border border-gray-300 rounded">Cancel</button>
              <button type="submit" disabled={promoting}
                className="px-3 py-2 text-sm bg-indigo-600 text-white rounded disabled:opacity-50">
                {promoting ? 'Saving…' : 'Save Tool'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
