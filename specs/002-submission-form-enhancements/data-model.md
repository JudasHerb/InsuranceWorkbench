# Data Model Changes: Submission Form Enhancements

**Branch**: `002-submission-form-enhancements` | **Date**: 2026-03-30
**Base**: Extends `001-underwriter-workbench` data model

---

## Changed Entity: RiskDetails (embedded in Submission)

### Before (001)

```json
{
  "insuredName": "string",
  "cedant": "string",
  "broker": "string",
  "lineOfBusiness": "string",
  "territory": "string",
  "coverageType": "string",
  "inceptionDate": "YYYY-MM-DD",
  "expiryDate": "YYYY-MM-DD"
}
```

### After (002)

```json
{
  "insuredName": "string",
  "cedant": "string | null",
  "broker": "string",
  "lineOfBusiness": "Casualty | Property | IFL | Cyber",
  "territory": "ISO country name (European)",
  "coverageTypes": ["string"],
  "inceptionDate": "YYYY-MM-DD",
  "expiryDate": "YYYY-MM-DD"
}
```

**Changes**:
- `cedant` is now nullable; absent at submission creation.
- `lineOfBusiness` is now a constrained enum value (one of four defined LOBs).
- `territory` is now a constrained value drawn from the European country list.
- `coverageType: string` → `coverageTypes: string[]` (multi-select; may be empty).

**Migration**: Existing Cosmos documents with `coverageType: "string"` are coerced to `coverageTypes: ["string"]` by a C# `JsonConverter` on read. No write migration needed.

---

## Reference Data: Controlled Vocabulary

These values are fixed for v1. They exist as constants in both backend (C# static class) and frontend (TypeScript module).

### European Territory List

```
Albania, Andorra, Austria, Belarus, Belgium, Bosnia & Herzegovina, Bulgaria,
Croatia, Cyprus, Czech Republic, Denmark, Estonia, Finland, France, Germany,
Greece, Hungary, Iceland, Ireland, Italy, Kosovo, Latvia, Liechtenstein,
Lithuania, Luxembourg, Malta, Moldova, Monaco, Montenegro, Netherlands,
North Macedonia, Norway, Poland, Portugal, Romania, San Marino, Serbia,
Slovakia, Slovenia, Spain, Sweden, Switzerland, Ukraine, United Kingdom,
Vatican City
```

### Line of Business Options

| Value | Display |
|-------|---------|
| `Casualty` | Casualty |
| `Property` | Property |
| `IFL` | IFL (Inland/International Finance & Liability) |
| `Cyber` | Cyber |

### Coverage Types by LOB

| LOB | Coverage Options |
|-----|-----------------|
| Casualty | Employers Liability, Public Liability, Products Liability, Professional Indemnity, Directors & Officers |
| Property | Material Damage, Business Interruption, Machinery Breakdown, Contractors All Risks, Industrial All Risks |
| IFL | Trade Credit, Political Risk, Surety Bonds, Financial Guarantee, Structured Trade Finance |
| Cyber | First-Party Data Breach, Third-Party Liability, Business Interruption (Cyber), Ransomware & Extortion, Cyber Crime / Social Engineering |

---

## Changed: NamesCheckEntity (AgentTask.input)

Names clearance agent task input now carries an explicit entity list rather than deriving it from the submission at run-time.

```json
{
  "submissionId": "uuid",
  "entities": [
    { "entityName": "string", "entityType": "insured | broker | cedant", "jurisdiction": "string" }
  ]
}
```

**On submission creation**: `entities` contains insured + broker only.
**On cedant set/change**: `entities` contains insured + broker + cedant.

---

## Unchanged Entities

All other entities (`Layer`, `FacRiPanel`, `DocumentRef`, `AgentTask`, `B2BSession`, `AuditLogEntry`, `DevTool`, `PortfolioSnapshot`) are unchanged by this feature.

---
