# Tasks: Underwriter Workbench

**Input**: Design documents from `specs/001-underwriter-workbench/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Exact file paths included in every task description

## Path Conventions

Following the web app structure from plan.md:

- Backend: `backend/src/`, `backend/tests/`
- Frontend: `frontend/src/`, `frontend/tests/`
- Infrastructure: `infrastructure/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, solution structure, and base configuration

- [x] T001 Create backend .NET 9 solution with projects Api, Core, Infrastructure plus test projects Unit, Integration, Contract per plan.md at `backend/`
- [x] T002 [P] Scaffold frontend React 18 + Vite + TypeScript project with TailwindCSS at `frontend/` via `npm create vite@latest`
- [x] T003 [P] Add backend NuGet packages: ASP.NET Core 9, Microsoft.Azure.Cosmos, Azure.Storage.Blobs, Microsoft.AspNetCore.SignalR, Anthropic .NET SDK, xUnit, Swashbuckle to `backend/src/`
- [x] T004 [P] Install frontend npm packages: react-router-dom, @microsoft/signalr, zustand, axios, @tailwindcss/forms to `frontend/package.json`
- [x] T005 [P] Create `infrastructure/docker/Dockerfile.api` for ASP.NET Core 9 API and `infrastructure/openshift/devtools-namespace.yaml` for uw-devtools namespace
- [x] T006 [P] Create `backend/appsettings.json`, `backend/appsettings.Development.json.example`, and `backend/appsettings.Testing.json` with all config sections (CosmosDb, Claude, Sanctions, DevAgent, B2B, BlobStorage, Entra ID)

**Checkpoint**: Solution builds; frontend dev server starts; all config templates committed

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core domain models, interfaces, database bootstrap, auth, and SignalR hub — required before any user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 [P] Implement Core domain models: `Submission.cs`, `Layer.cs`, `FacRiPanel.cs`, `DocumentRef.cs`, `AuditLogEntry.cs` in `backend/src/UnderwriterWorkbench.Core/Models/` with all fields per data-model.md
- [x] T008 [P] Implement Core domain models: `AgentTask.cs`, `B2BSession.cs`, `DevTool.cs`, `PortfolioSnapshot.cs` in `backend/src/UnderwriterWorkbench.Core/Models/` with all fields per data-model.md
- [x] T009 [P] Implement Core interfaces: `ISubmissionRepository.cs` (CRUD + layer/facri/agentTask/b2bSession/auditLog operations), `ISanctionsApiClient.cs`, `IDevAgentOrchestrator.cs` in `backend/src/UnderwriterWorkbench.Core/Interfaces/`
- [x] T010 Implement `CosmosDbInitializer.cs` in `backend/src/UnderwriterWorkbench.Infrastructure/Cosmos/CosmosDbInitializer.cs` — create containers: `submissions` (pk: `/submissionId`), `devtools` (pk: `/ownerId`), `portfolio` (pk: `/id`) on startup
- [x] T011 Implement `SubmissionRepository.cs` in `backend/src/UnderwriterWorkbench.Infrastructure/Cosmos/SubmissionRepository.cs` implementing `ISubmissionRepository` — full CRUD for Submission documents including nested Layer, FacRiPanel, AgentTask, B2BSession, and AuditLogEntry patch operations
- [x] T012 [P] Implement `MockSanctionsApiClient.cs` in `backend/src/UnderwriterWorkbench.Infrastructure/Sanctions/MockSanctionsApiClient.cs` — TEST_CLEAR→clear, TEST_REFER→refer, TEST_BLOCK→blocked, all other names→clear
- [x] T013 [P] Implement `DocumentStorageService.cs` in `backend/src/UnderwriterWorkbench.Infrastructure/Blob/DocumentStorageService.cs` — upload PDF/DOCX to `uw-documents` Azurite container; generate SAS URL with 1-hour TTL on demand
- [x] T014 [P] Implement `WorkbenchHub.cs` in `backend/src/UnderwriterWorkbench.Api/Hubs/WorkbenchHub.cs` — client→server: JoinSubmission, LeaveSubmission, JoinPortfolio, LeavePortfolio, CloseTool; server→client: AgentTaskUpdate, B2BMessageReceived, DevToolBuildLog, NetworkPolicyApprovalRequired, SubmissionStatusChanged, PortfolioUpdated per signalr-hubs.md
- [x] T015 Configure `backend/src/UnderwriterWorkbench.Api/Program.cs` — DI: ISubmissionRepository→SubmissionRepository, ISanctionsApiClient→MockSanctionsApiClient, SignalR, Entra ID JWT auth, DocumentStorageService, CosmosDbInitializer on startup
- [x] T016 [P] Scaffold `frontend/src/App.tsx` with React Router v6 routes (/ → PortfolioView, /submissions/:id → SubmissionView), TailwindCSS global styles, SignalR provider context, and Zustand store initialization
- [x] T017 [P] Implement `frontend/src/services/api/workbenchApi.ts` — axios instance with `/api/v1` base URL and MSAL bearer token request interceptor; typed stubs for all endpoint groups (filled per story)
- [x] T018 [P] Implement `frontend/src/services/signalr/workbenchHub.ts` — establish connection to `/hubs/workbench` with MSAL token; expose joinSubmission, leaveSubmission, joinPortfolio, leavePortfolio, closeTool; register typed handlers for all server→client events per signalr-hubs.md
- [x] T019 [P] Implement `frontend/src/store/submissionStore.ts` (Zustand — currentSubmission, layers, facriPanels, agentTasks, auditLog, actions) and `frontend/src/store/portfolioStore.ts` (snapshot, filters, actions)

**Checkpoint**: Foundation ready — domain models compile, Cosmos containers initialise, SignalR hub registered, frontend routes resolve

---

## Phase 3: User Story 1 — Submit and Bind a New Risk (Priority: P1) 🎯 MVP

**Goal**: Underwriter can create a submission, add layers, upload a wording document, dispatch a legal review, and bind. Names clearance runs automatically on submission creation.

**Independent Test**: Create a new submission with all required fields → add one layer → upload a PDF → dispatch legal review from Agents tab → click Bind → confirm status is "Bound" and portfolio KPI count increments.

### Backend

- [x] T020 [P] [US1] Implement `SubmissionsController.cs` in `backend/src/UnderwriterWorkbench.Api/Controllers/SubmissionsController.cs` — POST /submissions (create submission, trigger NamesClearanceService async), GET /submissions (paginated with status/territory/LOB/cedant filters), GET /submissions/{id}, PATCH /submissions/{id} per rest-api.md
- [x] T021 [US1] Implement `POST /submissions/{id}/bind` action in `backend/src/UnderwriterWorkbench.Api/Controllers/SubmissionsController.cs` — enforce gates: namesClearance.status ≠ "blocked", legalReview.recommendation ∈ {"approve","amend"}, ≥1 layer; return 422 BIND_BLOCKED with reason field; broadcast SubmissionStatusChanged via SignalR; trigger PortfolioSnapshotService refresh
- [x] T022 [P] [US1] Implement `LayersController.cs` in `backend/src/UnderwriterWorkbench.Api/Controllers/LayersController.cs` — POST /submissions/{id}/layers, PUT /submissions/{id}/layers/{layerId}, DELETE /submissions/{id}/layers/{layerId} (blocked if submission is bound); append layer-added/layer-removed audit entries
- [x] T023 [P] [US1] Implement `DocumentsController.cs` in `backend/src/UnderwriterWorkbench.Api/Controllers/DocumentsController.cs` — POST /submissions/{id}/documents multipart upload (PDF/DOCX via DocumentStorageService, append DocumentRef to submission); GET /submissions/{id}/documents/{docId}/download-url (1-hour SAS URL)
- [x] T024 [US1] Implement `NamesClearanceService.cs` in `backend/src/UnderwriterWorkbench.Infrastructure/Agents/NamesClearanceService.cs` — create AgentTask (agentType: names-clearance), run sub-tasks (insured-check, cedant-check, broker-check) via ISanctionsApiClient, compute overallStatus (blocked>refer>clear), persist output on AgentTask, update submission.namesClearance, broadcast AgentTaskUpdate chunks via SignalR, append names-clearance-complete audit entry
- [x] T025 [US1] Implement `LegalAgentService.cs` in `backend/src/UnderwriterWorkbench.Infrastructure/Agents/LegalAgentService.cs` — dispatch legal review via Anthropic .NET SDK (claude-opus-4-6) with streaming; sub-tasks: document-extraction, clause-analysis, jurisdiction-check; stream outputChunk via SignalR AgentTaskUpdate; persist final output (summary, flags[], recommendation) on AgentTask; update submission.legalReview; append legal-review-dispatched and legal-review-complete audit entries
- [x] T026 [US1] Implement `AgentTasksController.cs` in `backend/src/UnderwriterWorkbench.Api/Controllers/AgentTasksController.cs` — POST /submissions/{id}/agent-tasks (dispatch legal review; names-clearance dispatched automatically from SubmissionsController on creation); GET /submissions/{id}/agent-tasks; GET /submissions/{id}/agent-tasks/{taskId} per rest-api.md
- [x] T027 [US1] Wire audit log appending in `backend/src/UnderwriterWorkbench.Infrastructure/Cosmos/SubmissionRepository.cs` for all US1 state transitions: submission-created, layer-added, layer-removed, document-uploaded, names-clearance-complete, legal-review-dispatched, legal-review-complete, submission-bound, submission-declined

### Frontend

- [x] T028 [P] [US1] Implement `frontend/src/components/canvas/PortfolioView.tsx` — KPI strip (totalGWP, aggregateLimit, largestSingleRisk, ytdLossRatio), risk register table (sortable/filterable columns: cedant, LOB, territory, status, expiry), New Submission modal; calls GET /portfolio and GET /submissions; handles PortfolioUpdated SignalR event
- [x] T029 [P] [US1] Implement `frontend/src/components/canvas/SubmissionView.tsx` — tab layout host for RiskSummaryTab, LayerStructureTab, DocumentsTab, AgentsTab, AuditTab; calls joinSubmission on mount and leaveSubmission on unmount; dispatches AgentTaskUpdate events from workbenchHub to submissionStore
- [x] T030 [P] [US1] Implement `frontend/src/components/canvas/tabs/RiskSummaryTab.tsx` — display all riskDetails fields (insuredName, cedant, broker, territory, LOB, coverageType, inception/expiry dates); names clearance status badge (clear=green, refer=amber with acknowledge gate, blocked=red with bind lock); Bind button with gate enforcement; calls PATCH /submissions/{id} and POST /submissions/{id}/bind
- [x] T031 [P] [US1] Implement `frontend/src/components/canvas/tabs/LayerStructureTab.tsx` — layer table with columns layerNo, layerType, limit, attachmentPoint, lineSize, premium, currency, status; add/edit/delete row actions; total line exposure computed and shown in submission header; calls POST/PUT/DELETE /submissions/{id}/layers
- [x] T032 [P] [US1] Implement `frontend/src/components/canvas/tabs/DocumentsTab.tsx` — file upload input accepting .pdf and .docx only; document list with fileName, documentType, uploadedAt; download button (calls GET download-url then opens SAS URL in new tab); calls POST /submissions/{id}/documents
- [x] T033 [P] [US1] Implement `frontend/src/components/canvas/tabs/AgentsTab.tsx` — list of agent tasks with agentType badge, status indicator, completedAt; Dispatch Legal Review button opening modal (select document, checklist type, jurisdiction); calls POST /submissions/{id}/agent-tasks with agentType "legal"
- [x] T034 [P] [US1] Implement `frontend/src/components/canvas/tabs/AuditTab.tsx` — vertical timeline of AuditLogEntry items showing timestamp, actor.displayName (user or agent), action label, summary text; read from submission.auditLog in submissionStore
- [x] T035 [US1] Implement `frontend/src/components/panels/AgentPanel.tsx` — real-time streaming output panel consuming AgentTaskUpdate SignalR events; sub-task progress list with queued/running/complete/failed indicators; final legal review result display (summary prose, flags table with clause/severity/note, recommendation badge)
- [x] T036 [US1] Implement `frontend/src/components/panels/ContextPanel.tsx` — submission context sidebar: insuredName, territory, LOB, names clearance status indicator (clear/refer/blocked), layer count, current legal recommendation; updates from submissionStore
- [x] T037 [US1] Add workbenchApi.ts methods in `frontend/src/services/api/workbenchApi.ts`: createSubmission, listSubmissions, getSubmission, updateSubmission, bindSubmission, addLayer, updateLayer, deleteLayer, uploadDocument, getDocumentDownloadUrl, dispatchAgentTask, listAgentTasks, getAgentTask

**Checkpoint**: User Story 1 fully functional — submission creation, names clearance, layers, document upload, legal review streaming, bind gates, and audit log all work end-to-end

---

## Phase 4: User Story 2 — Manage FacRi Panels and Negotiate via B2B (Priority: P2)

**Goal**: Underwriter can add FacRi panels to a layer, initiate AI-to-AI B2B negotiation with a mandate, auto-accept within-mandate terms, escalate out-of-mandate terms, and audit the session.

**Independent Test**: On a submission with one layer, add a FacRi panel (cession 25%, reinsurer "Simulated Re") → initiate B2B session with mandate maxCession 30% → simulated responder proposes 25% cession → confirm terms auto-accepted, FacRi record updated, session transcript visible in Agent Panel.

### Backend

- [x] T038 [P] [US2] Implement `FacRiController.cs` in `backend/src/UnderwriterWorkbench.Api/Controllers/FacRiController.cs` — POST /submissions/{id}/layers/{layerId}/facri (add FacRi panel, append audit entry); DELETE /submissions/{id}/layers/{layerId}/facri/{facriPanelId} per rest-api.md
- [x] T039 [P] [US2] Implement `B2BSessionsController.cs` in `backend/src/UnderwriterWorkbench.Api/Controllers/B2BSessionsController.cs` — POST /submissions/{id}/b2b-sessions (create B2BSession document, enqueue to B2BHostedService, return 201 with sessionId); GET /submissions/{id}/b2b-sessions/{sessionId} (session status and transcript); POST /submissions/{id}/b2b-sessions/{sessionId}/respond (UW manual action: accept/reject/counter)
- [x] T040 [US2] Implement `B2BHostedService.cs` in `backend/src/UnderwriterWorkbench.Infrastructure/Agents/B2BHostedService.cs` — long-running IHostedService managing negotiation queue; per round: build HMAC-SHA256-signed B2BMessage envelope (per agent-schemas.md), call counterparty endpoint (mock responder), evaluate response via Claude claude-opus-4-6 mandate tool_use call returning {withinMandate, reasoning, suggestedAction}, auto-accept if withinMandate=true (write finalTerms to FacRi, mark session "agreed"), counter/escalate otherwise; broadcast B2BMessageReceived via SignalR; move to "stalled" on timeout; append b2b-session-started and b2b-terms-agreed audit entries
- [x] T041 [US2] Implement inline simulated B2B counterparty responder in `backend/src/UnderwriterWorkbench.Infrastructure/Agents/B2BHostedService.cs` — accepts proposals with cession ≤ 30%; counters with cession = 30% when proposal exceeds threshold; generates HMAC-SHA256-signed response envelopes

### Frontend

- [x] T042 [US2] Extend `frontend/src/components/canvas/tabs/LayerStructureTab.tsx` to show FacRi sub-rows under each layer — reinsurerName, cededPct, agreedTerms, status badge; Add FacRi Panel form (cession %, reinsurer name, optional agent endpoint); Initiate B2B Session button per FacRi panel with mandate input (maxCessionPct, minReinsurerLineSizePct, rateRange); calls POST facri and POST b2b-sessions
- [x] T043 [US2] Extend `frontend/src/components/panels/AgentPanel.tsx` with B2B transcript view — message list with from firm, messageType badge, withinMandate indicator, timestamp; mandate summary sidebar; UW decision prompt (Accept / Reject / Counter buttons with counterPayload form) when requiresUWDecision=true; receives B2BMessageReceived SignalR events from workbenchHub
- [x] T044 [P] [US2] Add workbenchApi.ts methods in `frontend/src/services/api/workbenchApi.ts`: createFacriPanel, deleteFacriPanel, initB2BSession, getB2BSession, respondToB2BSession

**Checkpoint**: User Stories 1 and 2 both functional — FacRi panels, B2B negotiation loop, auto-accept, mandate escalation, and session audit all work

---

## Phase 5: User Story 3 — Build, Use, and Save a Developer Tool (Priority: P3)

**Goal**: Underwriter requests a custom tool via /dev command, approves the network access policy, watches real-time build progress, uses the tool in an embedded panel, and saves it to My Tools.

**Independent Test**: Type `/dev layer pricing calculator` in chat drawer → confirm NetworkPolicyApprovalRequired event fires with allowedEgress list → approve → confirm DevToolBuildLog phases stream (generating → building → pushing → deploying → ready) → tool opens in DevToolPanel → click "Keep this tool", enter name → tool appears in GET /devtools list.

### Backend

- [x] T045 [P] [US3] Implement `DevToolsController.cs` in `backend/src/UnderwriterWorkbench.Api/Controllers/DevToolsController.cs` — POST /devtools (create DevTool document, dispatch to DevAgentService, return 202 with devToolId + networkPolicyProposal); POST /devtools/{id}/approve-network-policy (approved=true starts pod provisioning, approved=false transitions to failed); POST /devtools/{id}/promote (ephemeral→persistent, persist name+description, stable routeUrl); GET /devtools (list user's persistent tools); POST /devtools/{id}/open (re-launch on new submission, push SubmissionContext to pod POST /context with session bearer token); DELETE /devtools/{id} per rest-api.md
- [x] T046 [P] [US3] Implement `MockOpenShiftApiClient.cs` in `backend/src/UnderwriterWorkbench.Infrastructure/OpenShift/MockOpenShiftApiClient.cs` and interface stub `OpenShiftApiClient.cs` in same folder — in-memory pod registry; operations: createPod, deletePod, getPodStatus; provisionRoute returning mock URL `devtool-{id}.apps.mock.local`
- [x] T047 [US3] Implement `DevAgentService.cs` in `backend/src/UnderwriterWorkbench.Infrastructure/Agents/DevAgentService.cs` — full lifecycle via sub-tasks: (1) code-generation via Anthropic SDK, (2) network-policy-proposal, (3) fire NetworkPolicyApprovalRequired SignalR event to sessionConnectionId and await UW approval gate, (4) mock docker-build (no-op) + acr-push, (5) openshift-pod-create via IOpenShiftApiClient, (6) openshift-route-provision, (7) push SubmissionContext JSON to pod POST /context with session-scoped bearer token; stream each phase via DevToolBuildLog SignalR events; update DevTool.podStatus at each transition; append devtool-built and networkpolicy-approved audit entries
- [x] T048 [US3] Implement `DevToolCleanupJob.cs` in `backend/src/UnderwriterWorkbench.Infrastructure/OpenShift/DevToolCleanupJob.cs` — IHostedService running every 15 minutes; query Cosmos devtools container for ephemeral=true pods older than 30 minutes; call IOpenShiftApiClient.deletePod for each; implement OnDisconnectedAsync in `backend/src/UnderwriterWorkbench.Api/Hubs/WorkbenchHub.cs` with 5-minute grace period before triggering cleanup for disconnected connectionId

### Frontend

- [x] T049 [US3] Implement `frontend/src/components/drawers/ChatDrawer.tsx` — accessible via Ctrl+Space keyboard shortcut and footer button without navigating away; message list with user/agent turns; slash command detection and routing: /legal→dispatch legal agent task, /names→dispatch names-clearance task, /dev→POST /devtools with taskDescription, /b2b→initiate B2B flow; chat history per submission persisted in submissionStore; calls appropriate workbenchApi methods per command
- [x] T050 [US3] Implement `frontend/src/components/panels/DevToolPanel.tsx` — network policy approval modal (display allowedEgress URLs + reasoning, Approve/Reject buttons calling POST /devtools/{id}/approve-network-policy); build progress display streaming DevToolBuildLog SignalR events (phase stepper: generating→building→pushing→deploying→ready; log line output); iframe showing tool routeUrl once phase=ready; "Keep this tool" button opens name+description dialog calling POST /devtools/{id}/promote; close button calls CloseTool SignalR message
- [x] T051 [P] [US3] Add workbenchApi.ts methods in `frontend/src/services/api/workbenchApi.ts`: createDevTool, approveDevToolNetworkPolicy, promoteDevTool, listDevTools, openDevTool, deleteDevTool

**Checkpoint**: User Story 3 fully functional — /dev command, network policy gate, real-time build log, embedded DevTool panel, My Tools save and reopen all work

---

## Phase 6: User Story 4 — Portfolio Review and Exposure Analysis (Priority: P4)

**Goal**: Underwriter can view KPI strip and exposure heatmap, filter by territory and LOB, and dispatch batch legal review across selected submissions.

**Independent Test**: With ≥3 bound submissions across different territories, open Portfolio View → apply territory filter "North America" → confirm heatmap and risk register update to show only matching submissions → select 2 submissions → click Dispatch Batch Legal Review → verify one AgentTask per submission created and visible in each submission's Agents tab.

### Backend

- [x] T052 [P] [US4] Implement `PortfolioController.cs` in `backend/src/UnderwriterWorkbench.Api/Controllers/PortfolioController.cs` — GET /portfolio (return latest PortfolioSnapshot; apply territory/lineOfBusiness/status query param filters to exposureMatrix and risk register); POST /portfolio/refresh (invoke PortfolioSnapshotService, return 202 with snapshotId) per rest-api.md
- [x] T053 [US4] Implement `PortfolioSnapshotService.cs` in `backend/src/UnderwriterWorkbench.Infrastructure/Portfolio/PortfolioSnapshotService.cs` — query all active submissions; compute KPIs (totalGWP, aggregateLimit, largestSingleRisk, ytdLossRatio); build exposureMatrix (territory × LOB → totalLimit, submissionCount); persist PortfolioSnapshot to `portfolio` container; broadcast PortfolioUpdated SignalR event to user:{userId} group; called from SubmissionsController bind action and POST /portfolio/refresh
- [x] T054 [US4] Add batch legal review to `backend/src/UnderwriterWorkbench.Api/Controllers/AgentTasksController.cs` — POST /agent-tasks/batch: validate submissionIds[], dispatch one LegalAgentService task per submission, return [{submissionId, taskId}] per rest-api.md

### Frontend

- [x] T055 [US4] Extend `frontend/src/components/canvas/PortfolioView.tsx` with exposure heatmap — territory × LOB grid below KPI strip; cell background intensity proportional to totalLimit from exposureMatrix; hover tooltip showing submissionCount and totalLimit; renders from portfolioStore.snapshot.exposureMatrix
- [x] T056 [P] [US4] Add filter controls to `frontend/src/components/canvas/PortfolioView.tsx` — territory dropdown, LOB dropdown, status select; bind to portfolioStore.filters; re-fetch GET /portfolio with filter params on change; handle PortfolioUpdated SignalR event to refresh portfolioStore.snapshot
- [x] T057 [P] [US4] Add multi-select and batch legal review to `frontend/src/components/canvas/PortfolioView.tsx` risk register — checkbox column per row; "Dispatch Batch Legal Review" button enabled when ≥1 row selected; calls POST /agent-tasks/batch; show per-submission task status indicator in the row after dispatch
- [x] T058 [P] [US4] Add workbenchApi.ts methods in `frontend/src/services/api/workbenchApi.ts`: getPortfolio, refreshPortfolio, dispatchBatchAgentTask

**Checkpoint**: All four user stories functional — portfolio KPIs, exposure heatmap, territory/LOB filters, and batch legal review all work

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Auth hardening, error handling, OpenAPI docs, connection lifecycle, and end-to-end validation

- [x] T059 [P] Wire Entra ID JWT bearer auth in `backend/src/UnderwriterWorkbench.Api/Program.cs` — AddMicrosoftIdentityWebApiAuthentication; add [Authorize] on all controllers and WorkbenchHub; configure SignalR to accept bearer token from query string `access_token`
- [x] T060 [P] Implement global exception handler middleware in `backend/src/UnderwriterWorkbench.Api/Program.cs` — UseExceptionHandler returning RFC 7807 ProblemDetails; structured ILogger logging for all unhandled exceptions with correlation IDs
- [x] T061 [P] Add Swashbuckle OpenAPI in `backend/src/UnderwriterWorkbench.Api/Program.cs` — AddSwaggerGen with Entra ID security scheme; UseSwaggerUI in Development environment; document all REST endpoints
- [x] T062 Implement `OnDisconnectedAsync` in `backend/src/UnderwriterWorkbench.Api/Hubs/WorkbenchHub.cs` — on connection drop, schedule 5-minute grace period timer per connectionId; if not reconnected within grace period, trigger ephemeral DevTool pod teardown for any active tool associated with that connection; cancel timer on reconnect
- [x] T063 [P] Add frontend error boundary and toast notification system in `frontend/src/App.tsx` — React ErrorBoundary wrapping the router; toast hook for: API error responses, names clearance "blocked" alert, names clearance "refer" acknowledgement prompt, B2B session "stalled" notification, DevTool build failure with retry option
- [x] T064 [P] Configure Vite dev proxy in `frontend/vite.config.ts` — proxy `/api` and `/hubs` to `https://localhost:7001`; configure HTTPS for local dev cert
- [x] T065 Run quickstart.md validation — execute all 9 smoke-test steps from `specs/001-underwriter-workbench/quickstart.md` against the running local stack; verify all mock services (Sanctions, DevAgent, B2B, OpenShift, ACR, Blob) behave as documented

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **User Stories (Phases 3–6)**: All depend on Phase 2 completion
  - US1 (Phase 3): No user story dependencies — start immediately after Phase 2
  - US2 (Phase 4): Requires at least one layer on a submission — US1 provides the foundation; can start after Phase 2 with US1 in parallel
  - US3 (Phase 5): Requires an active submission for context — US1 provides this; can start after Phase 2
  - US4 (Phase 6): Requires multiple bound submissions — US1 provides this; can start after Phase 2
- **Polish (Phase 7)**: Depends on all desired user stories complete

### Within Each User Story

- Models and interfaces (Phase 2) before services
- Services before controllers
- Controllers before frontend components
- API client methods (workbenchApi.ts additions) alongside component implementation
- Each story ships a complete vertical slice independently testable

### Parallel Opportunities

| Phase | Parallel groups |
|-------|----------------|
| Setup (Phase 1) | T002, T003, T004, T005, T006 after T001 |
| Foundational (Phase 2) | T007+T008+T009 (models/interfaces), T012+T013 (mock providers), T014 (hub), T016+T017+T018+T019 (frontend bootstrap) — all after T010+T011 |
| US1 Backend | T020+T022+T023 (controllers) in parallel, then T024+T025 (services), then T026+T027 |
| US1 Frontend | T028, T029, T030, T031, T032, T033, T034 all in parallel, then T035+T036, then T037 |
| US2 | T038+T039 (controllers) in parallel, then T040+T041 (hosted service), T042+T043, T044 |
| US3 | T045+T046 (controller + mock OpenShift) in parallel, then T047+T048 (agent + cleanup), T049+T050, T051 |
| US4 | T052+T054 (controllers) in parallel, T053 (snapshot service), T055+T056+T057 (frontend extensions), T058 |
| Polish (Phase 7) | T059, T060, T061, T063, T064 all in parallel; T062 sequential (extends WorkbenchHub from T014); T065 last |

---

## Parallel Example: User Story 1

```bash
# Backend — after Phase 2 completes, run in parallel:
Task T020: Implement SubmissionsController.cs (GET/POST/PATCH)
Task T022: Implement LayersController.cs
Task T023: Implement DocumentsController.cs

# Then (services depend on models from Phase 2):
Task T024: NamesClearanceService.cs
Task T025: LegalAgentService.cs

# Then (controllers depend on services):
Task T026: AgentTasksController.cs
Task T027: Audit log wiring in SubmissionRepository.cs

# Frontend — after Phase 2 completes, run in parallel:
Task T028: PortfolioView.tsx
Task T029: SubmissionView.tsx
Task T030: RiskSummaryTab.tsx
Task T031: LayerStructureTab.tsx
Task T032: DocumentsTab.tsx
Task T033: AgentsTab.tsx
Task T034: AuditTab.tsx

# Then (panels depend on stores from Phase 2):
Task T035: AgentPanel.tsx
Task T036: ContextPanel.tsx

# Then (API client fills in stubs):
Task T037: workbenchApi.ts US1 methods
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (Submit and Bind)
4. **STOP and VALIDATE**: Run quickstart.md smoke test steps 1–9
5. Demo: create submission → names clearance auto-fires → add layer → upload document → dispatch legal review → streaming output appears → bind → portfolio KPI updates

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. User Story 1 → **MVP** — core daily submission-to-bind workflow
3. User Story 2 → FacRi panels and B2B negotiation added
4. User Story 3 → Developer Tool workflow added
5. User Story 4 → Portfolio analytics and batch operations added
6. Polish → Production-ready hardening

### Parallel Team Strategy

With multiple developers, after Phase 2 completes:

- **Developer A**: User Story 1 (critical path — every other story builds on bound submissions)
- **Developer B**: User Story 2 backend (B2BHostedService, FacRi — complex concurrency work)
- **Developer C**: User Story 3 backend (DevAgentService, OpenShift lifecycle — isolated concern)
- **Developer D**: User Story 4 + Polish (portfolio snapshot service, exposure heatmap, auth wiring)

---

## Notes

- [P] tasks operate on different files with no cross-task dependencies — safe to run concurrently
- [USn] label maps each task to a specific user story for traceability and independent delivery
- All external integrations use mock providers in development and CI — no live API calls required (see quickstart.md §6)
- Agent tasks use `claude-opus-4-6` as specified in research.md Decision 4
- Names clearance triggers automatically on submission create (FR-002) — wired in SubmissionsController calling NamesClearanceService
- Bind gate (FR-004, FR-005) enforced server-side in POST /submissions/{id}/bind — not client-side only
- HMAC-SHA256 signing required on all B2B wire messages per agent-schemas.md B2B Message Envelope
- DevTool ephemeral cleanup has two triggers: CloseTool SignalR message (T050) and OnDisconnectedAsync grace period (T062)
- Commit after each completed task or logical group; verify the incremental build passes before proceeding
