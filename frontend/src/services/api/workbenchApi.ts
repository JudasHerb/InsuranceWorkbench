import axios from 'axios'
import type { AgentTask, Layer, PortfolioSnapshot, Submission } from '../../types'

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

// Auth interceptor — wired to MSAL in T059
api.interceptors.request.use((config) => {
  // Token injection added in Phase 7 (T059)
  return config
})

// ---- Submissions ----

export interface CreateSubmissionRequest {
  insuredName: string
  broker: string
  lineOfBusiness: string
  territory: string
  coverageTypes: string[]
  inceptionDate: string
  expiryDate: string
}

export interface ListSubmissionsParams {
  status?: string
  territory?: string
  lineOfBusiness?: string
  cedant?: string
  page?: number
  pageSize?: number
}

export interface PatchSubmissionRequest {
  riskDetails?: Partial<Submission['riskDetails']>
  status?: string
}

export const workbenchApi = {
  // Submissions
  createSubmission: (req: CreateSubmissionRequest) =>
    api.post<Submission>('/submissions', { riskDetails: req }).then((r) => r.data),

  listSubmissions: (params?: ListSubmissionsParams) =>
    api.get<{ items: Submission[]; total: number }>('/submissions', { params }).then((r) => r.data),

  getSubmission: (id: string) =>
    api.get<Submission>(`/submissions/${id}`).then((r) => r.data),

  updateSubmission: (id: string, req: PatchSubmissionRequest) =>
    api.patch<Submission>(`/submissions/${id}`, req).then((r) => r.data),

  bindSubmission: (id: string) =>
    api.post<Submission>(`/submissions/${id}/bind`).then((r) => r.data),

  // Layers
  addLayer: (submissionId: string, layer: Omit<Layer, 'id' | 'facriPanels'>) =>
    api.post<Layer>(`/submissions/${submissionId}/layers`, layer).then((r) => r.data),

  updateLayer: (submissionId: string, layerId: string, layer: Partial<Layer>) =>
    api.put<Layer>(`/submissions/${submissionId}/layers/${layerId}`, layer).then((r) => r.data),

  deleteLayer: (submissionId: string, layerId: string) =>
    api.delete(`/submissions/${submissionId}/layers/${layerId}`),

  // Documents
  uploadDocument: (submissionId: string, file: File, documentType: string) => {
    const form = new FormData()
    form.append('file', file)
    form.append('documentType', documentType)
    return api
      .post<Submission['documents'][0]>(`/submissions/${submissionId}/documents`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data)
  },

  getDocumentDownloadUrl: (submissionId: string, docId: string) =>
    api
      .get<{ url: string }>(`/submissions/${submissionId}/documents/${docId}/download-url`)
      .then((r) => r.data.url),

  // Agent tasks
  dispatchAgentTask: (submissionId: string, req: { agentType: string; input: Record<string, unknown> }) =>
    api.post<AgentTask>(`/submissions/${submissionId}/agent-tasks`, req).then((r) => r.data),

  listAgentTasks: (submissionId: string) =>
    api.get<AgentTask[]>(`/submissions/${submissionId}/agent-tasks`).then((r) => r.data),

  getAgentTask: (submissionId: string, taskId: string) =>
    api.get<AgentTask>(`/submissions/${submissionId}/agent-tasks/${taskId}`).then((r) => r.data),

  // FacRi panels
  createFacriPanel: (
    submissionId: string,
    layerId: string,
    panel: { reinsurerName: string; cededPct: number; reinsurerAgentEndpoint?: string },
  ) =>
    api
      .post<Submission>(`/submissions/${submissionId}/layers/${layerId}/facri`, panel)
      .then((r) => r.data),

  deleteFacriPanel: (submissionId: string, layerId: string, facriPanelId: string) =>
    api.delete(`/submissions/${submissionId}/layers/${layerId}/facri/${facriPanelId}`),

  // B2B sessions
  initB2BSession: (
    submissionId: string,
    req: { layerId: string; facriPanelId: string; mandate: unknown },
  ) =>
    api.post<{ sessionId: string }>(`/submissions/${submissionId}/b2b-sessions`, req).then((r) => r.data),

  getB2BSession: (submissionId: string, sessionId: string) =>
    api.get(`/submissions/${submissionId}/b2b-sessions/${sessionId}`).then((r) => r.data),

  respondToB2BSession: (
    submissionId: string,
    sessionId: string,
    action: 'accept' | 'reject' | 'counter',
    payload?: unknown,
  ) =>
    api
      .post(`/submissions/${submissionId}/b2b-sessions/${sessionId}/respond`, { action, payload })
      .then((r) => r.data),

  // Dev tools
  createDevTool: (req: { taskDescription: string; submissionId: string }) =>
    api.post<{ devToolId: string; networkPolicyProposal: unknown }>('/devtools', req).then((r) => r.data),

  approveDevToolNetworkPolicy: (devToolId: string, approved: boolean) =>
    api.post(`/devtools/${devToolId}/approve-network-policy`, { approved }).then((r) => r.data),

  promoteDevTool: (devToolId: string, name: string, description: string) =>
    api.post(`/devtools/${devToolId}/promote`, { name, description }).then((r) => r.data),

  listDevTools: () => api.get('/devtools').then((r) => r.data),

  openDevTool: (devToolId: string, submissionId: string) =>
    api.post(`/devtools/${devToolId}/open`, { submissionId }).then((r) => r.data),

  deleteDevTool: (devToolId: string) => api.delete(`/devtools/${devToolId}`),

  // Portfolio
  getPortfolio: (params?: { territory?: string; lineOfBusiness?: string; status?: string }) =>
    api.get<PortfolioSnapshot>('/portfolio', { params }).then((r) => r.data),

  refreshPortfolio: () =>
    api.post<{ snapshotId: string }>('/portfolio/refresh').then((r) => r.data),

  dispatchBatchAgentTask: (submissionIds: string[], agentType: string) =>
    api
      .post<Array<{ submissionId: string; taskId: string }>>('/agent-tasks/batch', {
        submissionIds,
        agentType,
      })
      .then((r) => r.data),
}
