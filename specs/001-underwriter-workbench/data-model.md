# Data Model: Underwriter Workbench

**Branch**: `001-underwriter-workbench` | **Date**: 2026-03-26
**Storage**: Azure Cosmos DB (NoSQL) + Azure Blob Storage (binary documents)

---

## Cosmos DB Container Strategy

| Container         | Partition Key    | Primary Documents                          |
|-------------------|------------------|--------------------------------------------|
| `submissions`     | `/submissionId`  | Submission, Layer, FacRiPanel, AgentTask, B2BSession, AuditLogEntry |
| `devtools`        | `/ownerId`       | DevTool                                    |
| `portfolio`       | `/id`            | PortfolioSnapshot                          |

All documents include a `_type` discriminator field and a `_ts` (timestamp) for optimistic
concurrency via ETags.

---

## Entity: Submission

**Container**: `submissions` | **Partition**: `/submissionId` (= `id`)

```json
{
  "id": "uuid",
  "_type": "submission",
  "submissionId": "uuid",
  "status": "draft | in-review | bound | declined",
  "riskDetails": {
    "insuredName": "string",
    "cedant": "string",
    "broker": "string",
    "lineOfBusiness": "string",
    "territory": "string",
    "coverageType": "string",
    "inceptionDate": "ISO8601-date",
    "expiryDate": "ISO8601-date"
  },
  "namesClearance": {
    "status": "pending | clear | refer | blocked",
    "taskId": "uuid",
    "completedAt": "ISO8601 | null"
  },
  "legalReview": {
    "latestTaskId": "uuid | null",
    "recommendation": "approve | amend | escalate | null"
  },
  "layers": ["Layer (embedded)"],
  "documents": ["DocumentRef (embedded)"],
  "agentTaskIds": ["uuid"],
  "auditLog": ["AuditLogEntry (embedded)"],
  "createdAt": "ISO8601",
  "createdBy": "userId",
  "updatedAt": "ISO8601"
}
```

**State transitions**:
- `draft` → `in-review`: Names clearance completes (any result)
- `in-review` → `bound`: UW action; requires `namesClearance.status != "blocked"` and `legalReview.recommendation == "approve" or "amend"`
- `in-review` → `declined`: UW action
- Any state → audit log entry appended on transition

**Validation rules**:
- `inceptionDate` MUST be before `expiryDate`
- `status == "bound"` requires at least one Layer
- `namesClearance.status == "blocked"` prevents `status` changing to `bound`

---

## Embedded: Layer

```json
{
  "id": "uuid",
  "layerNo": 1,
  "layerType": "primary | excess",
  "limit": 1000000,
  "attachmentPoint": 0,
  "lineSize": 250000,
  "premium": 12500,
  "currency": "USD",
  "status": "quoted | bound | declined",
  "facriPanels": ["FacRiPanel (embedded)"]
}
```

---

## Embedded: FacRiPanel

```json
{
  "id": "uuid",
  "reinsurerName": "string",
  "reinsurerAgentEndpoint": "url | null",
  "cededPct": 0.25,
  "agreedTerms": {
    "finalCededPct": 0.25,
    "reinsurerLineSizePct": 0.10,
    "agreedRate": 0.035,
    "sessionId": "uuid | null"
  },
  "status": "pending | agreed | failed"
}
```

---

## Embedded: DocumentRef

```json
{
  "documentId": "uuid",
  "fileName": "string",
  "mimeType": "application/pdf | application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "blobName": "string",
  "uploadedAt": "ISO8601",
  "uploadedBy": "userId",
  "sizeBytes": 0
}
```

Actual binary stored in Azure Blob Storage container `uw-documents`. Access via SAS URL
(1-hour TTL) generated on demand by `DocumentService`.

---

## Embedded: AuditLogEntry

```json
{
  "entryId": "uuid",
  "timestamp": "ISO8601",
  "actor": {
    "type": "user | agent",
    "id": "userId | agentType",
    "displayName": "string"
  },
  "action": "submission-created | layer-added | names-clearance-complete | legal-review-dispatched | legal-review-complete | b2b-session-started | b2b-terms-agreed | devtool-built | devtool-promoted | submission-bound | submission-declined | networkpolicy-approved",
  "summary": "string",
  "taskId": "uuid | null"
}
```

---

## Entity: AgentTask

**Container**: `submissions` | **Partition**: `/submissionId`

```json
{
  "id": "uuid",
  "_type": "agentTask",
  "submissionId": "uuid",
  "agentType": "legal | names-clearance | developer | b2b-comms",
  "status": "queued | running | complete | failed",
  "input": {},
  "output": {},
  "subTasks": [
    {
      "subTaskId": "uuid",
      "name": "string",
      "status": "queued | running | complete | failed",
      "startedAt": "ISO8601 | null",
      "completedAt": "ISO8601 | null",
      "detail": "string | null"
    }
  ],
  "createdAt": "ISO8601",
  "startedAt": "ISO8601 | null",
  "completedAt": "ISO8601 | null",
  "createdBy": "userId"
}
```

**Agent-specific input/output schemas** — see `contracts/agent-schemas.md`.

---

## Entity: B2BSession

**Container**: `submissions` | **Partition**: `/submissionId`

```json
{
  "id": "uuid",
  "_type": "b2bSession",
  "submissionId": "uuid",
  "layerId": "uuid",
  "facriPanelId": "uuid",
  "counterparty": {
    "firm": "string",
    "agentEndpoint": "url"
  },
  "mandate": {
    "maxCessionPct": 0.40,
    "minReinsurerLineSizePct": 0.10,
    "rateRange": { "min": 0.02, "max": 0.05 },
    "escalationNote": "string | null"
  },
  "messages": [
    {
      "messageId": "uuid",
      "sessionId": "uuid",
      "from": { "firm": "string", "agentEndpoint": "url" },
      "to":   { "firm": "string", "agentEndpoint": "url" },
      "messageType": "proposal | counter | accept | reject | query",
      "payload": {},
      "timestamp": "ISO8601",
      "signature": "HMAC-SHA256-hex",
      "mandateEvaluation": {
        "withinMandate": true,
        "reasoning": "string",
        "suggestedAction": "accept | reject | counter | escalate"
      }
    }
  ],
  "status": "active | agreed | rejected | stalled | escalated",
  "finalTerms": {
    "finalCededPct": 0.25,
    "reinsurerLineSizePct": 0.10,
    "agreedRate": 0.035
  },
  "createdAt": "ISO8601",
  "concludedAt": "ISO8601 | null"
}
```

---

## Entity: DevTool

**Container**: `devtools` | **Partition**: `/ownerId`

```json
{
  "id": "uuid",
  "_type": "devTool",
  "ownerId": "userId",
  "name": "string",
  "description": "string",
  "ephemeral": true,
  "imageRef": "acr.azurecr.io/devtools/{id}:latest",
  "networkPolicy": {
    "allowedEgress": ["url"],
    "approvedBy": "userId",
    "approvedAt": "ISO8601"
  },
  "sourceCode": "string",
  "podName": "devtool-{id}",
  "routeUrl": "https://devtool-{id}.apps.{domain} | null",
  "podStatus": "building | running | stopped | failed",
  "submissionContextSchema": {
    "version": "1.0",
    "fields": ["submissionId", "riskDetails", "layers", "currency"]
  },
  "lastUsedAt": "ISO8601 | null",
  "createdAt": "ISO8601",
  "agentTaskId": "uuid"
}
```

**Lifecycle**:
- `ephemeral: true` — pod torn down on panel close or session end; image deleted after 24h
- `ephemeral: false` (promoted) — pod kept running; stable route URL; appears in My Tools

---

## Entity: PortfolioSnapshot

**Container**: `portfolio` | **Partition**: `/id`

```json
{
  "id": "uuid",
  "_type": "portfolioSnapshot",
  "generatedAt": "ISO8601",
  "kpis": {
    "totalGWP": 0,
    "aggregateLimit": 0,
    "largestSingleRisk": 0,
    "ytdLossRatio": 0.0,
    "currency": "USD"
  },
  "exposureMatrix": [
    {
      "territory": "string",
      "lineOfBusiness": "string",
      "totalLimit": 0,
      "submissionCount": 0
    }
  ],
  "activeSubmissionCount": 0,
  "boundSubmissionCount": 0
}
```

Snapshots are generated on demand (portfolio page load) and after each bind event.
Old snapshots are retained for 90 days for trend analysis (future feature).

---

## Relationships Summary

```
Submission (1) ──── (many) Layer
Layer      (1) ──── (many) FacRiPanel
Submission (1) ──── (many) AgentTask
Submission (1) ──── (many) B2BSession
Submission (1) ──── (many) DocumentRef [embedded]
Submission (1) ──── (many) AuditLogEntry [embedded]
FacRiPanel (0..1) ── (1)   B2BSession [via sessionId]
User       (1) ──── (many) DevTool
AgentTask  (1) ──── (1)    DevTool [via agentTaskId]
```
