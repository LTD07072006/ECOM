import "dotenv/config";
import {
	loadDatabaseCatalog,
	loadProvinceMap,
} from "../features/geography/database-repository";
import { databasePool } from "./pool";

const sql = databasePool();

try {
	const [[postgis], catalog, map, [topology]] = await Promise.all([
		sql<{ version: string }[]>`select postgis_full_version() as version`,
		loadDatabaseCatalog(),
		loadProvinceMap(),
		sql<
			{ invalid: number; overlapping_pairs: number; overlap_area_km2: number }[]
		>`
      with boundaries as (
        select b.* from market_entry.geo_boundaries b
        join market_entry.dataset_versions d using (dataset_version_id)
        join market_entry.source_registry s on s.source_id = d.source_id
        where d.publication_status = 'published' and s.access_right = 'public' and s.status = 'active'
      )
      select
        (select count(*)::int from boundaries where not ST_IsValid(geom) or ST_IsEmpty(geom) or ST_SRID(geom) <> 4326) as invalid,
        (select count(*)::int from boundaries a join boundaries b on a.dataset_version_id = b.dataset_version_id
          and a.geo_id < b.geo_id and a.geom && b.geom and ST_Relate(a.geom, b.geom, '2********')) as overlapping_pairs,
        round((select coalesce(sum(ST_Area(ST_Intersection(a.geom, b.geom)::geography)) / 1000000, 0)::numeric
          from boundaries a join boundaries b on a.dataset_version_id = b.dataset_version_id
          and a.geo_id < b.geo_id and a.geom && b.geom and ST_Relate(a.geom, b.geom, '2********')), 2)::float as overlap_area_km2
    `,
	]);
	console.log(
		JSON.stringify({
			database: "ready",
			postgis: postgis.version,
			publicationStatus: catalog.publicationStatus,
			geographyVersion: catalog.geographies[0]?.geographyVersion ?? null,
			geographies: catalog.geographies.length,
			boundaries: map.features.length,
			observations: catalog.observations.length,
			boundaryTopology: topology ?? null,
		}),
	);
} catch (error) {
	console.error(
		error instanceof Error && error.name !== "PostgresError"
			? error.message
			: "Database check failed. Start Docker Compose and run migrations first.",
	);
	process.exitCode = 1;
} finally {
	await sql.end();
}
