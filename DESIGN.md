---
name: Vietnam Market Intelligence
description: Map-first provincial market-entry screening and provenance-verified investment intelligence for Vietnam.
colors:
  bg-ground: "#f2f3f0"
  bg-surface: "#fafaf7"
  bg-card: "#ffffff"
  bg-muted: "#e6e7e1"
  text-primary: "#1c1c1a"
  text-secondary: "#4a4a46"
  text-placeholder: "#6b6b66"
  border-strong: "#1c1c1a"
  border-subtle: "#d9d9d3"
  shell-public: "#26406b"
  shell-internal: "#3e7c67"
  accent-primary: "#26406b"
  accent-primary-deep: "#162642"
  accent-cta: "#b5432f"
  accent-cta-deep: "#7e2a1c"
  accent-highlight: "#e0ae3a"
  accent-teal: "#3e7c67"
  accent-teal-deep: "#234b3d"
  status-success-fg: "#234b3d"
  status-success-bg: "#e6f0ec"
  status-success-border: "#3e7c67"
  status-warning-fg: "#5c4008"
  status-warning-bg: "#f9f1dc"
  status-warning-border: "#b8861d"
  status-error-fg: "#7e2a1c"
  status-error-bg: "#f9e8e4"
  status-error-border: "#b5432f"
  status-info-fg: "#162642"
  status-info-bg: "#e7ecf4"
  status-info-border: "#26406b"
  status-neutral-fg: "#4a4a46"
  status-neutral-bg: "#e6e7e1"
  status-neutral-border: "#76766f"
typography:
  display:
    fontFamily: "Be Vietnam Pro, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "2.125rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Be Vietnam Pro, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.625rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.015em"
  title:
    fontFamily: "Be Vietnam Pro, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.35rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  subhead:
    fontFamily: "Be Vietnam Pro, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "Be Vietnam Pro, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Be Vietnam Pro, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 700
    lineHeight: 1.4
  caption:
    fontFamily: "Be Vietnam Pro, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.4
rounded:
  none: "0px"
spacing:
  space-1: "0.25rem"
  space-2: "0.5rem"
  space-3: "0.75rem"
  space-4: "1rem"
  space-5: "1.5rem"
  space-6: "2rem"
  space-8: "3rem"
components:
  button-primary:
    backgroundColor: "{colors.accent-primary}"
    textColor: "{colors.bg-card}"
    rounded: "{rounded.none}"
    padding: "0.5625rem 1rem"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.accent-primary-deep}"
  button-cta:
    backgroundColor: "{colors.accent-cta}"
    textColor: "{colors.bg-card}"
    rounded: "{rounded.none}"
    padding: "0.5625rem 1rem"
    height: "44px"
  button-cta-hover:
    backgroundColor: "{colors.accent-cta-deep}"
  button-secondary:
    backgroundColor: "{colors.bg-card}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.none}"
    padding: "0.5625rem 1rem"
    height: "44px"
  button-destructive:
    backgroundColor: "{colors.bg-card}"
    textColor: "{colors.status-error-fg}"
    rounded: "{rounded.none}"
    padding: "0.5625rem 1rem"
    height: "44px"
  control-input:
    backgroundColor: "{colors.bg-card}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.none}"
    padding: "0.5625rem 0.75rem"
    height: "44px"
---

# Design System: Vietnam Market Intelligence

## Overview

**Creative North Star: "The Registered Mineral Plate"**

Vietnam Market Intelligence is an analytical screening and decision-support instrument built around woodblock registration logic: each statistical indicator family prints as a flat mineral pigment plate over a cool nacre ground, while the black keyblock—provincial borders, place names, rules, and source citations—always prints last on top. Evidence sits above every colour block so that provenance, observation periods, and dataset limitations remain inseparable from the figures themselves.

The interface rejects dark choropleth dashboards with floating KPI tiles, skyline marketing heroes, warm cream editorial defaults, and tourism or national-emblem motifs. In Operate mode (`/` map workspace, `/decision`, `/internal/inquiries`, `/internal/releases`), the visual world commits through mineral shell pigments, heavy keyline framing, tabular figures, and an overprint registration transition when switching indicator plates. In Read mode (`/investor-guide`, `/privacy/inquiries`, `/inquiries/status`), the world owns the outer frame while the reading column remains quiet at a comfortable 68-character measure.

**Key Characteristics:**
- Cool nacre ground (`--bg-ground`) paired with crisp keyblock ink (`--text-primary`) and 2px structural keylines (`--border-frame`).
- Workspace-specific full-strength shell pigments: mineral indigo (`--shell-public`) for public investor routes and verdigris (`--shell-internal`) for internal operator routes.
- Four stepped mineral pigment ramps for provincial data plates using rank-based quantile binning (up to five non-empty steps): cinnabar for Population, sophora for Economy, indigo for Investment, and verdigris for Workforce.
- Missing or unpublished figures rendered exclusively as diagonal keyblock hatching (`repeating-linear-gradient` in CSS and canvas pattern in MapLibre), never as zero or a flat fill that could be mistaken for a measurement.
- Single-family self-hosted typography (`Be Vietnam Pro`) with full Vietnamese diacritic support, safe heading tracking, and `tabular-nums` across all numeric columns, badges, and legends.

## Colors

The palette pairs a cool, daylight-calibrated nacre ground and deep keyblock ink with four mineral pigments that serve both workspace shells and five-step choropleth data ramps.

### Primary
- **Mineral Indigo** (`--accent-primary` / `--shell-public`): Owns the public header banner, primary action buttons, active step indicators, link text, and the Investment & Business indicator ramp (`#dce3f0` to `#162642`).
- **Deep Indigo** (`--accent-primary-deep`): Hover and active state for primary buttons and links, plus the highest-density step of the Investment choropleth ramp.

### Secondary
- **Cinnabar Vermilion** (`--accent-cta`): Reserved for the primary conversion CTA ("Request Support") in the public shell, destructive outlines, baseline comparison bars, and the Population indicator ramp (`#f4d8cd` to `#7e2a1c`).
- **Deep Cinnabar** (`--accent-cta-deep`): Hover state for the conversion CTA, error foreground ink (`--status-error-fg`), and the highest-density step of the Population choropleth ramp.
- **Verdigris Green** (`--shell-internal` / `--accent-teal`): Owns the internal operator header shell (`/internal/inquiries` and `/internal/releases`), internal funnel bar fills, success borders, and the Workforce & Talent indicator ramp (`#d9ebe4` to `#234b3d`).

### Tertiary
- **Sophora Ochre** (`--accent-highlight`): High-visibility focus ring band, active navigation underline in the top shell, selected province boundary highlight, text selection highlight, and the Economy & Retail indicator ramp (`#f7ebc8` to `#7d590e`).
- **Semantic Status Tints**: High-contrast pairings for verified/current (`--status-success-fg` on `--status-success-bg`), review-due/caution (`--status-warning-fg` on `--status-warning-bg`), overdue/unavailable (`--status-error-fg` on `--status-error-bg`), and informational notices (`--status-info-fg` on `--status-info-bg`).

### Neutral
- **Cool Nacre Ground** (`--bg-ground`): Primary page canvas and map background, deliberately cool rather than warm cream or parchment.
- **Alabaster Surface** (`--bg-surface`): Secondary container surface for the right-hand province rail, legend plates, table headers, and filter toolbars.
- **Pure Sheet White** (`--bg-card`): Interactive control interiors, profile cards, data tables, and dialog surfaces.
- **Muted Stone** (`--bg-muted`): Inactive bar tracks and subtle badge backgrounds.
- **Keyblock Ink** (`--text-primary` / `--border-strong`): Primary body copy, headings, 2px structural borders, and provincial boundary strokes (2px base keyline, 3.2px selected; ~14.8:1 contrast against nacre ground).
- **Slate Charcoal** (`--text-secondary`): Secondary metadata, units, and timestamps (~7.5:1 contrast against white cards and ~6.8:1 against nacre ground, exceeding WCAG AA 4.5:1).
- **Muted Slate Placeholder** (`--text-placeholder`): Input placeholder hints (~5.4:1 contrast against white inputs and ~4.8:1 against cool nacre ground, exceeding WCAG AA 4.5:1 while remaining visually distinct from entered text).
- **Hairline Rule** (`--border-subtle`): 1px internal row dividers inside tables, province lists, and observation stacks.

### Named Rules
**The Keyblock Overprint Rule.** Provincial boundaries, place labels, and legend frames always render in keyblock ink (`--border-strong`) above data fills; no choropleth pigment or selection fill may obscure a boundary line or citation.

**The Hatched Absence Rule.** Missing or unpublished observations must use diagonal keyblock hatching (`.hatch-chip` in DOM legends and the `missing-hatch` canvas pattern in MapLibre), never a solid grey or zero value.

**The Shell Ownership Rule.** Public investor routes commit to mineral indigo (`--shell-public`) in the banner shell; internal operator routes commit to verdigris (`--shell-internal`) so stewards and reviewers have an immediate visual boundary between public and internal workspaces.

## Typography

**Display Font:** Be Vietnam Pro (self-hosted via `next/font/google` with `latin` and `vietnamese` subsets, fallback to `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`)
**Body Font:** Be Vietnam Pro (same single-family workhorse across all UI and prose)
**Label/Mono Font:** Be Vietnam Pro with `font-variant-numeric: tabular-nums` for figures; system monospace (`<code>`) strictly for SHA-256 checksums, UUIDs, and dataset identifiers.

**Character:** A single engineered geometric-humanist sans designed specifically for Vietnamese stacked diacritics (`Hồ Chí Minh`, `Đà Nẵng`, `tỷ đồng`), keeping dense statistical tables, bilingual labels, and long-form regulatory guidance crisp without serif/sans switching.

### Hierarchy
- **Display** (`800`, `--text-2xl` / `2.125rem`, `line-height: 1.2`, `letter-spacing: -0.02em`): Primary page `h1` headings and the active map indicator title (`.stage-indicator-title`).
- **Headline** (`800`, `--text-xl` / `1.625rem`, `line-height: 1.2`, `letter-spacing: -0.015em`): Major section `h2` headings, selected province profile headers, and release freshness counters.
- **Title** (`700`, `--text-lg` / `1.35rem`, `line-height: 1.2`, `letter-spacing: -0.01em`): Subsection `h3` headings and prominent observation values (`.observation-value`).
- **Subhead** (`700`, `--text-md` / `1.125rem`, `line-height: 1.2`): Category headers (`h4`) inside province profiles.
- **Body** (`400`, `--text-base` / `1rem`, `line-height: 1.55` in Operate, `1.65` in Read): Running prose, legal readiness descriptions, and guidance paragraphs (capped at `68ch` in Read columns).
- **Label & Table Data** (`500`–`800`, `--text-sm` / `0.875rem` and `--text-xs` / `0.75rem`, `line-height: 1.4`): Form field labels, table cells, province rail rows, status badges, and source citations.

### Named Rules
**The Diacritic Clearance Rule.** Heading letter-spacing must never be tighter than `-0.02em` (`h1` at `-0.02em`, `h2` at `-0.015em`, `h3` at `-0.01em`) and line-height must stay at or above `1.15` so stacked Vietnamese tone marks never clip or collide.

**The Tabular Figure Rule.** Every numeric column, province list value, legend range, status badge, reference code, and comparison delta must declare `font-variant-numeric: tabular-nums` and right-align in tables and list rails.

## Layout

The spatial system runs on an 8px modular spacing scale (`--space-1` at `0.25rem` / `4px` through `--space-8` at `3rem` / `48px`) with crisp 2px keyline cell boundaries (`--border-frame`) separating major work areas.

- **Map Workspace (`/`)**: Full-viewport modular grid below the 64px top header (`.workspace.database-map-workspace`). At `64rem` (`1024px`) and above, CSS `grid-template-areas` (`"head family search" / "stage stage rail" / "controls controls rail"`, columns `minmax(0, 1fr) auto minmax(320px, 30%)`) pairs the indicator title and 4-family pigment switcher across the top left above a full-height MapLibre stage (`height: calc(100dvh - 180px)`, `min-height: 520px`, `grid-template-rows: minmax(0, 1fr)`) with a bottom-aligned, independently scrollable legend block (`240px–280px`) and layer/filter controls below. The right 30% rail (`--bg-surface`, bordered by `border-left: 2px solid #1c1c1a`) places `GeoSearch` at top with overlay results/filters and a scrollable lower rail holding regional comparison, active province profile, shortlist tray, and the north-to-south 34-province index. Below `64rem`, the workspace flows in a single column matching exact DOM and keyboard Tab order without CSS `order`: indicator title & coverage → place search (`#geo-search-input` within the top 400px on `390×844` and first in Tab order after the header) → 2×2 family switcher → map canvas (`360px` height at `<= 30rem`) & legend → province rail → layer controls.
- **Decision Workspace (`/decision`)**: Centered container (`width: min(74rem, 100%)`, `padding: 2rem`) organized into stacked 2px-bordered plates for sector & assumptions, threshold filters & province selection, side-by-side context comparison, customer-needs evidence verification, weighted assessment / what-if ratios, and the legal readiness checklist.
- **Read Surfaces (`/investor-guide`, `/privacy/inquiries`, `/inquiries/status`)**: Framed document sheet (`width: min(56rem, 100%)`, `.read-sheet` on `--bg-card` with `--border-frame`) housing a calm `.read-column` constrained to `max-width: 68ch`. Headings keep asymmetric vertical rhythm (`h2` has `margin-top: 2.25rem` and `margin-bottom: 0.75rem`; `h3` has `margin-top: 1.75rem` and `margin-bottom: 0.5rem`).
- **Internal Operator Workspaces (`/internal/inquiries`, `/internal/releases`)**: Wide operational container (`width: min(82rem, 100%)`) with session bar at top, tab bar, inline filter fieldset directly above the sortable inquiry table, and a responsive split drawer (`.inquiry-workspace-split--with-detail`: `1.35fr` table to `1fr` detail drawer) that collapses cleanly to a single column below `64rem` (`1024px`).
- **Responsive Breakpoints**: Structural grid reflow at `64rem` (`1024px`, workspace columns stack and header nav wraps to a second row), `48rem` (`768px`, compact container padding and definition lists), and `30rem` (`480px` / `390px` phone width, `360px` map stage height and full-width header action bar with zero horizontal overflow).

## Elevation & Depth

Surfaces are flat by default, relying on tonal layering (`--bg-ground` → `--bg-surface` → `--bg-card`) and 2px keyblock borders (`--border-frame`) rather than drop shadows or glass blur. Depth appears only to separate modal overlays and high-contrast keyboard focus rings.

### Named Rules
**The Flat Plate Rule.** Cards, panels, buttons, and tables never use decorative drop shadows or hard neobrutalist offset shadows (`box-shadow: 4px 4px 0` is forbidden). Hierarchy comes from 2px keyline borders and the contrast between nacre ground, alabaster surface, and white card sheets.

**The Dual-Edge Focus Ring Rule.** `:focus-visible` uses a 3px sophora ochre outline (`outline: 3px solid var(--accent-highlight); outline-offset: 2px`) backed by a 2px card buffer and 5px keyblock ink ring (`box-shadow: 0 0 0 2px var(--bg-card), 0 0 0 5px var(--border-strong)`), guaranteeing >3:1 non-text contrast against both light nacre and dark indigo/verdigris shells.

## Shapes

Every component uses square, print-registered corners (`--radius-none: 0px`) and explicit stroke weights:
- **Structural Frame Border** (`--border-frame: 2px solid #1c1c1a`): Outer shells, cards, buttons, inputs, legend chips, family switchers, and table wrappers.
- **Internal Hairline Border** (`--border-hairline: 1px solid #d9d9d3`): Table rows, search result items, province rail rows, and observation dividers.
- **Advisory Dashed Box** (`2px dashed #1c1c1a`): External legal counsel verification reference box in the legal readiness checklist.

## Components

### Buttons
Square-cornered, 2px-bordered interactive plates (`.btn`) with a `44px` minimum height (`36px` for `.btn-sm` secondary row actions) and `180ms cubic-bezier(0.22, 1, 0.36, 1)` state transitions.
- **Shape:** Sharp print corners (`border-radius: 0px`), `2px solid` border, `font-weight: 700`.
- **Primary (`.btn-primary`):** Mineral indigo fill (`--accent-primary`) with white ink (`#ffffff`), deepening to `--accent-primary-deep` on hover.
- **Conversion CTA (`.btn-cta`):** Cinnabar fill (`--accent-cta`) with white ink (`#ffffff`), deepening to `--accent-cta-deep` on hover; used for "Request Support" in the public header.
- **Secondary (`.btn-secondary`):** White card background (`--bg-card`) with 2px keyblock border (`--border-strong`) and primary ink, shifting to `--bg-ground` on hover.
- **Quiet (`.btn-quiet`):** Transparent background and border with indigo link text (`--accent-primary`) and `3px` underline offset, shifting to `--bg-muted` on hover.
- **Destructive (`.btn-destructive`):** Outline-only transparent background with a 2px cinnabar border (`--accent-cta`) and deep cinnabar text (`--status-error-fg`), tinting to `--status-error-bg` on hover. Always separated from primary actions and paired with explicit confirmation or undo.

### Chips
- **Status Badges (`.status-badge`):** Inline flex chips (`padding: 0.2rem 0.55rem`, `1.5px solid` semantic border, `font-size: 0.75rem`, `font-weight: 700`, `tabular-nums`) that always pair an SVG icon or explicit text label with semantic tinting (`--info`, `--success`, `--warning`, `--error`).
- **Legend Swatch Chips (`.legend-chip`):** `44px × 24px` rectangles with `2px solid #1c1c1a` borders showing rank-based quantile pigment steps (integer thresholds for whole-number layers, at most 1 decimal place otherwise), the `.boundary-chip` nacre outline swatch in boundaries-only mode (`?layer=boundaries`), or the `.hatch-chip` diagonal keyblock pattern for missing data.

### Cards / Containers
- **Corner Style:** `0px` radius across `.profile-panel`, `.shortlist-tray`, `.region-panel`, `.layer-legend`, and `.read-sheet`.
- **Background:** `--bg-card` (`#ffffff`) for primary content plates; `--bg-surface` (`#fafaf7`) for the legend block, rail containers, and nested summary boxes.
- **Shadow Strategy:** None at rest; modal `.dialog-surface` sits over a dimmed ink backdrop (`rgba(28, 28, 26, 0.55)`).
- **Border:** `2px solid #1c1c1a` (`--border-frame`) with internal sections divided by `1px solid #d9d9d3` (`--border-hairline`).
- **Internal Padding:** `--space-4` (`1rem`) on dense rail panels; `--space-5` (`1.5rem`) on decision sections and dialogs; `--space-6` (`2rem`) on read sheets.

### Inputs / Fields
- **Style:** Stacked label-above-control layout (`.form-field` with `font-weight: 700` and `0.5rem` gap). Text inputs, selects, and textareas (`.control-input`, `.control-select`, `.control-textarea`) have `min-height: 44px`, `padding: 0.5625rem 0.75rem`, `border: 2px solid #1c1c1a`, `border-radius: 0px`, `--bg-card` background, and `--text-placeholder` (`#6b6b66`) placeholder text at `opacity: 1`.
- **Focus:** Dual-edge sophora ochre and keyblock ink focus ring (`3px solid #e0ae3a` + `5px` outer ink ring).
- **Error / Disabled:** Field errors render below the control in `--status-error-fg` (`font-weight: 700`) linked via `aria-describedby` and `aria-invalid="true"`. Disabled controls use `opacity: 0.55` and `cursor: not-allowed` with an explicit eligibility explanation nearby.

### Navigation
- **Top Shell (`.site-header`):** `64px` minimum height with a 2px bottom keyline. Uses `--shell-public` (`#26406b`) on public routes and `--shell-internal` (`#3e7c67`) on `/internal/*`. Contains the skip link (`.skip-link`), product title (`.site-brand`, wrapped in `<h1>` on `/` so the map stage does not repeat the product name), primary navigation links (`.site-nav-link`, `min-height: 44px`, active page marked with a 4px bottom border in `--accent-highlight`), the bordered `VI | EN` `.locale-switcher`, and the cinnabar "Request Support" CTA.

### Map Legend & Overprint Plates
- **Map Canvas & Keylines (`ProvinceMap`):** Renders all 34 provinces on cool nacre ground (`#f2f3f0`) with heavy `2px` keyblock borders (`3.2px` when selected, plus a `2.8px` sophora focus outline), quantile-binned pigment fills, diagonal canvas hatching for missing observations, and boundaries-only line mode (`?layer=boundaries`). Auto-fits bounds with `12px` desktop padding (`56px` bottom clearance under `500px` width) on initial resize while preserving user-initiated pan/zoom gestures.
- **Indicator Family Switcher (`.family-switch`):** Joined 2px-bordered segmented control in the top-right of the map stage (2×2 grid on `<= 30rem` phones) synchronized with the `"Colour provinces by"` layer selector (no button pressed in boundaries-only mode). Each button displays a `14px × 14px` pigment swatch (`#b5432f`, `#e0ae3a`, `#26406b`, `#3e7c67`) and flips to keyblock ink background (`#1c1c1a`) with white text when `aria-pressed="true"`.
- **Legend Plate (`.layer-legend`):** Displays quantile range chips, the hatched no-data chip, publisher/version/source title link, and a collapsible `<details>` disclosure (`Source details`) housing technical geography version, license, and review dates.
- **North-to-South Province Rail (`.province-list`):** Keyboard-accessible list of all 34 provinces ordered from Cao Bằng (north) to Cà Mau (south), each showing its right-aligned tabular figure and a 3px bottom pigment bar (`.province-row-bar`) proportional to the maximum provincial value. Hovering or focusing a row synchronizes with the MapLibre canvas to dim non-focused provinces and highlight the active boundary.
- **Overprint Registration (`.overprint-transition`):** Switching indicator layers transitions fill opacity and bar widths over `180ms cubic-bezier(0.22, 1, 0.36, 1)` while provincial borders, labels, and legend frames remain stationary. Under `prefers-reduced-motion: reduce`, all transition and animation durations drop to `0s`.

## Do's and Don'ts

### Do:
- **Do** keep every hex color in TypeScript/JavaScript confined to `src/features/map/layers.ts` (for MapLibre canvas paint expressions and SVG charts), matching the CSS custom properties in `src/app/globals.css`.
- **Do** render missing or unpublished observations with diagonal keyblock hatching (`.hatch-chip` / `missing-hatch`) and explicit `"Unavailable"` / `"No published figure"` labels, never as `0`.
- **Do** attach source publisher, period, dataset version, and licence metadata to every figure, chart, and export.
- **Do** style destructive actions (`.btn-destructive`) as outline-only buttons separated from primary controls, and require confirmation or provide immediate undo.
- **Do** maintain a `44px` minimum height on primary controls (inputs, selects, primary/CTA buttons) and at least `24px × 24px` on all interactive links and compact buttons at `390px` viewport width.

### Don't:
- **Don't** use warm cream (`#f3f0e8`), legacy teal (`#0f5c5a`), copper (`#c46d42`), Georgia, or Arial anywhere in the application.
- **Don't** place kickers or eyebrow labels above headings; let `h1` and `h2` carry hierarchy directly through scale and weight.
- **Don't** use gradient text, glassmorphism (`backdrop-filter`), one-sided accent borders on cards, or hard offset shadows (`box-shadow: 4px 4px 0`).
- **Don't** use national emblems, tourism motifs (lotus, conical hats, bronze drums, flags), or red rubber-stamp graphics on legal checklists.
- **Don't** expose internal operator jargon (`steward`, `cohort`, ticket codes `T04`/`T05`, or internal `Spam` close reasons) on public investor surfaces.
