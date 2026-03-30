# Feature Specification: Submission Form Enhancements

**Feature Branch**: `002-submission-form-enhancements`
**Created**: 2026-03-30
**Status**: Draft
**Input**: User description: "on main page territory and line of business should be a list of options. For territory use European countries, for LOB use Casualty, Property, IFL and Cyber. When i select New submission cedant should be removed as it's selected later by the underwriter, so update names clearance so that initially we only check insured and broker, but later we enter a cedant then names clearance will run again. on submission again territory and line of business should be options. Coverage should be a multi select list related to the line of business selected. For now make up appropriate coverages. On submission if i enter an inception date, then default automatically the expiry date to inception date plus 1 yr"

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Guided Territory & LOB Selection on Portfolio View (Priority: P1)

An underwriter browsing the portfolio uses dropdown filters for Territory and Line of Business instead of free-text inputs. The available territories are the standard set of European countries; the LOB options are Casualty, Property, IFL, and Cyber. This prevents typos and ensures consistent filtering behaviour.

**Why this priority**: Filtering is used every session; free-text inputs produce inconsistent results and break portfolio aggregations.

**Independent Test**: Filter the portfolio grid by territory "Germany" and LOB "Cyber" using dropdowns; verify only matching submissions appear.

**Acceptance Scenarios**:

1. **Given** the portfolio view is loaded, **When** the underwriter opens the Territory dropdown, **Then** a list of European countries is shown (including at minimum DE, FR, GB, NL, CH, IT, ES, BE, SE, NO, DK, FI, AT, PL, IE).
2. **Given** the portfolio view is loaded, **When** the underwriter opens the LOB dropdown, **Then** the four options Casualty, Property, IFL, and Cyber are shown.
3. **Given** a territory and LOB are selected, **When** the filters are applied, **Then** only submissions matching both selections appear in the risk register table.
4. **Given** a filter is active, **When** the underwriter selects the blank/all-items option, **Then** the filter is cleared and all submissions reappear.

---

### User Story 2 - New Submission Modal Without Cedant (Priority: P1)

When creating a new submission the underwriter provides core risk details — insured name, broker, LOB, territory, coverage type, and policy dates — but does **not** enter a cedant at this stage. Cedant is captured later as part of the underwriting process. Names clearance runs immediately on insured and broker only.

**Why this priority**: Removing cedant from the creation form aligns with the real workflow: the cedant relationship is established after initial triage, not at intake. Running clearance prematurely on an unknown cedant adds noise.

**Independent Test**: Create a submission without a cedant field; confirm names clearance task is created and checks only insured and broker; confirm the submission is saved correctly.

**Acceptance Scenarios**:

1. **Given** the New Submission modal is open, **When** the form is rendered, **Then** there is no Cedant input field.
2. **Given** the New Submission form is submitted with insured, broker, territory, LOB, coverage types, and dates, **When** the submission is created, **Then** a names clearance task is dispatched checking only the insured name and broker name.
3. **Given** a submission is created, **When** names clearance completes, **Then** the clearance result reflects checks on insured and broker only (not cedant).

---

### User Story 3 - Cedant Entry Triggers Re-run of Names Clearance (Priority: P2)

On the Submission detail view the underwriter later assigns a cedant to the submission by entering it on the Risk Summary tab. The system automatically re-runs names clearance to include the newly added cedant, in addition to insured and broker.

**Why this priority**: Cedant is a sanctioned-entity risk; clearance must cover all three parties before binding is permitted.

**Independent Test**: Open an existing submission with no cedant, enter a cedant name, save; confirm a new names clearance task is dispatched that checks insured, broker, and the new cedant.

**Acceptance Scenarios**:

1. **Given** a submission has no cedant, **When** the underwriter enters a cedant name and saves, **Then** the cedant is persisted on the risk details.
2. **Given** a cedant is saved on a submission, **When** the save is confirmed, **Then** a new names clearance agent task is automatically triggered covering insured, broker, and cedant.
3. **Given** a submission already has a cedant, **When** the cedant is changed and saved, **Then** names clearance re-runs again with the updated cedant name.
4. **Given** names clearance re-runs after cedant entry, **When** the result is received, **Then** the names clearance status badge on the Risk Summary tab updates to reflect the new result.

---

### User Story 4 - Guided Territory & LOB Dropdowns on Submission Form (Priority: P2)

The territory and line of business fields on the New Submission modal and the Risk Summary edit form are dropdowns (same options as the portfolio filters) rather than free-text inputs.

**Why this priority**: Consistency between the portfolio filter and submission form; prevents mismatched values that break portfolio aggregation.

**Independent Test**: Open New Submission modal and confirm Territory and LOB are dropdowns with the correct options.

**Acceptance Scenarios**:

1. **Given** the New Submission modal is open, **When** Territory is rendered, **Then** it is a dropdown containing European countries.
2. **Given** the New Submission modal is open, **When** LOB is rendered, **Then** it is a dropdown containing Casualty, Property, IFL, Cyber.
3. **Given** the Risk Summary tab is in edit mode, **When** Territory or LOB is displayed, **Then** they are dropdowns with the same option sets.

---

### User Story 5 - Coverage Type Multi-Select Filtered by LOB (Priority: P2)

The Coverage Type field on the New Submission modal becomes a multi-select list. The available coverage options are filtered to those relevant for the selected Line of Business. Selecting a different LOB resets and updates the coverage options. Multiple coverages may be selected simultaneously.

**Why this priority**: Coverage type is highly LOB-specific; a free-text field or unfiltered list produces invalid combinations and data quality issues.

**Independent Test**: Select LOB "Cyber" and confirm only cyber-relevant coverages appear; select multiple coverages; change LOB to "Property" and confirm coverage list resets to property-relevant options.

**Acceptance Scenarios**:

1. **Given** LOB is set to Casualty, **When** the Coverage multi-select is rendered, **Then** it shows: Employers Liability, Public Liability, Products Liability, Professional Indemnity, Directors & Officers.
2. **Given** LOB is set to Property, **When** the Coverage multi-select is rendered, **Then** it shows: Material Damage, Business Interruption, Machinery Breakdown, Contractors All Risks, Industrial All Risks.
3. **Given** LOB is set to IFL (Inland/International Finance & Liability), **When** the Coverage multi-select is rendered, **Then** it shows: Trade Credit, Political Risk, Surety Bonds, Financial Guarantee, Structured Trade Finance.
4. **Given** LOB is set to Cyber, **When** the Coverage multi-select is rendered, **Then** it shows: First-Party Data Breach, Third-Party Liability, Business Interruption (Cyber), Ransomware & Extortion, Cyber Crime / Social Engineering.
5. **Given** coverages are selected and the user changes the LOB, **When** the LOB selection changes, **Then** the coverage selection is cleared and the new LOB's coverage options are shown.
6. **Given** multiple coverages are selected, **When** the form is submitted, **Then** all selected coverages are persisted on the submission.

---

### User Story 6 - Expiry Date Auto-Populated from Inception Date (Priority: P3)

When the underwriter enters an inception date on the New Submission modal or the Risk Summary edit form, the expiry date field is automatically set to exactly one year after the inception date. The underwriter may override the auto-populated expiry date manually.

**Why this priority**: The vast majority of policies run for 12 months; auto-filling prevents data entry errors and saves time.

**Independent Test**: Enter an inception date of 01/06/2026; confirm expiry date auto-fills to 01/06/2027; manually change expiry to 31/12/2026 and confirm it is accepted.

**Acceptance Scenarios**:

1. **Given** the inception date field is empty, **When** the underwriter enters a valid inception date, **Then** the expiry date is automatically set to the same day and month one year later.
2. **Given** the expiry date has been auto-populated, **When** the underwriter manually changes the expiry date, **Then** the manually entered date is preserved.
3. **Given** the expiry date has been auto-populated, **When** the underwriter clears and re-enters a different inception date, **Then** the expiry date updates to one year after the new inception date.

---

### Edge Cases

- What happens when the underwriter selects a LOB but does not select any coverage? (Submission should still be createable; coverage is optional at intake.)
- What happens when a cedant is added to a submission whose names clearance is currently in-progress? (New clearance should queue or wait; must not create race conditions.)
- What if inception date is 29 Feb on a leap year? (Expiry should resolve to 28 Feb the following non-leap year.)
- What happens when the underwriter clears the cedant field after it was previously set? (Cedant is removed from risk details; no additional clearance re-run needed as the entity is no longer on the risk.)

---

## Requirements *(mandatory)*

### Functional Requirements

**Portfolio View — Filters**

- **FR-001**: The Territory filter on the portfolio view MUST be a dropdown containing a fixed list of European countries (minimum: DE, FR, GB, NL, CH, IT, ES, BE, SE, NO, DK, FI, AT, PL, IE).
- **FR-002**: The Line of Business filter on the portfolio view MUST be a dropdown containing exactly: Casualty, Property, IFL, Cyber.
- **FR-003**: Both filter dropdowns MUST include a blank/all option that clears the filter.

**New Submission Modal**

- **FR-004**: The New Submission modal MUST NOT include a Cedant input field.
- **FR-005**: The Territory field on the New Submission modal MUST be a dropdown with the same European country list as the portfolio filter.
- **FR-006**: The Line of Business field on the New Submission modal MUST be a dropdown with the same four LOB options.
- **FR-007**: The Coverage Type field MUST be a multi-select control showing options relevant to the selected LOB; the available options MUST update when the LOB changes.
- **FR-008**: The coverage options per LOB MUST be:
  - Casualty: Employers Liability, Public Liability, Products Liability, Professional Indemnity, Directors & Officers
  - Property: Material Damage, Business Interruption, Machinery Breakdown, Contractors All Risks, Industrial All Risks
  - IFL: Trade Credit, Political Risk, Surety Bonds, Financial Guarantee, Structured Trade Finance
  - Cyber: First-Party Data Breach, Third-Party Liability, Business Interruption (Cyber), Ransomware & Extortion, Cyber Crime / Social Engineering
- **FR-009**: When the LOB is changed, the coverage selection MUST be cleared.
- **FR-010**: The Coverage Type field MAY be left empty (no coverages selected) and the submission MAY still be created.
- **FR-011**: When the inception date is entered or changed, the expiry date MUST automatically be set to exactly one year after the inception date unless the underwriter has already manually overridden the expiry date after the last inception date change.
- **FR-012**: The underwriter MUST be able to manually override the auto-populated expiry date.

**Names Clearance**

- **FR-013**: When a submission is created, names clearance MUST run on insured name and broker name only (not cedant).
- **FR-014**: The Cedant field MUST be editable on the Risk Summary tab of the Submission detail view.
- **FR-015**: When a cedant is saved on a submission (created or updated), names clearance MUST automatically re-run, covering insured, broker, and the new cedant.
- **FR-016**: Clearing a cedant (setting it to blank) MUST NOT trigger a clearance re-run.

### Key Entities

- **Submission.RiskDetails.Cedant**: Now optional at creation; populated later by underwriter action.
- **Submission.RiskDetails.CoverageTypes**: Changed from a single string to a list of strings representing selected coverage type values.
- **NamesCheckEntity**: An entity checked during sanctions clearance, identified by name and type (insured / broker / cedant). Clearance scope is dynamic based on which entities are present on the submission.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An underwriter can create a new submission from the "New Submission" modal in under 90 seconds using only dropdowns and date pickers (no free-text for LOB, territory, or coverage type).
- **SC-002**: 100% of submissions have a valid Territory and LOB value drawn from the defined option lists (no free-text mismatches in the portfolio view).
- **SC-003**: Changing LOB on the New Submission modal updates the coverage options without any page reload or loss of other field values.
- **SC-004**: Entering a cedant on an existing submission triggers a second names clearance task within 5 seconds of saving.
- **SC-005**: The expiry date auto-fill is accurate for all calendar months including February of leap and non-leap years.

---

## Assumptions

- European countries list is fixed at intake time and does not need to be configurable from the UI in this feature.
- The existing `coverageType` field on the data model changes from a single string to a list; existing submissions with a single string value will be treated as having a list with one item on read.
- Territory and LOB dropdowns on the Risk Summary edit view (patch path) follow the same option lists as the creation form; this feature includes updating that view.
- "IFL" stands for Inland / International Finance & Liability in the context of this product.
- Leap-year expiry date (inception 29 Feb) resolves to 28 Feb of the following year, matching standard insurance market convention.
- No changes are made to the bind gate logic — coverage types being optional does not affect binding eligibility.
