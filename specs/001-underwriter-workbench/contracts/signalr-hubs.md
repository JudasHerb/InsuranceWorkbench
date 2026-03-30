# SignalR Hub Contracts: Underwriter Workbench

**Branch**: `001-underwriter-workbench` | **Date**: 2026-03-26
**Hub URL**: `/hubs/workbench`
**Auth**: Bearer token in the query string or `Authorization` header (MSAL token).

---

## Hub: WorkbenchHub

Single hub managing real-time updates for submission-scoped and user-scoped events.

### Client → Server (Invocations)

#### `JoinSubmission(submissionId: string)`
Subscribe to real-time updates for a submission. Adds the connection to the
`submission:{submissionId}` group.

Called when the user navigates to a Submission View.

**Response**: none (fire-and-forget)

---

#### `LeaveSubmission(submissionId: string)`
Unsubscribe from submission updates. Called on navigation away.

---

#### `JoinPortfolio()`
Subscribe to portfolio-level updates. Adds the connection to `user:{userId}`.

---

#### `LeavePortfolio()`
Unsubscribe from portfolio updates.

---

#### `CloseTool(devToolId: string)`
Signal that the underwriter has closed a DevTool panel. Triggers ephemeral pod teardown.

---

### Server → Client (Events)

#### `AgentTaskUpdate`
Fired when an agent task changes state or produces streaming output.

```json
{
  "taskId": "uuid",
  "submissionId": "uuid",
  "agentType": "legal | names-clearance | developer | b2b-comms",
  "status": "queued | running | complete | failed",
  "outputChunk": "string | null",
  "isFinalChunk": false,
  "result": {}
}
```

Sent to: `submission:{submissionId}` group.

`outputChunk` carries a streaming text fragment when `status == "running"` and the agent is
producing streaming output. `isFinalChunk: true` signals the last chunk before the full result
is available on the task record.

---

#### `B2BMessageReceived`
Fired when a new message is added to a B2B session transcript.

```json
{
  "sessionId": "uuid",
  "submissionId": "uuid",
  "messageId": "uuid",
  "messageType": "proposal | counter | accept | reject | query",
  "from": { "firm": "string" },
  "timestamp": "ISO8601",
  "withinMandate": true,
  "autoActioned": false,
  "requiresUWDecision": true
}
```

Sent to: `submission:{submissionId}` group.

---

#### `DevToolBuildLog`
Fired during Developer Agent tool build and startup. Streams build log lines.

```json
{
  "devToolId": "uuid",
  "taskId": "uuid",
  "logLine": "string",
  "phase": "generating | building | pushing | deploying | ready | failed",
  "toolUrl": "string | null"
}
```

`toolUrl` is populated once `phase == "ready"`.

Sent to: the specific connection that requested the tool (not group-broadcast — tool is
per-underwriter). Uses `Clients.Caller` or `Clients.Client(connectionId)`.

---

#### `NetworkPolicyApprovalRequired`
Fired when a DevTool network policy proposal is ready for underwriter review.

```json
{
  "devToolId": "uuid",
  "taskId": "uuid",
  "networkPolicyProposal": {
    "allowedEgress": ["string"],
    "reasoning": "string"
  }
}
```

Sent to: the specific connection that requested the tool.

---

#### `SubmissionStatusChanged`
Fired when a submission transitions state.

```json
{
  "submissionId": "uuid",
  "oldStatus": "in-review",
  "newStatus": "bound",
  "changedAt": "ISO8601",
  "changedBy": "userId"
}
```

Sent to: `submission:{submissionId}` group.

---

#### `PortfolioUpdated`
Fired after a portfolio snapshot is refreshed (e.g., after a bind event).

```json
{
  "snapshotId": "uuid",
  "generatedAt": "ISO8601",
  "kpis": {
    "totalGWP": 0,
    "aggregateLimit": 0,
    "largestSingleRisk": 0,
    "ytdLossRatio": 0.0
  }
}
```

Sent to: `user:{userId}` group (all connections for this user).

---

## Connection Lifecycle

1. Frontend establishes SignalR connection on app load using MSAL bearer token.
2. On Portfolio View load: client calls `JoinPortfolio()`.
3. On Submission View load: client calls `JoinSubmission(submissionId)`.
4. On navigation away from submission: client calls `LeaveSubmission(submissionId)`.
5. On app close / tab close: SignalR connection is dropped; server removes from all groups
   automatically. Ephemeral tool teardown grace period (5 minutes) starts.
