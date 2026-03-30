# REST API Contracts: Underwriter Workbench

**Branch**: `001-underwriter-workbench` | **Date**: 2026-03-26
**Base URL**: `/api/v1`
**Auth**: Azure Entra ID bearer token on all routes.

---

## Submissions

### `POST /submissions`
Create a new submission. Triggers names clearance automatically.

**Request**:
```json
{
  "riskDetails": {
    "insuredName": "string",
    "cedant": "string",
    "broker": "string",
    "lineOfBusiness": "string",
    "territory": "string",
    "coverageType": "string",
    "inceptionDate": "YYYY-MM-DD",
    "expiryDate": "YYYY-MM-DD"
  }
}
```

**Response** `201 Created`:
```json
{
  "submissionId": "uuid",
  "status": "draft",
  "namesClearance": { "status": "pending", "taskId": "uuid" }
}
```

---

### `GET /submissions`
List submissions for the current user.

**Query params**: `status`, `territory`, `lineOfBusiness`, `cedant`, `page`, `pageSize`

**Response** `200 OK`:
```json
{
  "items": [{ "submissionId": "uuid", "status": "string", "riskDetails": {}, "namesClearance": {} }],
  "total": 0,
  "page": 1,
  "pageSize": 25
}
```

---

### `GET /submissions/{submissionId}`
Get full submission detail.

**Response** `200 OK`: Full `Submission` document (see data-model.md).

---

### `PATCH /submissions/{submissionId}`
Update risk details or status.

**Request**: Partial `riskDetails` fields, or `status` transition (`bound | declined`).

**Response** `200 OK`: Updated submission.

**Business rules enforced**:
- Setting `status: "bound"` validates names clearance and legal review gates.

---

### `POST /submissions/{submissionId}/bind`
Bind a submission. Fails if gates are not met.

**Response** `200 OK`: `{ "submissionId": "uuid", "status": "bound", "boundAt": "ISO8601" }`

**Error** `422 Unprocessable Entity`:
```json
{ "error": "BIND_BLOCKED", "reason": "names-clearance-blocked | legal-review-required | legal-review-escalated" }
```

---

## Layers

### `POST /submissions/{submissionId}/layers`
Add a layer.

**Request**:
```json
{ "layerType": "primary | excess", "limit": 0, "attachmentPoint": 0, "lineSize": 0, "premium": 0, "currency": "USD" }
```

**Response** `201 Created`: `{ "layerId": "uuid", ... }`

---

### `PUT /submissions/{submissionId}/layers/{layerId}`
Update a layer.

### `DELETE /submissions/{submissionId}/layers/{layerId}`
Remove a layer (only if submission is not bound).

---

## FacRi Panels

### `POST /submissions/{submissionId}/layers/{layerId}/facri`
Add a FacRi panel.

**Request**: `{ "reinsurerName": "string", "reinsurerAgentEndpoint": "url | null", "cededPct": 0.25 }`

**Response** `201 Created`: `{ "facriPanelId": "uuid", ... }`

---

### `DELETE /submissions/{submissionId}/layers/{layerId}/facri/{facriPanelId}`
Remove a FacRi panel.

---

## Documents

### `POST /submissions/{submissionId}/documents`
Upload a document (multipart/form-data).

**Form fields**: `file` (binary), `documentType` (slip | wording | endorsement)

**Response** `201 Created`: `{ "documentId": "uuid", "fileName": "string", "uploadedAt": "ISO8601" }`

---

### `GET /submissions/{submissionId}/documents/{documentId}/download-url`
Get a short-lived SAS download URL.

**Response** `200 OK`: `{ "url": "https://...", "expiresAt": "ISO8601" }`

---

## Agent Tasks

### `POST /submissions/{submissionId}/agent-tasks`
Dispatch an agent task.

**Request**:
```json
{
  "agentType": "legal | names-clearance | developer | b2b-comms",
  "input": {}
}
```

Agent-specific input schemas: see `contracts/agent-schemas.md`.

**Response** `202 Accepted`: `{ "taskId": "uuid", "status": "queued" }`

Streaming updates delivered via SignalR `AgentTaskUpdate` event.

---

### `GET /submissions/{submissionId}/agent-tasks`
List all agent tasks for a submission.

**Response** `200 OK`: `{ "items": [AgentTask] }`

---

### `GET /submissions/{submissionId}/agent-tasks/{taskId}`
Get a specific agent task (including full output).

---

### `POST /agent-tasks/batch`
Batch-dispatch legal review across multiple submissions (Portfolio Review workflow).

**Request**: `{ "submissionIds": ["uuid"], "agentType": "legal", "input": { "checklistType": "standard" } }`

**Response** `202 Accepted`: `{ "tasks": [{ "submissionId": "uuid", "taskId": "uuid" }] }`

---

## B2B Sessions

### `POST /submissions/{submissionId}/b2b-sessions`
Initiate a B2B negotiation session.

**Request**:
```json
{
  "layerId": "uuid",
  "facriPanelId": "uuid",
  "mandate": {
    "maxCessionPct": 0.40,
    "minReinsurerLineSizePct": 0.10,
    "rateRange": { "min": 0.02, "max": 0.05 },
    "escalationNote": "string | null"
  }
}
```

**Response** `201 Created`: `{ "sessionId": "uuid", "status": "active" }`

---

### `GET /submissions/{submissionId}/b2b-sessions/{sessionId}`
Get session status and transcript.

---

### `POST /submissions/{submissionId}/b2b-sessions/{sessionId}/respond`
Underwriter manual response to an out-of-mandate counter.

**Request**: `{ "action": "accept | reject | counter", "counterPayload": {} }`

---

## DevTools

### `POST /devtools`
Create (request) a new developer tool.

**Request**:
```json
{
  "submissionId": "uuid",
  "taskDescription": "string",
  "contextData": { "submissionId": "uuid", "riskDetails": {}, "layers": [] }
}
```

**Response** `202 Accepted`:
```json
{
  "devToolId": "uuid",
  "taskId": "uuid",
  "status": "building",
  "networkPolicyProposal": {
    "allowedEgress": ["string"],
    "reasoning": "string"
  }
}
```

Status streaming via SignalR `DevToolBuildLog` and `AgentTaskUpdate` events.

---

### `POST /devtools/{devToolId}/approve-network-policy`
Underwriter approves the proposed network policy before the pod starts.

**Request**: `{ "approved": true }`

**Response** `200 OK`: `{ "devToolId": "uuid", "status": "building" }` — pod provisioning begins.

**Error** `400 Bad Request` if `approved: false` — tool transitions to `failed`, pod not started.

---

### `POST /devtools/{devToolId}/promote`
Promote an ephemeral tool to persistent.

**Request**: `{ "name": "string", "description": "string" }`

**Response** `200 OK`: `{ "devToolId": "uuid", "ephemeral": false, "routeUrl": "string" }`

---

### `GET /devtools`
List the current user's saved (persistent) DevTools.

**Response** `200 OK`: `{ "items": [DevTool] }`

---

### `POST /devtools/{devToolId}/open`
Re-open a persistent DevTool against a submission.

**Request**: `{ "submissionId": "uuid" }`

**Response** `200 OK`: `{ "devToolId": "uuid", "routeUrl": "string", "status": "running" }`

---

### `DELETE /devtools/{devToolId}`
Close and clean up a DevTool (ephemeral) or delete a persistent tool.

---

## Portfolio

### `GET /portfolio`
Get the current portfolio snapshot.

**Query params**: `territory`, `lineOfBusiness`, `status`

**Response** `200 OK`: `PortfolioSnapshot` document.

---

### `POST /portfolio/refresh`
Trigger a fresh portfolio snapshot.

**Response** `202 Accepted`: `{ "snapshotId": "uuid" }`
