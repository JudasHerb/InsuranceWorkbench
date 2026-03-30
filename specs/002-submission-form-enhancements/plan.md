# Implementation Plan: Submission Form Enhancements

**Branch**: `002-submission-form-enhancements` | **Date**: 2026-03-30 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-submission-form-enhancements/spec.md`

---

## Summary

Convert free-text territory and LOB fields to validated dropdown lists across both the portfolio filters and submission creation/edit forms. Remove cedant from new submission intake; add a cedant field to the Risk Summary edit view that automatically re-triggers names clearance when populated. Change `coverageType` from a single string to a multi-select list filtered dynamically by the chosen LOB. Auto-populate expiry date to inception + 1 year. All changes are frontend-heavy with small backend adjustments (data model, names clearance scope).

---

## Technical Context

**Language/Version**: C# (.NET 9) backend; TypeScript (React 18) frontend
**Primary Dependencies**: ASP.NET Core 9, Anthropic SDK, `@microsoft/signalr`, Zustand v5, TailwindCSS v4
**Storage**: Azure Cosmos DB (NoSQL document model) — `submissions` container
**Testing**: Playwright (E2E), xUnit (backend unit/integration)
**Target Platform**: Web (desktop browser, 1280px+ viewport)
**Project Type**: Web application (SPA frontend + REST/SignalR backend)
**Performance Goals**: Dropdown render < 16ms; coverage list filter change < 50ms (all in-memory, no API call)
**Constraints**: No breaking changes to existing bound submissions; `coverageType` → `coverageTypes` migration must handle both string and array on read
**Scale/Scope**: Single underwriter persona; ~200 submissions per portfolio (v1 scope)

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Relevant? | Status | Notes |
|-----------|-----------|--------|-------|
| I. Canvas-First UX | ✅ | **PASS** | All changes occur within existing PortfolioView and SubmissionView canvas surfaces. No new modals or navigation changes. |
| II. Agent-Mediated Automation | ✅ | **PASS** | Names clearance re-run on cedant entry is dispatched as an `AgentTask` document, consistent with existing pattern. |
| III. Compliance and Audit by Design | ✅ | **PASS** | Names clearance re-run produces a new `AgentTask` record and appends an audit log entry. Cedant addition is an auditable state change. |
| IV. Security and Sandboxing | ✅ | **PASS** | No new agent types, no container workloads, no secrets handling introduced by this feature. |
| V. Bounded Scope | ✅ | **PASS** | All changes are within submission data capture and names clearance scope. No claims, renewals, or role-based features. |
| VI. Test Discipline | ✅ | **PASS** | E2E Playwright tests required for dropdown filtering, coverage multi-select, cedant-triggered clearance, and expiry auto-fill. |

**No violations. Proceeding to Phase 0.**

---

## Project Structure

### Documentation (this feature)

```text
specs/002-submission-form-enhancements/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── rest-api.md      ← Phase 1 output (delta from 001)
└── tasks.md             ← Phase 2 output (/speckit.tasks)
```

### Source Code (affected paths)

```text
backend/
└── src/
    ├── UnderwriterWorkbench.Core/
    │   └── Models/
    │       └── Submission.cs              # RiskDetails: coverageType → coverageTypes[]
    ├── UnderwriterWorkbench.Infrastructure/
    │   └── Agents/
    │       └── NamesClearanceService.cs   # Dynamic entity list (insured+broker±cedant)
    └── UnderwriterWorkbench.Api/
        └── Controllers/
            └── SubmissionsController.cs   # CreateSubmissionRequest: remove cedant; PATCH: detect cedant change

frontend/
└── src/
    ├── types.ts                           # RiskDetails: coverageType → coverageTypes[]
    ├── components/
    │   ├── canvas/
    │   │   ├── PortfolioView.tsx          # Territory+LOB dropdowns (filter)
    │   │   └── tabs/
    │   │       └── RiskSummaryTab.tsx     # Cedant field + Territory/LOB/Coverage dropdowns
    │   └── drawers/
    │       └── shared/
    │           └── referenceData.ts       # NEW: territory list, LOB list, coverage map (pure data)
    └── services/
        └── api/
            └── workbenchApi.ts            # CreateSubmissionRequest: remove cedant; coverageTypes[]
```

**Structure Decision**: Web application layout (backend + frontend). Only affected files listed; unchanged files omitted.

---

## Complexity Tracking

> No constitution violations. Table empty.

---
