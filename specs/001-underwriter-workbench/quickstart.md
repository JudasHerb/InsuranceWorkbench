# Quickstart: Underwriter Workbench (Local Dev)

**Branch**: `001-underwriter-workbench` | **Date**: 2026-03-26

---

## Prerequisites

- .NET 9 SDK
- Node.js 20+
- Docker Desktop
- Azure CLI (for Key Vault and ACR access in non-mock mode)
- A running Cosmos DB Emulator (or real Azure Cosmos DB connection string)
- PowerShell 7+ (for OpenShift mock scripts) — optional in pure-mock mode

---

## 1. Clone and Configure

```bash
git clone <repo-url>
cd underwriter-workbench
cp backend/appsettings.Development.json.example backend/appsettings.Development.json
```

Edit `backend/appsettings.Development.json`:

```json
{
  "CosmosDb": {
    "ConnectionString": "AccountEndpoint=https://localhost:8081/;AccountKey=<emulator-key>",
    "DatabaseName": "underwriter-workbench"
  },
  "Claude": {
    "ApiKey": "<your-anthropic-api-key>",
    "AgentModel": "claude-opus-4-6"
  },
  "Sanctions": {
    "UseMock": true
  },
  "DevAgent": {
    "UseMock": true,
    "MockToolUrl": "http://localhost:3100"
  },
  "B2B": {
    "UseSimulatedResponder": true,
    "HmacSecret": "dev-secret-do-not-use-in-production"
  },
  "BlobStorage": {
    "ConnectionString": "UseDevelopmentStorage=true"
  }
}
```

---

## 2. Start the Backend

```bash
cd backend
dotnet restore
dotnet run --project src/UnderwriterWorkbench.Api
```

API starts on `https://localhost:7001`. Cosmos DB containers are created automatically on
first run via `CosmosDbInitializer`.

---

## 3. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend starts on `http://localhost:5173`. Vite proxies `/api` and `/hubs` to the backend.

---

## 4. Verify Setup

Open `http://localhost:5173` in a browser. You should see the Portfolio View with empty KPIs.

**Smoke test**:
1. Click **New Submission** → fill in all required fields → click **Create**.
2. Names clearance should run automatically (mock returns "clear" for most names).
3. Use "TEST_REFER" in the insured name field to trigger a "refer" result.
4. Use "TEST_BLOCK" in the insured name field to trigger a "blocked" result.
5. Add a layer (e.g., limit £1M, line size £250K, premium £12,500).
6. Upload any PDF from the Documents tab.
7. Dispatch a Legal Review from the Agents tab — output should appear in Agent Panel.
8. Bind the submission — status should change to "Bound".
9. Return to Portfolio View — KPIs should update.

---

## 5. Run Tests

### Backend unit and integration tests

```bash
cd backend
dotnet test
```

### E2E tests (requires both backend and frontend running)

```bash
cd frontend
npm run test:e2e
```

Playwright tests run against `http://localhost:5173`. Test accounts are seeded by the
backend test configuration.

### Agent contract tests (mock Claude responses)

```bash
cd backend
dotnet test --filter Category=AgentContract
```

These tests run against recorded Claude API responses stored in `backend/tests/fixtures/`.
They do NOT call the live Claude API.

---

## 6. Mock Services Reference

| Service                  | Mock behaviour                                                |
|--------------------------|---------------------------------------------------------------|
| Sanctions API            | Names with "TEST_CLEAR/REFER/BLOCK" trigger respective status; all others → clear |
| Developer Agent (DevTool)| Returns a hardcoded layer pricing calculator; no real build   |
| B2B Counterparty         | Simulated responder accepts any proposal with cession ≤ 30%; counters above |
| OpenShift API            | Mock in-memory pod registry; no real OpenShift calls          |
| Azure Container Registry | No-op push; mock image ref returned                           |
| Azure Blob Storage       | Azurite local emulator                                        |

---

## 7. Environment Variables (CI)

```
ASPNETCORE_ENVIRONMENT=Testing
COSMOS_CONNECTION_STRING=<emulator>
CLAUDE_API_KEY=<key-or-mock>
SANCTIONS_USE_MOCK=true
DEVAGENT_USE_MOCK=true
B2B_USE_SIMULATED_RESPONDER=true
OPENSHIFT_USE_MOCK=true
ACR_USE_MOCK=true
BLOB_CONNECTION_STRING=UseDevelopmentStorage=true
```
