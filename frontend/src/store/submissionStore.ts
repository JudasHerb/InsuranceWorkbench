import { create } from 'zustand'
import type { AgentTask, AuditLogEntry, Layer, Submission } from '../types'

interface SubmissionState {
  currentSubmission: Submission | null
  agentTasks: AgentTask[]
  streamingChunks: Record<string, string> // taskId → accumulated output text

  setCurrentSubmission: (submission: Submission) => void
  updateSubmission: (patch: Partial<Submission>) => void
  clearSubmission: () => void

  setAgentTasks: (tasks: AgentTask[]) => void
  upsertAgentTask: (task: AgentTask) => void
  appendOutputChunk: (taskId: string, chunk: string) => void

  appendAuditEntry: (entry: AuditLogEntry) => void
  upsertLayer: (layer: Layer) => void
  removeLayer: (layerId: string) => void
}

export const useSubmissionStore = create<SubmissionState>((set) => ({
  currentSubmission: null,
  agentTasks: [],
  streamingChunks: {},

  setCurrentSubmission: (submission) =>
    set({ currentSubmission: submission, agentTasks: [], streamingChunks: {} }),

  updateSubmission: (patch) =>
    set((state) =>
      state.currentSubmission
        ? { currentSubmission: { ...state.currentSubmission, ...patch } }
        : {},
    ),

  clearSubmission: () =>
    set({ currentSubmission: null, agentTasks: [], streamingChunks: {} }),

  setAgentTasks: (tasks) => set({ agentTasks: tasks }),

  upsertAgentTask: (task) =>
    set((state) => {
      const idx = state.agentTasks.findIndex((t) => t.id === task.id)
      if (idx >= 0) {
        const updated = [...state.agentTasks]
        updated[idx] = task
        return { agentTasks: updated }
      }
      return { agentTasks: [...state.agentTasks, task] }
    }),

  appendOutputChunk: (taskId, chunk) =>
    set((state) => ({
      streamingChunks: {
        ...state.streamingChunks,
        [taskId]: (state.streamingChunks[taskId] ?? '') + chunk,
      },
    })),

  appendAuditEntry: (entry) =>
    set((state) =>
      state.currentSubmission
        ? {
            currentSubmission: {
              ...state.currentSubmission,
              auditLog: [...state.currentSubmission.auditLog, entry],
            },
          }
        : {},
    ),

  upsertLayer: (layer) =>
    set((state) => {
      if (!state.currentSubmission) return {}
      const idx = state.currentSubmission.layers.findIndex((l) => l.id === layer.id)
      const layers =
        idx >= 0
          ? state.currentSubmission.layers.map((l, i) => (i === idx ? layer : l))
          : [...state.currentSubmission.layers, layer]
      return { currentSubmission: { ...state.currentSubmission, layers } }
    }),

  removeLayer: (layerId) =>
    set((state) => {
      if (!state.currentSubmission) return {}
      return {
        currentSubmission: {
          ...state.currentSubmission,
          layers: state.currentSubmission.layers.filter((l) => l.id !== layerId),
        },
      }
    }),
}))
