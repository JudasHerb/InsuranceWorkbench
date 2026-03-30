# REST API Contract Changes: Submission Form Enhancements

**Branch**: `002-submission-form-enhancements` | **Date**: 2026-03-30
**Base**: Extends `001-underwriter-workbench` REST API contracts
**Base URL**: `/api/v1`

> Only endpoints that change are documented here. All other endpoints from `001` are unchanged.

---

## Changed: `POST /submissions`

Cedant is removed from the creation request. Territory and LOB are now validated against the controlled vocabulary. `coverageType` is replaced by `coverageTypes[]`.

**Request** (before → after):

```json
// BEFORE (001)
{
  "riskDetails": {
    "insuredName": "string",
    "cedant": "string",          ← REMOVED
    "broker": "string",
    "lineOfBusiness": "string",  ← now validated enum
    "territory": "string",       ← now validated enum
    "coverageType": "string",    ← REMOVED
    "coverageTypes": [],         ← NEW (optional, may be empty)
    "inceptionDate": "YYYY-MM-DD",
    "expiryDate": "YYYY-MM-DD"
  }
}

// AFTER (002)
{
  "riskDetails": {
    "insuredName": "string",
    "broker": "string",
    "lineOfBusiness": "Casualty | Property | IFL | Cyber",
    "territory": "<European country name>",
    "coverageTypes": ["string"],
    "inceptionDate": "YYYY-MM-DD",
    "expiryDate": "YYYY-MM-DD"
  }
}
```

**Validation errors**:
- `400 Bad Request` if `lineOfBusiness` is not one of the four defined values.
- `400 Bad Request` if `territory` is not in the European country list.
- `400 Bad Request` if any value in `coverageTypes` is not in the allowed list for the given LOB.

**Names clearance**: Triggered on insured + broker only (cedant absent at creation).

---

## Changed: `PATCH /submissions/{submissionId}`

The patch body may now include `cedant` as a standalone field (not nested in `riskDetails` for the cedant-only update path, though full `riskDetails` patch remains supported).

**New side-effect**: If the patched `riskDetails.cedant` transitions from null/empty to a non-empty string, or changes from one non-empty value to another, names clearance is automatically re-triggered covering insured + broker + new cedant.

**Request** (unchanged structure, new semantic):

```json
{
  "riskDetails": {
    "cedant": "string",          ← Setting this to non-empty triggers clearance re-run
    "coverageTypes": ["string"], ← Replaces entire list on patch
    "lineOfBusiness": "...",     ← Validated against enum on patch
    "territory": "..."           ← Validated against enum on patch
  }
}
```

**Response**: `200 OK` — updated `Submission` document (unchanged).

---

## New: `GET /reference-data` (OPTIONAL — deferred)

Not implemented in this feature. Reference data (territory list, LOB list, coverage map) is compiled into the frontend bundle as static constants. This endpoint may be added in a future feature if the lists need to become remotely configurable.

---
