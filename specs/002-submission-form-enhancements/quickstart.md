# Quickstart: Submission Form Enhancements

**Branch**: `002-submission-form-enhancements` | **Date**: 2026-03-30

---

## What Changed

1. **Territory & LOB are now dropdowns** — both on the portfolio filter bar and the submission creation/edit forms.
2. **Coverage Type is a multi-select** — options are filtered to the chosen LOB.
3. **Cedant removed from New Submission modal** — cedant is entered later on the Risk Summary tab.
4. **Expiry auto-fills to inception + 1 year** — overridable by the underwriter.
5. **Names clearance re-runs when cedant is added** — insured + broker + cedant are all checked.

---

## Running the Feature

No new infrastructure required. Run the existing stack:

```bash
# Backend
cd backend
dotnet run --project src/UnderwriterWorkbench.Api

# Frontend
cd frontend
npm run dev
```

---

## Testing the Changes Manually

### 1. Portfolio filters

- Open `http://localhost:5173`
- The Territory and Line of Business inputs are now dropdowns
- Select "Germany" + "Cyber" — only matching submissions appear
- Select blank option — filter clears

### 2. New Submission modal

- Click **+ New Submission**
- Confirm there is **no Cedant field**
- Territory and LOB are dropdowns
- Select LOB "Casualty" — Coverage multi-select shows 5 casualty options
- Select LOB "Cyber" — Coverage options update to 5 cyber options; prior selection cleared
- Enter an inception date — expiry auto-fills to + 1 year
- Manually change expiry — manual value is retained when inception stays the same
- Submit — names clearance task runs on insured + broker only

### 3. Cedant on Risk Summary tab

- Open any submission in **draft** or **in-review** status
- Go to **Risk Summary** tab
- Click **Edit** (or inline edit) in the Risk Details section
- Enter a cedant name and save
- An orange "Names Clearance running…" indicator appears
- Within a few seconds the clearance badge updates with the new result
- Audit tab shows a new `names-clearance-complete` entry

### 4. Coverage types on existing submissions

- Submissions created before this feature have a single `coverageType` string stored
- On load, the field is treated as a one-item `coverageTypes` array — no data is lost

---

## Key Files

| File | Change |
|------|--------|
| `frontend/src/components/shared/referenceData.ts` | NEW — territory list, LOB list, coverage map |
| `frontend/src/components/canvas/PortfolioView.tsx` | Territory/LOB → dropdowns |
| `frontend/src/components/canvas/tabs/RiskSummaryTab.tsx` | Cedant field + edit flow |
| `frontend/src/types.ts` | `coverageType` → `coverageTypes` |
| `backend/src/UnderwriterWorkbench.Core/Models/Submission.cs` | `CoverageType` → `CoverageTypes[]` + migration converter |
| `backend/src/UnderwriterWorkbench.Infrastructure/Agents/NamesClearanceService.cs` | Explicit entity list param |
| `backend/src/UnderwriterWorkbench.Api/Controllers/SubmissionsController.cs` | Remove cedant from create; re-trigger clearance on PATCH |

---
