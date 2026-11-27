# Site Visit Clarity Pass Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Site Visit semantics, evidence quality, filter state, and route statuses understandable to investors and operators without changing the route API or shared URL contract.

**Architecture:** Keep pure semantics in the existing site-context and logistics-overview view models. Let the workspace derive nearby counts and filtered context, while the logistics matrix owns only table presentation and status explanation. Document the canonical language and UAT expectations separately from implementation details.

**Tech Stack:** Next.js App Router, React, TypeScript, GeoJSON, Bun tests, Playwright, Markdown.

---

### Scope completed

- Added the project glossary in `GLOSSARY.md`.
- Added the browser acceptance checklist in `docs/uat/site-visit-checklist.md`.
- Added `countSiteVisitContextByKind()` and the 150 km radius constant.
- Added `describeLogisticsStatus()` as the canonical route-status explanation.
- Added filter counts, select-all/clear-all actions, radius/session notes, and empty states.
- Added an expandable route-status explanation and no-results table state.

### Explicit non-goals

- Do not add filter state to the share URL.
- Do not persist calculated route responses.
- Do not treat baseline routes as live or official truck routes.
- Do not add a new infrastructure or routing API request.
