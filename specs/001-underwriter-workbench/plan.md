# Implementation Plan: Underwriter Workbench

**Branch**: `001-underwriter-workbench` | **Date**: 2026-03-26 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/001-underwriter-workbench/spec.md`

## Summary

A canvas-first AI workbench for specialty insurance underwriters. The underwriter orchestrates
four specialist AI agents (Legal, Names Clearance, Developer, B2B Comms) to handle submission
underwriting, FacRi negotiation, compliance checking, and on-demand tool generation. The
application is a React 18 + TypeScript SPA backed by an ASP.NET Core 9 REST + SignalR API,
with Azure Cosmos DB for persistence and OpenShift for DevTool pod isolation.

## Technical Context

**Language/Version**: C# (.NET 9) — backend; TypeScript 5 — frontend
**Primary Dependencies**: React 18, Vite, TailwindCSS (frontend); ASP.NET Core 9, SignalR,
  Azure Cosmos DB SDK, Anthropic .NET SDK (backend)
**Storage**: Azure Cosmos DB (NoSQL) — submissions, agent tasks, devtools; Azure Blob Storage — documents
**Testing**: Playwright (E2E); xUnit (backend unit + integration); agent contract tests with mocked Claude responses
**Target Platform**: Desktop web browser; hosted on Azure Container Apps (app) + OpenShift uw-devtools (tool pods)
**Project Type**: Web application (frontend + backend)
**Performance Goals**: Names clearance visible ≤30s; agent output visible ≤5s post-completion;
  DevTool available ≤3min post-approval; portfolio KPIs refresh ≤60s post-bind
**Constraints**: Single underwriter persona (v1); all external integrations mocked (sanctions,
  reinsurer endpoint, OpenShift, ACR); names clearance "blocked" prevents bind; legal escalate
  prevents bind
**Scale/Scope**: Single tenant v1; ~100 active submissions; single replica DevTool pods

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Canvas-First UX | ✅ PASS | Single-page SPA with flat Portfolio → Submission navigation. DevTools open in embedded panel. Chat drawer accessible via Ctrl+Space without navigation. |
| II. Agent-Mediated Automation | ✅ PASS | All four agent types dispatch typed `AgentTask` records with `subTasks[]`. Multi-step Developer Agent tracks each build step. Slash commands in chat drawer still produce AgentTask records. |
| III. Compliance & Audit by Design | ✅ PASS | Names clearance fires automatically on submission create (FR-002). Legal review required before bind (FR-005). All state transitions append `auditLog` entries (FR-006). NetworkPolicy approval event logged on AgentTask. |
| IV. Security & Sandboxing | ✅ PASS | Developer Agent uses OpenShift pod isolation with per-tool NetworkPolicy (not iframe). Underwriter must explicitly approve NetworkPolicy before pod starts (`POST /devtools/{id}/approve-network-policy`). HMAC-SHA256 on all B2B messages. All secrets via Azure Key Vault. Entra ID auth. |
| V. Bounded Scope (v1) | ✅ PASS | Claims, renewals, RBAC, mobile, live sanctions API, live reinsurer endpoints, DevTool versioning, pod auto-scaling — all excluded. Mock providers used throughout. |
| VI. Test Discipline | ✅ PASS | Playwright for E2E (submission creation, agent dispatch, binding flow, DevTool workflow). xUnit for backend. Agent contract tests against fixture mock responses — no live Claude API in CI. OpenShift API and ACR mocked in CI. NetworkPolicy approval-gating integration test included in task list. |

*Post-Phase 1 re-check: No violations introduced by data model or contract design.*

## Project Structure

### Documentation (this feature)

```text
specs/001-underwriter-workbench/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   ├── rest-api.md
│   ├── signalr-hubs.md
│   └── agent-schemas.md
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── UnderwriterWorkbench.Api/
│   │   ├── Controllers/
│   │   │   ├── SubmissionsController.cs
│   │   │   ├── LayersController.cs
│   │   │   ├── FacRiController.cs
│   │   │   ├── DocumentsController.cs
│   │   │   ├── AgentTasksController.cs
│   │   │   ├── B2BSessionsController.cs
│   │   │   ├── DevToolsController.cs
│   │   │   └── PortfolioController.cs
│   │   ├── Hubs/
│   │   │   └── WorkbenchHub.cs
│   │   └── Program.cs
│   ├── UnderwriterWorkbench.Core/
│   │   ├── Models/
│   │   │   ├── Submission.cs
│   │   │   ├── Layer.cs
│   │   │   ├── FacRiPanel.cs
│   │   │   ├── AgentTask.cs
│   │   │   ├── B2BSession.cs
│   │   │   ├── DevTool.cs
│   │   │   └── PortfolioSnapshot.cs
│   │   └── Interfaces/
│   │       ├── ISubmissionRepository.cs
│   │       ├── ISanctionsApiClient.cs
│   │       └── IDevAgentOrchestrator.cs
│   └── UnderwriterWorkbench.Infrastructure/
│       ├── Cosmos/
│       │   ├── CosmosDbInitializer.cs
│       │   └── SubmissionRepository.cs
│       ├── Agents/
│       │   ├── LegalAgentService.cs
│       │   ├── NamesClearanceService.cs
│       │   ├── DevAgentService.cs
│       │   └── B2BHostedService.cs
│       ├── Sanctions/
│       │   ├── MockSanctionsApiClient.cs
│       │   └── RealSanctionsApiClient.cs
│       ├── OpenShift/
│       │   ├── OpenShiftApiClient.cs
│       │   └── MockOpenShiftApiClient.cs
│       ├── Blob/
│       │   └── DocumentStorageService.cs
│       └── Portfolio/
│           └── PortfolioSnapshotService.cs
└── tests/
    ├── UnderwriterWorkbench.Unit/
    ├── UnderwriterWorkbench.Integration/
    └── UnderwriterWorkbench.Contract/
        └── fixtures/           # Recorded Claude API responses

frontend/
├── src/
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── PortfolioView.tsx
│   │   │   ├── SubmissionView.tsx
│   │   │   └── tabs/
│   │   │       ├── RiskSummaryTab.tsx
│   │   │       ├── LayerStructureTab.tsx
│   │   │       ├── DocumentsTab.tsx
│   │   │       ├── AgentsTab.tsx
│   │   │       └── AuditTab.tsx
│   │   ├── panels/
│   │   │   ├── ContextPanel.tsx
│   │   │   ├── AgentPanel.tsx
│   │   │   └── DevToolPanel.tsx
│   │   ├── drawers/
│   │   │   └── ChatDrawer.tsx
│   │   └── shared/
│   ├── services/
│   │   ├── api/
│   │   │   └── workbenchApi.ts
│   │   └── signalr/
│   │       └── workbenchHub.ts
│   ├── store/
│   │   ├── submissionStore.ts
│   │   └── portfolioStore.ts
│   └── App.tsx
└── tests/
    └── e2e/
        ├── submission-workflow.spec.ts
        ├── agent-dispatch.spec.ts
        ├── devtool-workflow.spec.ts
        └── portfolio-review.spec.ts

infrastructure/
├── docker/
│   └── Dockerfile.api
└── openshift/
    └── devtools-namespace.yaml
```

**Structure Decision**: Web application (Option 2). Backend is ASP.NET Core 9; frontend is
React 18 + TypeScript with Vite. Separated by concern: `Api` project (controllers, hubs),
`Core` project (models, interfaces), `Infrastructure` project (Cosmos, agents, OpenShift,
blob). This separation keeps business logic testable without infrastructure dependencies.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| OpenShift pod lifecycle (separate from Azure Container Apps) | Developer Agent generates real containerised tools requiring network isolation per Principle IV. An Azure Container Apps job or serverless function cannot provide NetworkPolicy-level egress control. | Azure Container Apps: no per-instance NetworkPolicy. Lambda/Functions: stateful tool sessions don't fit. iframe: explicitly rejected in constitution v1.1.0. |
| B2BHostedService (long-running hosted service) | B2B negotiations are async, multi-round, and can span minutes. A request-scoped handler cannot maintain the turn-based loop across multiple HTTP round-trips. | Request-scoped service: session state lost between rounds. Client-driven polling: puts negotiation logic in the browser, breaking the server-side mandate evaluation requirement. |
