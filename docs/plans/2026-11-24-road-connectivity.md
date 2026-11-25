# Road Connectivity Implementation Plan

Keep geometric catchments independent of road estimates. Start with the DEEP C reference point and two published facility markers. Expose opt-in Directions estimates via a same-origin endpoint using fixed catalogue pairs, with a dated OSRM/OSM baseline when live routing is unavailable. Display that these are reference points, not gates, truck routes, or traffic estimates.

1. Add provider/fallback tests, then implement the resolver and restricted HTTP endpoint.
2. Add bilingual map controls and OpenAPI documentation.
3. Run the repository gate and browser checks where the published test database is available.
