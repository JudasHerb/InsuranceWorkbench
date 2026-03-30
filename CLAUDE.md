# Underwriter Workbench Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-26

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

## Code Style

- C#: Follow Microsoft .NET conventions. Async/await throughout. No sync-over-async.
- TypeScript: Strict mode. Functional components + hooks. No class components.
- Tailwind: Utility-first. No custom CSS unless unavoidable.

## Recent Changes

- 001-underwriter-workbench: Added C# (.NET 9) + React 18 (TypeScript) + ASP.NET Core 9 + SignalR

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
