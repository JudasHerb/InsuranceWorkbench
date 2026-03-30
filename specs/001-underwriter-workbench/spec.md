# Feature Specification: Underwriter Workbench

**Feature Branch**: `001-underwriter-workbench`
**Created**: 2026-03-26
**Status**: Draft
**Input**: Application specification — underwriter-workbench-spec.md

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Submit and Bind a New Risk (Priority: P1)

An underwriter receives a new submission slip from a broker. They create the submission in
the workbench, enter the risk details, and build the layer structure. The system automatically
checks the insured and broker names against regulatory registers. The underwriter uploads the
policy wording and dispatches a legal review. Once the legal output is satisfactory, the
underwriter binds the submission and it rolls into the active portfolio.

**Why this priority**: This is the core daily workflow. Everything else is an enhancement
on top of a successfully captured and bound submission.

**Independent Test**: Create a new submission from scratch, add one layer, upload a document,
dispatch a legal review, and bind the submission. The portfolio count should increment and
the submission should appear in the risk register.

**Acceptance Scenarios**:

1. **Given** the underwriter is on the Portfolio View, **When** they create a new submission
   with insured name, cedant, broker, territory, and line of business, **Then** the submission
   is saved with status "In Review" and a names clearance check runs automatically.

2. **Given** a submission is in "In Review" status, **When** the underwriter adds layers with
   limit, attachment point, line size, and premium, **Then** each layer is saved and the total
   line exposure is visible in the submission header.

3. **Given** a wording document has been uploaded, **When** the underwriter dispatches a legal
   review, **Then** the legal output (summary, flagged clauses, recommendation) appears in the
   Agents tab and the Audit tab within the session.

4. **Given** legal review shows no blocking flags, **When** the underwriter clicks Bind,
   **Then** the submission status changes to "Bound" and the portfolio KPIs update accordingly.

5. **Given** names clearance returns a "refer" status, **When** the underwriter views the
   submission, **Then** a visible warning indicator is shown and the underwriter cannot bind
   without acknowledging the referral.

---

### User Story 2 — Manage FacRi Panels and Negotiate via B2B (Priority: P2)

An underwriter is ceding part of a layer to a reinsurer. They add a facultative reinsurance
panel to the layer and initiate an AI-to-AI negotiation session with the reinsurer's agent,
setting a mandate that defines what terms the agent can agree to without escalation. The
negotiated terms are written back into the FacRi record automatically.

**Why this priority**: FacRi negotiation is a high-value differentiator that reduces manual
back-and-forth with reinsurers. Depends on a bound submission with at least one layer.

**Independent Test**: On a submission with one layer, add a FacRi panel, initiate a B2B
session with the simulated reinsurer responder, and confirm that agreed terms populate the
FacRi record.

**Acceptance Scenarios**:

1. **Given** a submission has at least one layer, **When** the underwriter adds a FacRi panel
   with cession percentage and selects a reinsurer, **Then** the FacRi sub-row appears under
   the layer in the layer table.

2. **Given** a FacRi panel is created for a reinsurer with a registered agent endpoint,
   **When** the underwriter initiates a B2B session and sets a mandate (max cession rate,
   min line size, rate range), **Then** the agent sends an opening proposal and the negotiation
   transcript appears live in the Agent Panel.

3. **Given** a counterparty response is within the mandate, **When** the agent evaluates it,
   **Then** the terms are auto-accepted and written back to the FacRi record without
   underwriter intervention.

4. **Given** a counterparty response is outside the mandate, **When** the agent evaluates it,
   **Then** the underwriter is prompted to decide: accept, reject, or counter.

5. **Given** a B2B session reaches agreement, **When** final terms are confirmed, **Then**
   all session messages are stored and accessible in the Audit tab.

---

### User Story 3 — Build, Use, and Save a Developer Tool (Priority: P3)

An underwriter needs a custom calculation tool that doesn't exist in the standard workbench.
They describe what they need in natural language. The system generates, containerises, and
deploys the tool. The underwriter reviews what external connections the tool requires, approves,
and the tool opens in an embedded panel. They choose to save it to their personal tool library
so it can be reused on future submissions.

**Why this priority**: The developer agent unlocks long-tail underwriting tasks that no
pre-built tool can cover. Depends on having an active submission for context.

**Independent Test**: From a submission, request a layer pricing calculator tool via the chat
drawer. Approve the proposed network access policy. Confirm the tool opens in an embedded
panel, is functional, and can be saved to "My Tools".

**Acceptance Scenarios**:

1. **Given** the underwriter types `/dev` followed by a tool description in the chat drawer,
   **When** the request is submitted, **Then** the system proposes a tool and presents a
   network access policy for the underwriter to review before anything is deployed.

2. **Given** the underwriter approves the network access policy, **When** the tool is being
   prepared, **Then** build progress is visible in the Agent Panel in real time.

3. **Given** the tool is ready, **When** the underwriter views it, **Then** the tool opens
   in an embedded panel within the current submission context and is interactive.

4. **Given** the tool is open, **When** the underwriter clicks "Keep this tool" and provides
   a name, **Then** the tool is saved to their "My Tools" library and can be reopened on any
   future submission.

5. **Given** a tool exists in "My Tools", **When** the underwriter opens it on a different
   submission, **Then** the tool loads against the new submission's data automatically.

6. **Given** the underwriter closes an unsaved tool panel, **When** the session ends,
   **Then** the tool is cleaned up and no longer accessible.

---

### User Story 4 — Portfolio Review and Exposure Analysis (Priority: P4)

An underwriter reviews their active portfolio to identify exposure concentrations and
submissions requiring attention. They filter by territory and line of business, spot a
concentration in the heatmap, and dispatch a batch legal review across a set of submissions.

**Why this priority**: Portfolio-level management supports risk governance. Depends on having
multiple active submissions to review.

**Independent Test**: With at least three submissions of different territories and lines,
open Portfolio View, filter to a specific territory, and confirm the exposure heatmap and
KPI strip reflect the filtered set.

**Acceptance Scenarios**:

1. **Given** the underwriter opens Portfolio View, **When** the page loads, **Then** the KPI
   strip shows total written premium, aggregate limit, largest single risk, and year-to-date
   loss ratio across all active submissions.

2. **Given** multiple submissions exist across different territories and lines of business,
   **When** the underwriter views the exposure heatmap, **Then** concentrations are visually
   highlighted by intensity.

3. **Given** the underwriter applies a filter (e.g., territory = "North America"),
   **When** the filter is active, **Then** the risk register table and heatmap both update
   to reflect only matching submissions.

4. **Given** the underwriter selects multiple submissions from the risk register,
   **When** they dispatch a batch legal review, **Then** one Agent Task is created per
   submission and results are surfaced individually in each submission's Agents tab.

---

### Edge Cases

- What happens when names clearance returns "blocked"? The submission MUST be locked from
  further progression and the underwriter must contact compliance before continuing.
- What happens if a B2B session times out with no response from the counterparty? The session
  status moves to "stalled" and the underwriter is notified to intervene.
- What happens if a developer tool fails to build? The failure is shown in the Agent Panel
  with the build log, and the underwriter can retry with a revised description.
- What happens if the underwriter approves a network access policy and then the tool requests
  a connection outside the approved endpoints? The request is blocked and logged.
- What happens if legal review returns "escalate"? Binding is blocked and the submission is
  flagged for senior review.

## Requirements *(mandatory)*

### Functional Requirements

**Submission Management**

- **FR-001**: The system MUST allow an underwriter to create a submission with: insured name,
  cedant, broker, line of business, territory, coverage type, inception date, and expiry date.
- **FR-002**: The system MUST automatically run a names clearance check on the insured, cedant,
  and broker when a submission is created, without requiring the underwriter to initiate it.
- **FR-003**: The system MUST display the names clearance result as a status indicator on the
  submission context panel (clear / refer / blocked).
- **FR-004**: The system MUST prevent a submission from being bound if names clearance status
  is "blocked", and MUST require acknowledgement before binding if status is "refer".
- **FR-005**: The system MUST prevent a submission from being bound if no legal review has been
  completed or if the most recent legal review recommends "escalate".
- **FR-006**: The system MUST record a timestamped audit log entry for every submission state
  transition, including the actor (user or agent) and a summary of the action.
- **FR-007**: The system MUST allow uploading policy documents (slips, wordings, endorsements)
  in PDF and DOCX formats, attached to a specific submission.

**Layer and FacRi Management**

- **FR-008**: The system MUST allow an underwriter to add, edit, and remove layers on a
  submission, each with: layer number, limit, attachment point, line size, premium, and status.
- **FR-009**: The system MUST allow an underwriter to add FacRi panels to a layer, each
  recording: cession percentage and reinsurer name.
- **FR-010**: The system MUST allow initiating a B2B negotiation session on a FacRi panel
  when the reinsurer has a registered agent endpoint, with a mandate defined by the underwriter.
- **FR-011**: The system MUST automatically write agreed B2B terms back to the FacRi record
  upon session conclusion.

**Agent Tasks**

- **FR-012**: The system MUST allow the underwriter to dispatch a legal review agent on an
  uploaded wording document, returning a summary, list of flagged clauses with severity, and
  a recommendation.
- **FR-013**: The system MUST allow dispatching a legal review across multiple submissions as
  a batch operation from Portfolio View.
- **FR-014**: The system MUST display live streaming output from any running agent task in
  the Agent Panel without requiring a page refresh.
- **FR-015**: The system MUST persist every agent task result and make it accessible in the
  submission's Agents tab and Audit tab.

**Developer Tool**

- **FR-016**: The system MUST allow an underwriter to request a custom tool by describing
  it in natural language via the chat drawer or Agent Panel.
- **FR-017**: The system MUST present the proposed network access policy for a generated tool
  to the underwriter for explicit approval before the tool is deployed.
- **FR-018**: The system MUST display tool build and startup progress in real time.
- **FR-019**: The system MUST open a successfully built tool in an embedded panel within the
  current submission context.
- **FR-020**: The system MUST allow the underwriter to promote a tool to persistent status
  by naming it and saving it to their personal tool library ("My Tools").
- **FR-021**: Persistent tools in "My Tools" MUST be re-launchable against any future
  submission, with the tool automatically receiving the new submission's context data.
- **FR-022**: Ephemeral (unsaved) tools MUST be cleaned up when the underwriter closes the
  tool panel or ends their session.

**Portfolio**

- **FR-023**: Portfolio View MUST display: total written premium, aggregate limit, largest
  single risk, and year-to-date loss ratio as headline KPIs.
- **FR-024**: The risk register table MUST be sortable and filterable by cedant, line of
  business, territory, submission status, and expiry date.
- **FR-025**: Portfolio View MUST include an exposure heatmap showing concentration by
  territory and line of business.

**Chat and Inline Invocation**

- **FR-026**: The chat drawer MUST be accessible from any view via keyboard shortcut and
  footer button, without losing the current submission or portfolio context.
- **FR-027**: The chat drawer MUST support inline agent invocation via slash commands:
  `/legal`, `/names`, `/dev`, `/b2b`.
- **FR-028**: Chat history MUST be persisted per submission so previous conversations are
  accessible when the underwriter returns to the submission.

### Key Entities

- **Submission**: The primary record for an incoming risk. Tracks status, risk details, all
  associated layers, uploaded documents, agent task history, and audit log.
- **Layer**: A risk tranche on a submission, defined by its position (primary/excess),
  financial terms, and any FacRi panels ceding part of the layer.
- **FacRi Panel**: A facultative reinsurance record on a layer, tracking cession terms and
  the outcome of any negotiation session.
- **Agent Task**: A discrete unit of automated work (legal review, names clearance, tool
  build, B2B message). Tracks status, input, output, and any sub-steps.
- **B2B Session**: A structured negotiation dialogue with an external counterparty's agent,
  including the mandate, message transcript, and final agreed terms.
- **DevTool**: A generated micro-application built for a specific underwriting task, which
  can be ephemeral (session-scoped) or promoted to persistent (saved to the tool library).
- **Portfolio Snapshot**: An aggregated view of all active submissions showing KPIs and
  exposure concentrations.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An underwriter can create a new submission, build a layer structure, dispatch a
  legal review, and bind the submission in under 10 minutes for a standard single-layer risk.
- **SC-002**: Names clearance results are displayed on the submission within 30 seconds of
  submission creation in 95% of cases.
- **SC-003**: Agent task output is visible in the Agent Panel within 5 seconds of the task
  completing, without the underwriter refreshing the page.
- **SC-004**: A generated developer tool is accessible to the underwriter within 3 minutes of
  the network access policy being approved, in 90% of cases.
- **SC-005**: The underwriter can save a generated tool to "My Tools" and successfully reopen
  it on a different submission in the same session.
- **SC-006**: B2B session messages within mandate result in auto-accepted terms with no
  underwriter input required, in 100% of cases where the response is unambiguously within
  the defined mandate bounds.
- **SC-007**: The portfolio risk register and exposure heatmap reflect submission changes
  within 60 seconds of a bind event.
- **SC-008**: All agent task outputs are retained and accessible in the Audit tab for the
  lifetime of the submission.

## Assumptions

- The system serves a single underwriter persona in v1. Role-based access controls and
  multi-user collaboration are out of scope.
- Names clearance uses a mock sanctions provider in v1. Results are simulated but structurally
  identical to a real integration.
- B2B agent negotiation targets a simulated reinsurer responder in v1. Live external reinsurer
  agent endpoints are not connected.
- The underwriter has an existing authenticated identity; the system does not manage user
  registration or password reset flows.
- All submitted documents are provided in PDF or DOCX format. Other formats are not supported
  in v1.
- DevTool versioning, sharing between underwriters, and pod auto-scaling are out of scope for v1.
- Mobile device layouts are out of scope for v1. The workbench targets desktop browsers only.
- Claims handling, policy endorsements, and renewals are out of scope for v1.
