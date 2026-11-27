# Vietnam Investor Platform

This glossary defines the shared language for the investor site-visit and logistics context. It keeps map observations, route estimates, and shared survey state distinct.

## Site visit

**Candidate site**:
The location an investor is currently evaluating. It can come from place search or from a manually pinned coordinate.
_Avoid_: Selected place, target site, property (unless a verified property is meant).

**Pinned location**:
A candidate site placed directly on the map without requiring a geocoded address.
_Avoid_: Map marker, dropped pin (in user-facing copy).

**Nearby infrastructure**:
Published infrastructure points within 150 km of the candidate site.
_Avoid_: All infrastructure, accessible infrastructure (proximity alone does not prove access).

**Infrastructure POI**:
A published point of interest such as an airport, seaport, ICD, or industrial park.
_Avoid_: Facility (unless the source explicitly identifies a facility).

## Logistics

**Logistics destination**:
A catalogue infrastructure point selected as the endpoint for a route calculation.
_Avoid_: Nearby POI (a nearby POI is not necessarily selected for routing).

**Live route**:
A route calculated from the current routing provider with usable distance, duration, and geometry.
_Avoid_: Official route, guaranteed route, traffic-certified route.

**Baseline route**:
A dated or fallback estimate retained for comparison when a current route is unavailable or a fallback source is used.
_Avoid_: Live route, official estimate.

**Unavailable route**:
A selected destination for which no usable route measurement is available. It must not be displayed as a zero-distance result or as a map line.
_Avoid_: Zero route, failed route (the user needs the data state, not an implementation error).

## Shared state and evidence

**Nearby filter**:
A session-local selection of infrastructure kinds shown on the map. It is not included in shared URLs.
_Avoid_: Search filter (it does not change the candidate search).

**Shared site-visit state**:
The candidate label and coordinates, selected route destination, comparison candidates, and itinerary stops encoded in the URL. Calculated route responses and nearby filters are intentionally not shared.
_Avoid_: Saved project, persisted analysis.

**Advisory estimate**:
A route measurement suitable for early comparison, but not a traffic, truck-access, regulatory, or investment guarantee.
_Avoid_: Recommendation, commitment, guarantee.
