---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: ["src/app/decision/page.tsx","src/app/investor-guide/page.tsx","src/app/privacy/inquiries/page.tsx","src/app/inquiries/status/page.tsx","src/app/internal/inquiries/page.tsx","src/app/internal/releases/page.tsx"]
---

# Surface brief: Vietnam Market Intelligence

## Scope and mode
- Primary target `/` map workspace (Operate). The same world covers `/decision` and the internal routes `/internal/inquiries` and `/internal/releases` (Operate; the internal layout is redesigned too), and the Read pages `/investor-guide`, `/privacy/inquiries` and `/inquiries/status`, where the world owns the frame and the reading column stays calm.
- Visitor: a foreign market-entry lead at a desk in daylight, reading English. Internal routes serve Vietnamese stewards and reviewers daily.
- Task: within seconds see all 34 provinces coloured by one indicator, switch the indicator, open a province, check its evidence, shortlist and compare, then request support.
- Wrong if it resembles a tourism brochure, a generic SaaS dashboard, an old government portal or a flashy advert.
- Build path: code-led. The locked sketch `.impeccable/mocks/decision/assigned.html` is the composition the build matches.

## Direction contract
THESIS: Each indicator is one colour block printed onto the map; the black keyblock (borders, names, source) always prints last, on top, so evidence sits above every colour. It refuses the dark choropleth dashboard with KPI tiles and the skyline hero.

OWN-WORLD: Đông Hồ woodblock logic held to Operate's four contributions. Cool nacre ground (#F2F3F0, never cream); keyblock ink (#1C1C1A) for borders, labels and rules; flat mineral pigments as stepped data ramps: indigo #26406B, cinnabar #B5432F, sophora #E0AE3A, verdigris #3E7C67. Indigo owns the public shell, verdigris the internal shell. Missing data is keyblock hatching, never a colour. Be Vietnam Pro only, tabular figures. No texture, no folk motifs.

STORY: All 34 provinces arrive already printed; the legend says what, when and from whom; the visitor switches the block, opens a province, trusts figures whose source travels with them, shortlists, compares and requests support.

FIRST VIEWPORT: Indigo top bar: product name, nav (Map, Retail scenario, Investor guide, Track an inquiry), VI/EN, cinnabar Request support. Left about 70%: indicator title, family switch top right, the full map with heavy keylines, and the legend block (pigment steps, hatched no-data chip, unit, period, source, release). Right rail about 30%: Find a place, then all provinces north to south with right-aligned values.

FORM: Đông Hồ woodblock prints, position 7 of 7 on my ordered list, assigned by the roll; seed:80110ca4fed4eade.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Signature interaction and motion
- Overprint registration: a new indicator prints its colour block under the still keyblock and settles into register in about 180ms ease-out; keylines, names and the legend frame never move. Reduced motion swaps instantly.
- Motion conveys state only: 150-250ms ease-out, no page-load choreography.
- Focus ring: a sophora band with an ink edge, so it holds 3:1 on every ground (sophora alone on nacre is about 1.7:1).

## Raises from declined challengers
- Developer console: destructive actions (reset scenario, delete region, anonymise inquiry, reject release) stand apart, outline-only, with confirm or undo.
- Reference manual: each workspace owns one pigment at full strength in its shell: public indigo, internal verdigris.
- Crouwel specimen: one modular grid; panels, tables and the legend reflow by whole cells.
- Streaming wall: focusing a province dims the rest of the map and reveals that province's figure and source.
- Cassette j-card: shortlist and comparison show their capacity before they overflow; every figure is right-aligned in tabular numerals.

## Unresolved
- USD context beside VND figures: undecided, do not add.
- Final pigment ramps and tokens are resolved in the build and recorded in DESIGN.md afterwards.
