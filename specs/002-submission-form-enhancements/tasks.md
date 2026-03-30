# Tasks: Submission Form Enhancements

**Input**: Design documents from `/specs/002-submission-form-enhancements/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/rest-api.md ✅

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on each other)
- **[Story]**: User story this task belongs to
- All paths are relative to repository root

---

## Phase 1: Setup (Shared Reference Data)

**Purpose**: Create the reference data module that all user stories depend on.

- [X] T001 Create `frontend/src/components/shared/referenceData.ts` with EUROPEAN_TERRITORIES array, LINES_OF_BUSINESS array, and COVERAGE_BY_LOB map (all values per data-model.md)
- [X] T002 [P] Create `backend/src/UnderwriterWorkbench.Core/Models/ReferenceData.cs` static class with same territory list, LOB list, and coverage-per-LOB dictionary as T001

**Checkpoint**: Reference data available on both client and server. Verify by importing in browser console and checking `EUROPEAN_TERRITORIES.length === 46`.

---

## Phase 2: Foundational (Data Model Migration)

**Purpose**: Update the data model and TypeScript types before any UI or backend work begins. All user story phases depend on this.

**⚠️ CRITICAL**: Complete before any user story phase.

- [X] T003 Update `frontend/src/types.ts` — rename `coverageType: string` → `coverageTypes: string[]` on the `RiskDetails` interface
- [X] T004 [P] Update `backend/src/UnderwriterWorkbench.Core/Models/Submission.cs` — rename `CoverageType` property to `CoverageTypes` (type `List<string>`); add a `System.Text.Json.Serialization.JsonConverter` (`CoverageTypesConverter`) that coerces a bare JSON string to a one-element list on deserialization, preserving backward-compat with existing Cosmos documents
- [X] T005 Update `frontend/src/services/api/workbenchApi.ts` — update `CreateSubmissionRequest` interface: remove `cedant`, rename `coverageType: string` → `coverageTypes: string[]`; update `createSubmission` to send the new shape

**Checkpoint**: TypeScript compiles clean (`npm run build` in frontend); .NET builds clean (`dotnet build` in backend). No runtime behaviour change yet.

---

## Phase 3: User Story 1 — Territory & LOB Dropdowns on Portfolio Filters (Priority: P1) 🎯 MVP

**Goal**: Replace the free-text Territory and LOB filter inputs on the portfolio view with dropdowns using the reference data lists.

**Independent Test**: Open `http://localhost:5173`, confirm Territory and LOB are `<select>` elements. Select "Germany" + "Cyber"; verify grid filters. Select blank option; verify all submissions reappear.

### Implementation

- [X] T006 [US1] Update `frontend/src/components/canvas/PortfolioView.tsx` — replace `<input type="text" placeholder="Territory">` with a `<select>` populated from `EUROPEAN_TERRITORIES` (referenceData.ts); include blank "All territories" option
- [X] T007 [US1] Update `frontend/src/components/canvas/PortfolioView.tsx` — replace `<input type="text" placeholder="Line of Business">` with a `<select>` populated from `LINES_OF_BUSINESS`; include blank "All LOBs" option

**Checkpoint**: Portfolio filter dropdowns functional. Filtering and clearing both work. TypeScript strict-mode clean.

---

## Phase 4: User Story 2 — New Submission Modal Without Cedant (Priority: P1)

**Goal**: Remove Cedant from the new submission form; update Territory and LOB to dropdowns; ensure names clearance runs on insured + broker only.

**Independent Test**: Open New Submission modal — confirm no Cedant field; Territory and LOB are dropdowns; create a submission; confirm names clearance task in Agents tab shows only insured and broker entities checked.

### Backend

- [X] T008 [US2] Update `backend/src/UnderwriterWorkbench.Api/Controllers/SubmissionsController.cs` — remove `Cedant` from `CreateSubmissionRequest`; add territory and LOB validation against `ReferenceData` lists (return `400` for unknown values); update `coverageType` → `coverageTypes` in model binding
- [X] T009 [US2] Update `backend/src/UnderwriterWorkbench.Infrastructure/Agents/NamesClearanceService.cs` — change `RunAsync` signature to accept an explicit `IEnumerable<(string Name, string EntityType, string Jurisdiction)> entities` parameter instead of deriving entities from the submission; update all existing callers (submission creation call in controller) to pass `[insured, broker]` only

### Frontend

- [X] T010 [US2] Update `frontend/src/components/canvas/PortfolioView.tsx` (New Submission modal) — remove Cedant `<input>` field from the modal form; remove `cedant` from local form state
- [X] T011 [US2] Update `frontend/src/components/canvas/PortfolioView.tsx` (New Submission modal) — replace Territory `<input>` with `<select>` from `EUROPEAN_TERRITORIES`; replace LOB `<input>` with `<select>` from `LINES_OF_BUSINESS`

**Checkpoint**: Create a submission via the modal — no cedant field present, names clearance dispatched, `AgentTask.input.entities` contains exactly insured + broker.

---

## Phase 5: User Story 5 — Coverage Multi-Select Filtered by LOB (Priority: P2)

**Goal**: Replace the Coverage Type text input on the New Submission modal with a multi-select list whose options are filtered to the selected LOB.

**Independent Test**: Select LOB "Casualty" — 5 casualty options appear. Select 3. Change LOB to "Cyber" — coverage selection clears and 5 cyber options appear. Submit — all selected coverages persisted. Reload submission — coverages shown correctly.

**Independent Test**: Select LOB "Casualty" — 5 casualty options appear. Select 3. Change LOB to "Cyber" — coverage selection clears and 5 cyber options appear. Submit — all selected coverages persisted. Reload submission — coverages shown correctly.

### Frontend

- [X] T012 [US5] Update `frontend/src/components/canvas/PortfolioView.tsx` (New Submission modal) — replace the single Coverage Type `<input>` with a multi-select `<select multiple>` whose `<option>` list is derived from `COVERAGE_BY_LOB[form.lineOfBusiness]`; update form state from `coverageType: string` to `coverageTypes: string[]`
- [X] T013 [US5] Update `frontend/src/components/canvas/PortfolioView.tsx` — add `useEffect` that resets `form.coverageTypes` to `[]` whenever `form.lineOfBusiness` changes (FR-009)

**Checkpoint**: Multi-select populates and resets on LOB change. Multiple selections are sent correctly in the create request.

---

## Phase 6: User Story 4 — Territory & LOB Dropdowns on Submission Edit Form (Priority: P2)

**Goal**: Apply the same territory and LOB dropdowns to the Risk Summary tab edit form, and add coverageTypes multi-select there too.

**Independent Test**: Open any submission → Risk Summary tab → edit risk details; Territory and LOB are dropdowns; Coverage is multi-select filtered by LOB; save changes persist.

### Frontend

- [X] T014 [US4] Update `frontend/src/components/canvas/tabs/RiskSummaryTab.tsx` — replace Territory and LOB display values with `<select>` dropdowns (from referenceData.ts) when in edit mode; mirror the same dropdown options as the creation modal
- [X] T015 [US4] Update `frontend/src/components/canvas/tabs/RiskSummaryTab.tsx` — replace the Coverage Type display/edit field with a multi-select `<select multiple>` using `COVERAGE_BY_LOB[form.lineOfBusiness]`, pre-populated from `riskDetails.coverageTypes`; reset selections when LOB changes
- [X] T016 [US4] Update `frontend/src/services/api/workbenchApi.ts` — ensure `PatchSubmissionRequest.riskDetails` uses `coverageTypes: string[]` (not `coverageType`)

**Checkpoint**: Risk Summary edit form uses dropdowns for territory/LOB and multi-select for coverages. Changes save and reload correctly.

---

## Phase 7: User Story 3 — Cedant Entry Triggers Names Clearance Re-run (Priority: P2)

**Goal**: Add an editable Cedant field to the Risk Summary tab. When saved with a non-empty cedant, names clearance automatically re-runs covering insured + broker + cedant.

**Independent Test**: Open submission with no cedant. Enter cedant "Test Cedant Ltd". Save. Within 5 seconds, the Names Clearance badge shows a running/updated state. AgentTask in Agents tab shows 3 entities (insured, broker, cedant). Audit log shows new `names-clearance-complete` entry.

### Backend

- [X] T017 [US3] Update `backend/src/UnderwriterWorkbench.Api/Controllers/SubmissionsController.cs` — in `Update` (PATCH): detect when `req.RiskDetails.Cedant` transitions from null/empty to non-empty, or changes between two non-empty values; fire-and-forget `Task.Run(() => _namesClearance.RunAsync(submissionId, entities, userId))` with entities = `[insured, broker, cedant]`; do not trigger when cedant is cleared to empty

### Frontend

- [X] T018 [US3] Update `frontend/src/components/canvas/tabs/RiskSummaryTab.tsx` — add an editable Cedant field to the Risk Details section (shown whether null or populated); wire to the PATCH call on save; show the field clearly labelled as optional

**Checkpoint**: Adding a cedant triggers a second names clearance. Changing cedant triggers another. Clearing cedant does not trigger clearance. All outcomes visible in the Agents tab and Names Clearance badge.

---

## Phase 8: User Story 6 — Expiry Date Auto-Populated from Inception Date (Priority: P3)

**Goal**: When an inception date is entered, auto-fill expiry to inception + 1 year. Allow manual override.

**Independent Test**: Enter inception `2026-06-01` — expiry auto-fills to `2027-06-01`. Manually change expiry to `2026-12-31` — value is retained. Change inception to `2027-01-01` — expiry updates to `2028-01-01` (manual override reset by inception change). Test `2028-02-29` (leap) — expiry fills as `2029-02-28`.

### Frontend (New Submission Modal)

- [X] T019 [US6] Update `frontend/src/components/canvas/PortfolioView.tsx` (New Submission modal) — add `expiryManuallySet` boolean ref (default `false`); on inception date `onChange`, if `!expiryManuallySet`, compute expiry = inception + 1 year (clamped to last day of month for Feb-29 edge case) and set `form.expiryDate`; reset `expiryManuallySet` to `false` on every inception change
- [X] T020 [US6] Update `frontend/src/components/canvas/PortfolioView.tsx` (New Submission modal) — on expiry date `onChange` (user-initiated), set `expiryManuallySet` to `true`

### Frontend (Risk Summary Edit Form)

- [X] T021 [US6] Update `frontend/src/components/canvas/tabs/RiskSummaryTab.tsx` — apply the same `expiryManuallySet` ref logic to the inception/expiry fields in the edit form

**Checkpoint**: Inception-to-expiry auto-fill works in both the creation modal and the edit form. Leap year (Feb 29 → Feb 28) resolves correctly. Manual override is preserved until inception changes again.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Validation, error handling, and E2E test coverage for key flows (required by Constitution Principle VI).

- [X] T022 [P] Update `backend/src/UnderwriterWorkbench.Api/Controllers/SubmissionsController.cs` — add validation: `coverageTypes` values not in `ReferenceData.CoverageByLob[lineOfBusiness]` return `400 Bad Request` with descriptive message
- [X] T023 [P] Update `frontend/src/components/canvas/PortfolioView.tsx` — add Tailwind styling to coverage multi-select so it is visually consistent with other form fields (min height 120px, scrollable)
- [X] T024 [P] Write Playwright E2E test in `frontend/tests/e2e/submission-creation.spec.ts` — cover: territory dropdown, LOB dropdown, coverage multi-select update on LOB change, no cedant field, expiry auto-fill, successful submission creation
- [X] T025 [P] Write Playwright E2E test in `frontend/tests/e2e/cedant-clearance.spec.ts` — cover: adding cedant on Risk Summary tab triggers names clearance re-run; clearance badge updates; audit log entry created

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
    └── Phase 2 (Foundational) ← BLOCKS all phases below
            ├── Phase 3 (US1 — portfolio dropdowns)
            ├── Phase 4 (US2 — new submission modal)
            │       └── Phase 5 (US5 — coverage multi-select) [extends US2 modal]
            ├── Phase 6 (US4 — submission edit form)
            │       └── Phase 7 (US3 — cedant + clearance) [extends US4 edit form]
            └── Phase 8 (US6 — expiry auto-fill) [independent]
Phase 9 (Polish) ← after all user story phases
```

### User Story Dependencies

| Story | Depends On | Notes |
|-------|-----------|-------|
| US1 (P1) — portfolio dropdowns | Phase 2 | Independent |
| US2 (P1) — new submission modal | Phase 2 | Independent |
| US5 (P2) — coverage multi-select | US2 | Extends the modal built in US2 |
| US4 (P2) — submission edit dropdowns | Phase 2 | Independent |
| US3 (P2) — cedant + clearance | US4 | Cedant field lives in edit form built in US4 |
| US6 (P3) — expiry auto-fill | Phase 2 | Independent — touches both modal (US2) and edit form (US4) |

### Parallel Opportunities

- T001 + T002 (Phase 1): backend constants and frontend constants — run in parallel
- T003 + T004 + T005 (Phase 2): different files — run in parallel
- T006 + T007 (Phase 3): same file but non-conflicting JSX sections — sequential within file
- T008 + T009 (Phase 4 backend) and T010 + T011 (Phase 4 frontend): backend/frontend — run in parallel
- T022 + T023 + T024 + T025 (Phase 9): all independent — run in parallel

---

## Parallel Example: Phase 2

```
Agent 1 → T003: Update frontend/src/types.ts
Agent 2 → T004: Update Submission.cs + CoverageTypesConverter
Agent 3 → T005: Update workbenchApi.ts
```

---

## Implementation Strategy

### MVP (P1 Stories Only — Phases 1–4)

1. Phase 1: reference data module
2. Phase 2: data model + types migration
3. Phase 3: portfolio dropdowns (US1)
4. Phase 4: new submission modal without cedant + LOB/territory dropdowns (US2)
5. **STOP and validate**: Create a submission end-to-end; check names clearance on insured + broker

### Incremental Delivery

- After MVP: Add coverage multi-select (US5, Phase 5) — enhances the creation modal
- Add edit form dropdowns (US4, Phase 6) + cedant clearance re-run (US3, Phase 7)
- Add expiry auto-fill (US6, Phase 8) — quick win, purely frontend
- Polish + E2E (Phase 9)

---

## Notes

- `[P]` = different files, no intra-task dependencies — safe to dispatch as parallel sub-agents
- Each user story phase produces a working, independently testable increment
- The `CoverageTypesConverter` (T004) is the only non-trivial technical piece — it handles backward-compat with existing Cosmos documents; test it with a document that has `"coverageType": "Property"` and confirm it reads as `coverageTypes: ["Property"]`
- Commit after each phase checkpoint
- Total tasks: **25** across 9 phases
