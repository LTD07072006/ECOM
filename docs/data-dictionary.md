# Release 1 data dictionary

## Public data rules

Every public indicator observation must expose its definition, unit, period, geography version, source, license/access right, quality status, update date, method, and limitations.

`unavailable` is not zero. If a value is missing, the interface must explain why it is missing and must not use it as evidence in comparison or scoring.

## Core entities

| Entity | Purpose |
| --- | --- |
| `source_registry` | Publisher, citation, license, access right, verification, and lifecycle status. |
| `dataset_versions` | Dataset identity, source, checksum, owner, reference date, review deadline and publication status. |
| `geography_versions` | Administrative vocabulary and its effective dates. |
| `geo_units` | Country, province, and commune hierarchy with normalized search names, context coordinates, and explicit geometry status. |
| `geo_boundaries` | Versioned Polygon/MultiPolygon geometry keyed by geography and dataset version. The public map reads the published release. |
| `indicator_definitions` | Meaning, unit, period type, proxy status, and score eligibility. |
| `observations` | A value or explicit unavailable record for one geography, indicator, period, scope, and dataset version. |

## Release 1 indicator

`POP_AVG` is the published annual average population estimate from Cục Thống kê. It is marked `is_proxy=true`, `polarity=context_only`, and `score_eligible=false`. The legacy `POP_TOTAL`, `AREA_TOTAL`, and `POP_DENSITY` identifiers remain available in test fixtures for missing-data and comparison cases.

## Geometry

`geo_boundaries.geom` stores nonempty, valid, two-dimensional WGS 84 polygons and multipolygons in a plain PostGIS geometry column. The public map loads the published provincial shapes and credits Cục Thống kê and OCHA HDX. [Sprint 1 data and provenance](sprint1-data-foundation.md).

## Public release and freshness

`loadPublicCatalog()` reads only an active geography version and dataset with `publication_status=published`, public access, and active source status. Dataset metadata includes owner, data-as-of, review date, review due date, freshness, license, and citation. If the database is unreachable, the catalog mode is `unavailable`; APIs return an explicit temporary-unavailable response rather than a demo response.

## Display language

The interface ships in Vietnamese and English. Indicator labels, units, quality statuses, geography levels and comparison reasons are translated at the display layer, keyed by indicator code and unit string; the stored observation, its definition, method, limitations and missing reason are always shown as published. API error messages stay in English. See the language section of the [README](../README.md#ngôn-ngữ-giao-diện).

## Comparison and export

Comparison is descriptive only. It refuses mixed geography versions/levels or incompatible observation snapshots and never normalizes, ranks, or scores. JSON/CSV exports preserve observation values (including null), source, period, unit, quality, geography version, dataset version, license/access, updated date, and limitations. CSV cells are escaped and formula-prefixed values are neutralized.
