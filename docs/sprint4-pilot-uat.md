# Pilot feedback and sign-off

## Pilot setup

- Candidate tag or commit
- Pilot environment
- Start and end dates within a one-to-two-week window
- Selected provinces and use cases
- Pilot coordinator and feedback owner
- Data reviewer, steward and incident owner
- Participant roles covering business development/investor, data steward, policy/economic development, and analyst/research
- Approved feedback storage location

## Participant form

| Field | Response |
| --- | --- |
| Participant reference and role | |
| Device, browser and accessibility settings | |
| Geography and source used | |
| Task that failed or required help | |
| Expected result and actual result | |
| Impact on the decision or workflow | |
| Whether you could reproduce it | |
| Optional screenshot reference with personal data removed | |

Mark each task **pass**, **blocked** or **needs help**.

| Task | Result | Evidence or issue |
| --- | --- | --- |
| Search for a province or commune and open its profile | | |
| Explain the source, reference date and limitation of one figure | | |
| Save two or three places and compare them | | |
| Download CSV and JSON and trace one row back to its source | | |
| Identify a missing value and explain how it differs from zero | | |
| Trace boundary attribution and geography version | | |
| Search Hà Nội, open the profile, submit an inquiry and record the `INQ-…` reference | | |
| Open `/internal/inquiries` with the steward token and load the inquiry list | | |
| Open an inquiry detail, verify provenance, add a note and change its status | | |
| Close an inquiry with an explicit reason and verify the audit timeline | | |
| Review funnel metrics and export the filtered safe CSV without email/message/notes | | |
| Apply date range and geography filters, verify pagination, and confirm metrics/CSV cover all matching inquiries rather than only the visible page | | |
| Review weekly trend and normalized country/sector/geography breakdowns; save a weekly report snapshot | | |
| Reopen a stored snapshot after changing an inquiry, verify its period/timezone/formula and unchanged total, then export the stored aggregate CSV | | |
| Compare two snapshots with the same filters/formula, verify incompatible comparison is rejected, and create a correction snapshot without editing the original | | |
| Complete the workflow using keyboard or your usual assistive technology | | |

1. Explain what the population estimate can tell you about a place.
2. Explain how you would use the comparison results in a decision.
3. Describe which timestamp or dataset version you would cite when sharing the export.
4. Identify work that was unclear or took longer than expected.

## Coordinator sign-off

| Field | Decision or evidence |
| --- | --- |
| API, map and export smoke results | |
| Release fingerprint and data review ticket | |
| Backup restore rehearsal and incident owner | |
| Issues, severity, owner and due date | |
| Mandatory changes before release | |
| Pilot owner decision and date | Pending |
| Reviewer decision and date | Pending |

Review interpretation, traceability and high-impact failures with participants. Record a release decision only after the assigned owners resolve mandatory changes and the reviewer signs the release evidence.
