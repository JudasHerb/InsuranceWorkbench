// ---- Submission domain types ----

export interface RiskDetails {
  insuredName: string
  cedant: string
  broker: string
  lineOfBusiness: string
  territory: string
  coverageType: string
  inceptionDate: string
  expiryDate: string
}

export interface NamesClearanceStatus {
  status: 'pending' | 'clear' | 'refer' | 'blocked'
  taskId: string | null
  completedAt: string | null
}

export interface LegalReviewStatus {
  latestTaskId: string | null
  recommendation: 'approve' | 'amend' | 'escalate' | null
}

export interface AgreedTerms {
  finalCededPct: number
  reinsurerLineSizePct: number
  agreedRate: number
  sessionId: string | null
}

export interface FacRiPanel {
  id: string
  reinsurerName: string
  reinsurerAgentEndpoint: string | null
  cededPct: number
  agreedTerms: AgreedTerms | null
  status: 'pending' | 'agreed' | 'failed'
}

export interface Layer {
  id: string
  layerNo: number
  layerType: 'primary' | 'excess'
  limit: number
  attachmentPoint: number
  lineSize: number
  premium: number
  currency: string
  status: 'quoted' | 'bound' | 'declined'
  facriPanels: FacRiPanel[]
}

export interface DocumentRef {
  documentId: string
  fileName: string
  mimeType: string
  blobName: string
  documentType: string
  uploadedAt: string
  uploadedBy: string
  sizeBytes: number
}

export interface AuditActor {
  type: 'user' | 'agent'
  id: string
  displayName: string
}

export interface AuditLogEntry {
  entryId: string
  timestamp: string
  actor: AuditActor
  action: string
  summary: string
  taskId: string | null
}

export interface Submission {
  id: string
  submissionId: string
  status: 'draft' | 'in-review' | 'bound' | 'declined'
  riskDetails: RiskDetails
  namesClearance: NamesClearanceStatus
  legalReview: LegalReviewStatus
  layers: Layer[]
  documents: DocumentRef[]
  agentTaskIds: string[]
  auditLog: AuditLogEntry[]
  createdAt: string
  createdBy: string
  updatedAt: string
}

// ---- Agent task types ----

export interface AgentSubTask {
  subTaskId: string
  name: string
  status: 'queued' | 'running' | 'complete' | 'failed'
  startedAt: string | null
  completedAt: string | null
  detail: string | null
}

export interface AgentTask {
  id: string
  submissionId: string
  agentType: 'legal' | 'names-clearance' | 'developer' | 'b2b-comms'
  status: 'queued' | 'running' | 'complete' | 'failed'
  input: Record<string, unknown>
  output: Record<string, unknown>
  subTasks: AgentSubTask[]
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  createdBy: string
}

// ---- Portfolio types ----

export interface PortfolioKpis {
  totalGWP: number
  aggregateLimit: number
  largestSingleRisk: number
  ytdLossRatio: number
  currency: string
}

export interface ExposureMatrixCell {
  territory: string
  lineOfBusiness: string
  totalLimit: number
  submissionCount: number
}

export interface PortfolioSnapshot {
  id: string
  generatedAt: string
  kpis: PortfolioKpis
  exposureMatrix: ExposureMatrixCell[]
  activeSubmissionCount: number
  boundSubmissionCount: number
}

// ---- SignalR event payloads ----

export interface AgentTaskUpdatePayload {
  taskId: string
  submissionId: string
  agentType: string
  status: string
  outputChunk: string | null
  isFinalChunk: boolean
  result: Record<string, unknown> | null
}

export interface B2BMessageReceivedPayload {
  sessionId: string
  submissionId: string
  messageId: string
  messageType: string
  from: { firm: string }
  timestamp: string
  withinMandate: boolean
  autoActioned: boolean
  requiresUWDecision: boolean
}

export interface DevToolBuildLogPayload {
  devToolId: string
  taskId: string
  logLine: string
  phase: 'generating' | 'building' | 'pushing' | 'deploying' | 'ready' | 'failed'
  toolUrl: string | null
}

export interface NetworkPolicyApprovalPayload {
  devToolId: string
  taskId: string
  networkPolicyProposal: { allowedEgress: string[]; reasoning: string }
}

export interface SubmissionStatusChangedPayload {
  submissionId: string
  oldStatus: string
  newStatus: string
  changedAt: string
  changedBy: string
}

export interface PortfolioUpdatedPayload {
  snapshotId: string
  generatedAt: string
  kpis: PortfolioKpis
}
