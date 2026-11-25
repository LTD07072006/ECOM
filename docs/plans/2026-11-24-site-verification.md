# Site Verification Implementation Plan

**Goal:** Screen pilot industrial parks without borrowing measurements across sites, and let users ask for missing evidence.

**Architecture:** Keep approved per-field evidence separate from research leads. Derive screening values and the verification checklist from the same site record. Draft verification inquiries in the existing message field with consent and without selecting a comparison province.

**Tech stack:** TypeScript, React, Bun, Playwright.

1. In `tests/features/site-verification.test.ts`, test pilot scope, unknown measurements, and the union of missing questions. Run the tests before adding `src/features/decision/site-verification.ts`.
2. In `src/features/decision/SiteScreeningWizard.tsx`, evaluate linked pilot locations individually and display advisory evidence gaps and the verification contact. Wire the draft into `src/features/inquiries/InquiryForm.tsx` without a new API field.
3. Add a browser check for the editable draft and unselected comparison, run the full gate and verify against the isolated published test database.
