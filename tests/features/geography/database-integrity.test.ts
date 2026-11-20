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
