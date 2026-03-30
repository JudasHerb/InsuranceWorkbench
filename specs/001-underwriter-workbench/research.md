# Research: Underwriter Workbench

**Branch**: `001-underwriter-workbench` | **Date**: 2026-03-26
**Input**: spec.md + constitution.md

## Summary

All technology choices are fully defined by the application spec. This research documents the
key architectural decisions required to implement the spec: Cosmos DB partitioning, SignalR hub
topology, OpenShift pod lifecycle, B2B mandate evaluation, and DevTool context contract.

---

## Decision 1: Cosmos DB Partitioning Strategy

**Decision**: Partition by `submissionId` for Submission, Layer, FacRiPanel, AgentTask, and
B2BSession documents. Partition by `ownerId` for DevTool documents. Use a dedicated container
for PortfolioSnapshot with `id` as partition key (low-write, read-heavy).

**Rationale**: Submissions are the primary access pattern — all queries for layers, FacRi
panels, agent tasks, and audit log entries are scoped to a single submission. Co-locating these
by `submissionId` eliminates cross-partition reads for the hot path. DevTools are per-user, so
`ownerId` collocates a user's tool library. v1 is single-tenant so tenant-level partitioning
adds no benefit.

**Alternatives considered**:
- Partition by `tenantId`: Premature for v1 single-tenant. Revisit for v2.
- Single container for all documents with type discriminator: Simpler but leads to hot partitions
  on the submission partition as agent tasks accumulate.

---

## Decision 2: SignalR Hub Topology

**Decision**: Single `WorkbenchHub` with submission-scoped groups (`submission:{id}`) and a
user-scoped group (`user:{userId}`) for portfolio-level updates. Clients join the relevant
group on page load and leave on navigation.

**Rationale**: Grouping by submission allows agent task streaming and B2B transcript events to
be broadcast only to the client(s) viewing that submission. Portfolio KPI updates are infrequent
and can be sent to the user-scoped group. A single hub minimises connection overhead.

**Events streamed**:
- `AgentTaskUpdate` — status, streaming output chunk, or final result for a task
- `B2BMessageReceived` — new message in a B2B session transcript
- `DevToolBuildLog` — build/startup log line for a Developer Agent tool
- `SubmissionStatusChanged` — bind or state transition event
- `PortfolioUpdated` — KPI refresh after a bind event

**Alternatives considered**:
- One hub per agent type: Increases connection complexity with no benefit.
- Polling: Explicitly rejected by Principle IV of the constitution (SignalR is mandatory).

---

## Decision 3: OpenShift Pod Lifecycle Management

**Decision**: `DevAgentService` (C# hosted service) manages the full pod lifecycle:
generate → build → push → create pod → provision route → tear down.

**Ephemeral teardown trigger**: Pod is deleted when the frontend sends a `CloseTool` SignalR
message, or when a session-end event fires (connection drop + configurable grace period of 5
minutes). A background `DevToolCleanupJob` runs every 15 minutes to reap orphaned ephemeral
pods older than 30 minutes.

**Persistent pod management**: Promoted tools keep their pod running. The route URL is stable
and persisted in the `DevTool` document. On reopening, the service checks pod health via the
OpenShift API and restarts if stopped.

**Namespace**: `uw-devtools` is the fixed namespace. Each pod is named `devtool-{devToolId}`.
Routes follow `devtool-{devToolId}.apps.{openshift-base-domain}`.

**Alternatives considered**:
- Kubernetes Jobs instead of long-running Pods: Unsuitable — tools need to stay running while
  the underwriter interacts with them.
- iframe sandboxing: Rejected in constitution v1.1.0; replaced by container isolation.

---

## Decision 4: B2B Mandate Evaluation

**Decision**: Claude (claude-opus-4-6) evaluates each counterparty response against the mandate
as a structured tool_use call. The evaluation prompt includes the full mandate definition and
the incoming message payload. The tool returns `{ withinMandate: bool, reasoning: string,
suggestedAction: "accept|reject|counter|escalate" }`.

**Mandate structure**:
```json
{
  "maxCessionPct": 0.40,
  "minReinsurerLineSizePct": 0.10,
  "rateRange": { "min": 0.02, "max": 0.05 },
  "escalationThreshold": "Any cession above 35% requires UW sign-off"
}
```

**Rationale**: Using Claude for mandate evaluation allows nuanced interpretation of ambiguous
counterparty responses (e.g., soft rejections, conditional acceptances) rather than brittle
rule matching. The structured tool_use output ensures deterministic downstream branching.

**Alternatives considered**:
- Rules engine (explicit threshold comparisons): Rigid; cannot handle counterparty language
  variation or conditional terms.
- LLM-only decision with no tool_use: Produces unstructured output that is hard to act on
  programmatically.

---

## Decision 5: DevTool Submission Context Contract

**Decision**: When a DevTool pod starts (or is re-launched on a new submission), the workbench
API pushes a `SubmissionContext` payload to the tool via a secure endpoint on the pod. The pod
exposes `POST /context` authenticated with a session-scoped bearer token generated at pod
creation time.

**SubmissionContext schema**:
```json
{
  "submissionId": "uuid",
  "riskDetails": { "insured": "string", "territory": "string", "lineOfBusiness": "string" },
  "layers": [{ "layerNo": 1, "limit": 0, "attachmentPoint": 0, "lineSize": 0, "premium": 0 }],
  "currency": "USD"
}
```

The `submissionContextSchema` field on the `DevTool` document stores the schema version so
the workbench can validate compatibility when reopening the tool on a future submission.

**Rationale**: Push-on-open is simpler than polling and avoids the tool needing workbench API
credentials. The session token is single-use (generated per launch) and short-lived (1 hour).

**Alternatives considered**:
- Tool calls back to workbench API with credentials: Requires the tool to hold long-lived
  credentials, which broadens the blast radius of a compromised tool.
- Embed context in the route URL as query params: Size-limited and logs-visible; unsuitable
  for financial data.

---

## Decision 6: Names Clearance Mock Architecture

**Decision**: A `SanctionsApiClient` interface abstracts the external dependency.
`MockSanctionsApiClient` is wired in non-production environments via dependency injection
configuration. The mock returns deterministic results based on name patterns:
- Names containing "TEST_CLEAR" → clear
- Names containing "TEST_REFER" → refer
- Names containing "TEST_BLOCK" → blocked
- All other names → clear (safe default for dev)

**Rationale**: Allows E2E tests to cover all three clearance paths without hitting a real API.
The interface boundary means swapping in a real implementation in production requires only a
DI configuration change, not code changes.

---

## Decision 7: Document Storage

**Decision**: Uploaded documents (PDF, DOCX) are stored in **Azure Blob Storage** in a
dedicated container `uw-documents`. The Cosmos `Submission` document stores a `documents[]`
array of metadata objects: `{ documentId, fileName, blobUrl, uploadedAt, uploadedBy }`.
The blob URL is a SAS URL with 1-hour expiry, regenerated on each access request.

**Rationale**: Cosmos DB is not a binary store. Azure Blob Storage is the natural choice
within the Azure ecosystem. SAS URL expiry limits exposure if a URL leaks.

**Alternatives considered**:
- Store base64 in Cosmos: Document size limits (2MB) make this impractical for wordings.
- Shared permanent URLs: Reduces security posture; SAS with short TTL is the correct pattern.

**Note**: This adds Azure Blob Storage to the stack (not listed in the original spec table —
update the constitution in a future amendment or treat as implementation detail under Cosmos DB
since the Cosmos document stores the metadata). For v1, treat as implementation detail.
