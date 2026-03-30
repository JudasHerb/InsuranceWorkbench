# Research: Submission Form Enhancements

**Branch**: `002-submission-form-enhancements` | **Date**: 2026-03-30

---

## Decision 1: Coverage Type Storage — String → Array Migration

**Decision**: Change `RiskDetails.coverageType: string` to `RiskDetails.coverageTypes: string[]` in both the C# model and the TypeScript types. Cosmos DB documents already written with the old single-string field are read back as `coverageTypes` containing one element using a custom JSON converter on the C# model.

**Rationale**: Multi-select requires a list. Cosmos DB stores documents as JSON; a `JsonConverter` on the C# model class can transparently coerce `"string"` → `["string"]` at deserialization time, making the migration non-breaking for existing data.

**Alternatives considered**:
- Add a new `coverageTypes` field alongside the old `coverageType` and deprecate the old one — rejected because it doubles the field and complicates all read paths.
- Run a one-off migration script to update all Cosmos documents — viable but over-engineered for v1 volume; the converter approach is simpler and equally safe.

---

## Decision 2: Reference Data Location — Where to Keep Territory/LOB/Coverage Lists

**Decision**: Store all reference lists (territory list, LOB list, coverage-per-LOB map) in a single TypeScript module `src/components/shared/referenceData.ts` exported as plain const arrays/objects. No API call needed — the lists are small, fixed for v1, and identical on frontend and backend.

The backend will additionally define the same lists as C# string constants (or a static class) so it can validate incoming values at the controller layer and reject unknown territories/LOBs with `400 Bad Request`.

**Rationale**: These are fixed enumerations for v1 (FR-001–FR-008 all specify a closed list). Fetching them from an API adds latency, a new endpoint, and a loading state for no benefit. Keeping them in-code is the minimum complexity approach and can be promoted to a reference-data API in a later version if the lists need to become configurable.

**Alternatives considered**:
- `GET /reference-data` API endpoint — rejected; unnecessary for fixed v1 lists.
- Shared npm package — rejected; over-engineered for a monorepo single-spa.

---

## Decision 3: Cedant Entry and Names Clearance Re-trigger Mechanism

**Decision**: The `PATCH /submissions/{id}` endpoint detects when `riskDetails.cedant` is newly set (transitions from null/empty to a non-empty string) and synchronously dispatches a new `NamesClearanceService.RunAsync` call (fire-and-forget on the backend thread pool), identical to the pattern used at submission creation. No new endpoint or field is needed.

The re-run is triggered on **cedant set or changed** (non-empty new value), and **not triggered** when cedant is cleared (new value is null/empty).

**Rationale**: Reusing the existing fire-and-forget `Task.Run(() => _namesClearance.RunAsync(...))` pattern from `SubmissionsController.Create` is the simplest path; the clearance service already accepts a list of entities and returns a result that is broadcast via SignalR. No architectural change is required.

**Alternatives considered**:
- Dedicated `POST /submissions/{id}/run-clearance` endpoint — rejected; the trigger should be automatic on cedant change, not a manual underwriter action.
- Domain event / message queue — rejected; over-engineered for a single in-process trigger.

---

## Decision 4: Expiry Date Auto-fill — Client vs Server

**Decision**: Implement the "inception + 1 year" default entirely on the frontend. When the inception date input's `onChange` fires, the component calculates expiry = inception + 1 year (using JavaScript `Date` arithmetic with correct leap-year handling) and sets the expiry field value, **unless** the user has already manually edited the expiry field after the most recent inception date change.

A `boolean` ref (`expiryManuallyOverridden`) tracks whether the user has changed the expiry since the last inception change. It resets to `false` when inception changes.

**Rationale**: This is purely a UX convenience default. The backend already validates `inceptionDate < expiryDate`. Keeping the calculation on the client avoids a round-trip for a pure UI interaction.

**Alternatives considered**:
- Server-side default — rejected; would require a POST/PATCH round-trip just to get a date suggestion.

---

## Decision 5: Leap Year Expiry Calculation

**Decision**: For inception date 29 Feb (leap year), expiry defaults to 28 Feb of the following year, following Lloyd's and London Market standard policy convention. Implementation: `new Date(year + 1, month, day)` in JavaScript naturally resolves 29 Feb to 1 Mar on non-leap years; to match market convention (28 Feb not 1 Mar), explicitly clamp: if the resulting day overflows the target month, set to the last day of that month.

**Rationale**: Insurance market standard is 28 Feb, not 1 Mar. A one-line clamp (`Math.min(day, daysInMonth(year+1, month))`) covers this without a library.

---

## Decision 6: Names Clearance Entity Scope

**Decision**: `NamesClearanceService.RunAsync` receives an explicit list of `(name, entityType, jurisdiction)` tuples rather than a submission ID + "figure it out" logic. The callers (controller + PATCH handler) build the list:
- On creation: `[insured, broker]`
- On cedant set/change: `[insured, broker, cedant]`

This removes implicit dependency on what fields happen to be non-empty in the submission at run time and makes the scope of each clearance run explicit and auditable in the `AgentTask.input`.

**Rationale**: Explicit is better than implicit. The `AgentTask.input` will record exactly which entities were checked in each run, satisfying Principle III (audit by design).

---
