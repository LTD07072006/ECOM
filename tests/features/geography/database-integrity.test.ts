import { expect, test } from "bun:test";
import postgres from "postgres";
import { env } from "../../../src/lib/env";

const databaseTest = process.env.RUN_DB_TESTS === "1" ? test : test.skip;

databaseTest("published geography, boundaries, observations, and dataset sources stay release-consistent", async () => {
  const sql = postgres(env.DATABASE_URL, { max: 1 });
  try {
    const rows = await sql<{
      geography_versions: number;
      published_datasets: number;
      geographies: number;
      provinces: number;
      boundaries: number;
      observations: number;
      observation_datasets: number;
      public_sources: number;
      missing_boundary_codes: number;
    }[]>`
      with published as (
        select dataset_version_id, source_id
        from market_entry.dataset_versions
        where publication_status = 'published'
      ), active_geography as (
        select geography_version_id
        from market_entry.geography_versions
        where status = 'active' and effective_from <= current_date
          and (effective_to is null or effective_to >= current_date)
      )
      select
        (select count(*) from market_entry.geography_versions geography join published on published.dataset_version_id = geography.dataset_version_id where geography.status = 'active')::int as geography_versions,
        (select count(*) from market_entry.dataset_versions where publication_status = 'published')::int as published_datasets,
        (select count(*) from market_entry.geo_units geo join active_geography on active_geography.geography_version_id = geo.geography_version_id)::int as geographies,
        (select count(*) from market_entry.geo_units geo join active_geography on active_geography.geography_version_id = geo.geography_version_id where geo.level = 'province')::int as provinces,
        (select count(distinct boundary.geo_id) from market_entry.geo_boundaries boundary join market_entry.geo_units geo on geo.geo_id = boundary.geo_id join active_geography on active_geography.geography_version_id = geo.geography_version_id join published on published.dataset_version_id = boundary.dataset_version_id)::int as boundaries,
        (select count(*) from market_entry.observations observation join market_entry.indicator_definitions indicator using (indicator_id) join market_entry.geo_units geo on geo.geo_id = observation.geo_id join active_geography on active_geography.geography_version_id = geo.geography_version_id join published on published.dataset_version_id = observation.dataset_version_id where indicator.code = 'POP_AVG')::int as observations,
        (select count(distinct observation.dataset_version_id) from market_entry.observations observation join market_entry.indicator_definitions indicator using (indicator_id) join market_entry.geo_units geo on geo.geo_id = observation.geo_id join active_geography on active_geography.geography_version_id = geo.geography_version_id join published on published.dataset_version_id = observation.dataset_version_id where indicator.code = 'POP_AVG')::int as observation_datasets,
        (select count(distinct source.source_id) from market_entry.source_registry source join published on published.source_id = source.source_id where source.access_right = 'public' and source.status = 'active')::int as public_sources,
        (select count(*) from market_entry.geo_units geo join active_geography on active_geography.geography_version_id = geo.geography_version_id where geo.level = 'province' and not exists (select 1 from market_entry.geo_boundaries boundary join published on published.dataset_version_id = boundary.dataset_version_id where boundary.geo_id = geo.geo_id))::int as missing_boundary_codes
    `;

    expect(rows[0]).toMatchObject({ geography_versions: 1, geographies: 3356, provinces: 34, boundaries: 34, observations: 35, observation_datasets: 1, missing_boundary_codes: 0 });
    expect(rows[0].published_datasets).toBeGreaterThanOrEqual(3);
    expect(rows[0].public_sources).toBeGreaterThanOrEqual(3);
  } finally {
    await sql.end();
  }
});

databaseTest("published boundary topology and license remain within the pinned release baseline", async () => {
  const sql = postgres(env.DATABASE_URL, { max: 1 });
  try {
    const [result] = await sql<{ invalid: number; overlapping: number; area_km2: number; missing_license: number }[]>`
      with boundaries as (
        select b.* from market_entry.geo_boundaries b
        join market_entry.dataset_versions d using (dataset_version_id)
        join market_entry.source_registry s on s.source_id = d.source_id
        where d.publication_status = 'published' and s.access_right = 'public' and s.status = 'active'
      )
      select
        (select count(*)::int from boundaries where not ST_IsValid(geom) or ST_IsEmpty(geom) or ST_SRID(geom) <> 4326) invalid,
        (select count(*)::int from boundaries a join boundaries b on a.dataset_version_id = b.dataset_version_id
          and a.geo_id < b.geo_id and a.geom && b.geom and ST_Relate(a.geom, b.geom, '2********')) overlapping,
        (select coalesce(sum(ST_Area(ST_Intersection(a.geom,b.geom)::geography))/1000000,0)::float
          from boundaries a join boundaries b on a.dataset_version_id = b.dataset_version_id
          and a.geo_id < b.geo_id and a.geom && b.geom and ST_Relate(a.geom,b.geom,'2********')) area_km2,
        (select count(*)::int from market_entry.dataset_versions d join market_entry.source_registry s using (source_id)
          where d.publication_status = 'published' and s.access_right = 'public' and (btrim(s.license) = '' or btrim(s.citation_text) = '')) missing_license
    `;
    expect(result.invalid).toBe(0);
    expect(result.missing_license).toBe(0);
    // The pinned simplified source already has overlaps. Flag any increase for review.
    expect(result.overlapping).toBeLessThanOrEqual(57);
    expect(result.area_km2).toBeLessThanOrEqual(9.0);
  } finally {
    await sql.end();
  }
}, 30_000);
