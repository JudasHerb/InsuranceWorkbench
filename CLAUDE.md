# Underwriter Workbench Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-30

## Active Technologies

- C# (.NET 9) + React 18 (TypeScript) + ASP.NET Core 9 + SignalR (001-underwriter-workbench)
- Azure Cosmos DB + Azure Blob Storage (001-underwriter-workbench)
- OpenShift (uw-devtools namespace) + Azure Container Registry (001-underwriter-workbench)

## Project Structure

```text
backend/
├── src/
│   ├── UnderwriterWorkbench.Api/       # Controllers, SignalR hubs, Program.cs
│   ├── UnderwriterWorkbench.Core/      # Models, interfaces (no infrastructure deps)
│   └── UnderwriterWorkbench.Infrastructure/  # Cosmos, agents, OpenShift, blob
└── tests/
    ├── UnderwriterWorkbench.Unit/
    ├── UnderwriterWorkbench.Integration/
    └── UnderwriterWorkbench.Contract/  # Agent mock contract tests + fixtures

frontend/
├── src/
│   ├── components/canvas/              # PortfolioView, SubmissionView, tabs
│   ├── components/panels/              # ContextPanel, AgentPanel, DevToolPanel
│   ├── components/drawers/             # ChatDrawer
│   ├── components/shared/             # referenceData.ts (territory, LOB, coverage lists)
│   ├── services/api/                   # workbenchApi.ts
│   ├── services/signalr/               # workbenchHub.ts
│   └── store/                          # submissionStore, portfolioStore
└── tests/e2e/                          # Playwright specs

infrastructure/
├── docker/                             # Dockerfile.api
└── openshift/                          # devtools-namespace.yaml
```

## Commands

```bash
# Backend
cd backend && dotnet restore
dotnet run --project src/UnderwriterWorkbench.Api
dotnet test
dotnet test --filter Category=AgentContract

# Frontend
cd frontend && npm install
npm run dev
npm run test:e2e
```

## Running Services

**Never start the backend API yourself.** If a task requires the API to be running (e.g. running e2e tests), ask the user to start it first:
> "Please start the backend API (`dotnet run --project src/UnderwriterWorkbench.Api` from the `backend/` directory) then let me know when it's ready."

Do not use `dotnet run`, `taskkill`, or any other process management commands to start/stop the API.

## Code Style

- C#: Follow Microsoft .NET conventions. Async/await throughout. No sync-over-async.
- TypeScript: Strict mode. Functional components + hooks. No class components.
- Tailwind: Utility-first. No custom CSS unless unavoidable.

## Reference Data (002)

Territory list, LOB list, and coverage-per-LOB map live in `frontend/src/components/shared/referenceData.ts` and as C# constants in `UnderwriterWorkbench.Core/Models/ReferenceData.cs`. Both must stay in sync.

- LOBs: `Casualty`, `Property`, `IFL`, `Cyber`
- Territory: 46 European countries (see `data-model.md` for full list)
- Coverage options are LOB-specific (see `data-model.md`)

## Data Model Notes (002)

- `RiskDetails.coverageType: string` → `coverageTypes: string[]` (multi-select). Old single-string values coerced to one-item array by `CoverageTypesConverter` on Cosmos read.
- `RiskDetails.cedant` is nullable; absent at submission creation; triggers names clearance re-run when set via PATCH.
- Names clearance entity list is now explicit: creation = [insured, broker]; cedant PATCH = [insured, broker, cedant].

## Testing Workflow (SpecKit)

For each specify-implement loop of SpecKit, Playwright e2e tests **must** be written or updated to cover the new behaviour before the loop is considered complete. The tests live in `frontend/tests/e2e/` and should:

- Be committed alongside the implementation code in the same PR/commit
- Cover the API contract (request/response), UI behaviour, and any agent/background interactions introduced in that loop
- Follow the patterns in existing spec files: `helpers.ts` for shared setup, `waitForClearance` / polling helpers for async agent results

## Recent Changes

- 001-underwriter-workbench: Added C# (.NET 9) + React 18 (TypeScript) + ASP.NET Core 9 + SignalR
- 002-submission-form-enhancements: Territory/LOB dropdowns, coverage multi-select, cedant deferred, expiry auto-fill, clearance re-run on cedant
- 002-submission-form-enhancements (fix): SubmissionView re-fetches submission on `isFinalChunk` from any agent task update, so names clearance badge and risk details update live without a page refresh

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
