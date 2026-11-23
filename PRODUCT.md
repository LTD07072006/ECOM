# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary: foreign investors' market-entry teams** (for example a retail expansion lead) screening Vietnamese provinces on a desktop, in English, before sending an investment inquiry. They arrive with little local knowledge, compare places, check whether each figure can be trusted, and decide whether to make contact.
- **Secondary: Vietnamese operators.** Stewards triage investor inquiries, file periodic report snapshots and handle privacy (erasure) requests; reviewers and stewards approve and publish dataset releases. They work on the internal routes, in Vietnamese by default, as a daily task.

## Product Purpose

Vietnam Market Intelligence is a map-first investor attraction and market-entry screening platform. It helps a foreign investor understand Vietnam's scale, find provinces and regions that fit a strategy, see verifiable evidence (market size, infrastructure, workforce, customers, investment environment), understand legal conditions and next steps, and then start an investment inquiry.

Success: the investor reaches a well-founded shortlist and sends an inquiry (receiving a reference code they can track), trusting the data because every figure carries its source, period, version and limitations. On the internal side, success is inquiries answered within SLA and releases published with accountable review.

## Positioning

Provenance-first decision support. Every figure shows citation, definition, licence, method and limitations; comparisons and totals refuse incompatible series and say why; missing data is never shown as zero; the legal readiness checklist cites the issuing authority (for example Decree 31/2021/NĐ-CP) with its review status. It persuades with data, maps and a clear action path, never with unverifiable claims.

## Operating Context

- Public routes: `/` map workspace (search, province profile, layers and filters, comparison, shortlist, saved regions, inquiry dialog), `/decision` (retail scenario and legal readiness checklist), `/investor-guide`, `/inquiries/status`, `/privacy/inquiries`.
- Internal routes: `/internal/inquiries` (inquiry dashboard, filters, detail drawer, reporting workspace, snapshot history and compare, erasure requests) and `/internal/releases` (dataset release review, approval and publication with four-eyes control).
- Data: 34 provincial-level units under the 2025 administrative catalog, served from PostGIS as published releases; CSV exports (UTF-8 with BOM) carry their sources; URL state makes views shareable.
- Desktop first; every route must also work at phone width (390px) and with reduced motion.

## Capabilities and Constraints

- Next.js 15 App Router, React 19, plain global CSS (`src/app/globals.css`), MapLibre GL 6 for the map, no UI kit.
- Strict Content Security Policy: `font-src 'self' data:`, `connect-src 'self'`, `img-src 'self' data: blob:`, nonce-based scripts. No third-party runtime CDNs; fonts must be bundled or self-hosted.
- Bilingual UI dictionaries (`src/lib/i18n/en.ts`, `src/lib/i18n/vi.ts`): public routes default to English, internal routes to Vietnamese. Both locales must keep working; how far polish parity between them must go was not declared binding (open).
- The product is not: e-commerce, a sales or payment system, store management, automatic legal approval, an ROI guarantee, a tool that concludes demand from population, density or POI counts alone, or AI/ML forecasting in this phase.
- Known gaps, not yet decided: English exonyms in search (Hanoi, HCMC, Saigon, Danang), VND figures without USD context, and internal jargon in public copy (cohort, steward, ticket codes such as T04/T05, dataset codes).

## Brand Commitments

- Name: "Vietnam Market Intelligence" is fixed.
- Voice: speaks as an investment-promotion organization: official, neutral and factual. No hype, no superlatives such as "best province", no guarantees.
- No logo, favicon or other identity assets exist in the repository; there is nothing visual to preserve.

## Evidence on Hand

- Real published data: the administrative catalog and Wave 2 indicators (repository `data/`, imported into the database); the legal readiness checklist seeded by `src/db/seed-legal-readiness.ts`.
- Requirements: `docs/market-entry-intelligence-build-spec.md`, `docs/acceptance-matrix.md`.
- Design critique: `.impeccable/critique/2026-11-23T07-40-35Z__src-app.md` (19/40).
- Absent and never to be fabricated: testimonials, customer or partner logos, case studies, investment volume claims, photography.

## Product Principles

1. The map is the product: every place-level fact is reachable from the map and leads back to it.
2. Evidence before conclusion: source, period, unit and limitations travel with every figure, and the product refuses to compare what is not comparable, saying why.
3. One honest next step: the inquiry is the conversion, offered as a clear, low-friction action, never pushed with claims the data cannot support.
4. Official and neutral: the voice of an investment-promotion body, precise rather than promotional.
5. Operators are users too: internal inquiry and release work gets the same clarity and accountability as the public side.

## Accessibility & Inclusion

WCAG 2.2 AA is required on every route, including keyboard and screen-reader use of the map, dialogs, search and comparison. Reduced motion is respected. Vietnamese diacritics must render correctly in every face, weight and tracking used.
