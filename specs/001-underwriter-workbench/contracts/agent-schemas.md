# Agent Input/Output Schemas: Underwriter Workbench

**Branch**: `001-underwriter-workbench` | **Date**: 2026-03-26

These schemas define the `input` and `output` fields of `AgentTask` documents for each agent
type. All inputs/outputs are persisted on the `AgentTask` record in Cosmos DB.

---

## Legal Agent

**agentType**: `legal`

### Input
```json
{
  "documentId": "uuid",
  "jurisdiction": "string",
  "lineOfBusiness": "string",
  "checklistType": "standard | marine | property | liability"
}
```

### Output
```json
{
  "summary": "string",
  "flags": [
    {
      "clause": "string",
      "clauseLocation": "string",
      "severity": "high | medium | low",
      "note": "string"
    }
  ],
  "recommendation": "approve | amend | escalate",
  "reviewedAt": "ISO8601"
}
```

### Sub-tasks
```json
[
  { "name": "document-extraction", "status": "complete" },
  { "name": "clause-analysis", "status": "complete" },
  { "name": "jurisdiction-check", "status": "complete" }
]
```

---

## Names Clearance Agent

**agentType**: `names-clearance`

### Input
```json
{
  "entities": [
    { "entityName": "string", "entityType": "insured | cedant | broker", "jurisdiction": "string" }
  ],
  "submissionId": "uuid"
}
```

### Output
```json
{
  "overallStatus": "clear | refer | blocked",
  "results": [
    {
      "entityName": "string",
      "entityType": "insured | cedant | broker",
      "clearanceStatus": "clear | refer | blocked",
      "matchedRecords": [
        { "source": "string", "matchScore": 0.0, "detail": "string" }
      ],
      "auditRef": "string"
    }
  ],
  "completedAt": "ISO8601"
}
```

`overallStatus` is the worst of all individual entity statuses (blocked > refer > clear).

### Sub-tasks
```json
[
  { "name": "insured-check", "status": "complete" },
  { "name": "cedant-check", "status": "complete" },
  { "name": "broker-check", "status": "complete" }
]
```

---

## Developer Agent

**agentType**: `developer`

### Input
```json
{
  "taskDescription": "string",
  "contextData": {
    "submissionId": "uuid",
    "riskDetails": {},
    "layers": []
  },
  "sessionConnectionId": "string"
}
```

`sessionConnectionId` is used to route SignalR build log events back to the requesting client.

### Output
```json
{
  "devToolId": "uuid",
  "toolUrl": "string | null",
  "status": "building | running | failed",
  "imageRef": "string",
  "networkPolicy": {
    "allowedEgress": ["string"],
    "reasoning": "string"
  },
  "ephemeral": true,
  "buildLog": "string"
}
```

### Sub-tasks
```json
[
  { "name": "code-generation", "status": "complete" },
  { "name": "network-policy-proposal", "status": "complete" },
  { "name": "awaiting-uw-approval", "status": "complete" },
  { "name": "docker-build", "status": "complete" },
  { "name": "acr-push", "status": "complete" },
  { "name": "openshift-pod-create", "status": "complete" },
  { "name": "openshift-route-provision", "status": "complete" }
]
```

---

## B2B Comms Agent

**agentType**: `b2b-comms`

The B2B agent operates as a stateful loop managed by `B2BHostedService`. The `AgentTask`
record is created once for the session; sub-tasks track each negotiation round.

### Input
```json
{
  "sessionId": "uuid",
  "submissionId": "uuid",
  "layerId": "uuid",
  "facriPanelId": "uuid",
  "mandate": {
    "maxCessionPct": 0.40,
    "minReinsurerLineSizePct": 0.10,
    "rateRange": { "min": 0.02, "max": 0.05 },
    "escalationNote": "string | null"
  },
  "counterparty": {
    "firm": "string",
    "agentEndpoint": "url"
  }
}
```

### Output (updated on session conclusion)
```json
{
  "sessionId": "uuid",
  "sessionStatus": "agreed | rejected | stalled | escalated",
  "roundCount": 3,
  "finalTerms": {
    "finalCededPct": 0.25,
    "reinsurerLineSizePct": 0.10,
    "agreedRate": 0.035
  },
  "concludedAt": "ISO8601"
}
```

### Sub-tasks (one per negotiation round)
```json
[
  { "name": "round-1-proposal", "status": "complete" },
  { "name": "round-1-evaluate-response", "status": "complete" },
  { "name": "round-2-counter", "status": "complete" },
  { "name": "round-2-evaluate-response", "status": "complete" },
  { "name": "round-3-accept", "status": "complete" }
]
```

---

## B2B Message Envelope

Used for the wire format between workbench agent and external counterparty agent endpoints.

```json
{
  "sessionId": "uuid",
  "from": {
    "firm": "string",
    "agentEndpoint": "url"
  },
  "to": {
    "firm": "string",
    "agentEndpoint": "url"
  },
  "messageType": "proposal | counter | accept | reject | query",
  "payload": {},
  "timestamp": "ISO8601",
  "signature": "HMAC-SHA256-hex"
}
```

**Signature**: HMAC-SHA256 of `{sessionId}:{timestamp}:{messageType}:{payload-sha256}` using
a shared secret stored in Azure Key Vault. Messages with invalid or missing signatures MUST be
rejected with HTTP 401 before processing.
