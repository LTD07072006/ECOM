import "dotenv/config";
import { resolve } from "node:path";
import postgres from "postgres";
import { env } from "../lib/env";
import { registerDataset } from "./dataset-store";
import { loadWave2 } from "./wave2-data";
import {
	assertLocalPublish,
	auditLocalPublish,
	lockReleases,
	recordImport,
} from "./release-workflow";
import { safeSourceUrl } from "../lib/source-url";

type Wave2Release = Awaited<ReturnType<typeof loadWave2>>;
const coastalAllowanceMeters = 2_000;

async function infrastructureProvince(
	tx: postgres.TransactionSql,
	release: Wave2Release,
	point: { id: string; longitude: number; latitude: number },
	coastalProvinceCode?: string,
) {
	const { geographyVersion } = release.manifest;
	const boundary = release.boundaryDataset;
	const matches = await tx<{ geo_id: string; admin_code: string }[]>`
    with location as (
      select ST_SetSRID(ST_MakePoint(${point.longitude}, ${point.latitude}), 4326) as geom
    ), candidates as (
      select geo.geo_id, geo.admin_code, shape.geom
      from market_entry.geo_boundaries shape
      join market_entry.geo_units geo on geo.geo_id = shape.geo_id and geo.level = 'province'
      join market_entry.geography_versions version on version.geography_version_id = geo.geography_version_id
      join market_entry.dataset_versions dataset on dataset.dataset_version_id = shape.dataset_version_id
      join market_entry.source_registry source on source.source_id = dataset.source_id
      where version.code = ${geographyVersion} and dataset.source_id = ${boundary.source.id}
        and dataset.dataset_code = ${boundary.datasetCode} and dataset.version_label = ${boundary.version}
        and dataset.publication_status = 'published' and source.access_right = 'public' and source.status = 'active'
    ), covered as (
      select geo_id, admin_code from candidates cross join location
      where ST_Covers(candidates.geom, location.geom)
    )
    select geo_id, admin_code from covered
    union all
    select geo_id, admin_code from candidates cross join location
    where admin_code = ${coastalProvinceCode ?? null}
      and not exists (select 1 from covered)
      and ST_DWithin(candidates.geom::geography, location.geom::geography, ${coastalAllowanceMeters})
  `;
	if (
		matches.length !== 1 ||
		(coastalProvinceCode && matches[0].admin_code !== coastalProvinceCode)
	) {
		throw new Error(
			`Infrastructure point ${point.id} does not match exactly one expected province in ${geographyVersion}`,
		);
	}
	return matches[0].geo_id;
}

async function importWave2(release: Wave2Release, publish: boolean) {
	const client = postgres(env.DATABASE_URL, { max: 1 });
	try {
		await client.begin(async (tx) => {
			await lockReleases(tx);
			await tx`set local timezone to 'UTC'`;
			const { geographyVersion, year } = release.manifest;
			const provinces = await tx<{ geo_id: string; admin_code: string }[]>`
        select geo.geo_id, geo.admin_code
        from market_entry.geo_units geo
        join market_entry.geography_versions geography using (geography_version_id)
        join market_entry.dataset_versions dataset on dataset.dataset_version_id = geography.dataset_version_id
        join market_entry.source_registry source on source.source_id = dataset.source_id
        where geography.code = ${geographyVersion} and geography.status = 'active' and geo.level = 'province'
          and dataset.publication_status = 'published' and source.access_right = 'public' and source.status = 'active'
      `;
			const provinceIds = new Map(
				provinces.map((geo) => [geo.admin_code, geo.geo_id]),
			);
			if (!provinceIds.size)
				throw new Error(
					`Publish the ${geographyVersion} foundation before importing Wave 2`,
				);

			const registeredSeries = [];
			for (const series of release.series)
				registeredSeries.push({
					series,
					...(await registerDataset(tx, series.dataset)),
				});
			const airportDataset = await registerDataset(
				tx,
				release.manifest.airports,
			);
			const airportVersion = airportDataset.id;
			const portDataset = await registerDataset(tx, release.manifest.ports);
			const portVersion = portDataset.id;
			const importedIds = [
				...new Set([
					...registeredSeries.map(({ id }) => id),
					airportVersion,
					portVersion,
				]),
			];
			const batchId = await recordImport(
				tx,
				"wave2",
				geographyVersion,
				release.manifest,
				importedIds,
			);
			if (
				airportDataset.published &&
				portDataset.published &&
				registeredSeries.every(({ published }) => published)
			)
				return;

			for (const { series, id: versionId } of registeredSeries) {
				const { code, label, definition, unit, valueType, scope } =
					series.indicator;
				await tx`
          insert into market_entry.indicator_definitions
            (code, label, description, domain, value_type, unit, period_type, polarity, score_eligible, status)
          values (${code}, ${label}, ${definition}, 'market_context', ${valueType}, ${unit}, 'year', 'context_only', false, 'active')
          on conflict (code) do nothing
        `;
				const [indicator] = await tx<{ indicator_id: string }[]>`
          select indicator_id from market_entry.indicator_definitions
          where code = ${code} and unit = ${unit} and value_type = ${valueType}
            and description = ${definition} and period_type = 'year' and status = 'active'
        `;
				if (!indicator)
					throw new Error(`Incompatible indicator definition ${code}`);
				const records = series.values.map((row) => {
					const geoId = provinceIds.get(row.code);
					if (!geoId)
						throw new Error(
							`Province code ${row.code} not found in published ${geographyVersion}`,
						);
					return {
						geo_id: geoId,
						indicator_id: indicator.indicator_id,
						period_start: `${year}-01-01`,
						period_end: `${year}-12-31`,
						period_label: series.periodLabel,
						value_numeric: row.value,
						value_type: valueType,
						unit,
						scope,
						source_id: series.dataset.source.id,
						dataset_version_id: versionId,
						quality_status: row.value === null ? "unavailable" : "supported",
						missing_reason: row.value === null ? "no_data" : null,
						method_note: series.method,
						limitations: series.limitations,
					};
				});
				await tx`insert into market_entry.observations ${tx(records)} on conflict on constraint observations_natural_key do nothing`;
			}

			for (const airport of release.points) {
				if (!safeSourceUrl(airport.url))
					throw new Error(
						"Airport record must use a valid HTTPS source URL without credentials.",
					);
				if (
					airport.classificationSourceUrl !== null &&
					!safeSourceUrl(airport.classificationSourceUrl)
				)
					throw new Error(
						"Airport classification source must use a valid HTTPS source URL without credentials.",
					);
				if (airport.longitude === null || airport.latitude === null) continue;
				const geoId = await infrastructureProvince(tx, release, {
					id: airport.id,
					longitude: airport.longitude,
					latitude: airport.latitude,
				});
				await tx`
          insert into market_entry.infrastructure_pois
            (dataset_version_id, geo_id, source_key, name, code, kind, airport_classification, operational_status, classification_source_url, reference_url, geom)
          values (${airportVersion}, ${geoId}, ${airport.id}, ${airport.name}, ${airport.code}, ${airport.kind}, ${airport.airportClassification}, ${airport.airportOperationalStatus}, ${airport.classificationSourceUrl}, ${airport.url},
            ST_SetSRID(ST_MakePoint(${airport.longitude}, ${airport.latitude}), 4326))
          on conflict (dataset_version_id, source_key) do nothing
        `;
			}

			for (const port of release.ports) {
				if (
					!safeSourceUrl(port.url) ||
					!safeSourceUrl(port.classificationSourceUrl)
				)
					throw new Error(
						"Port sources must use valid HTTPS source URLs without credentials.",
					);
				// An explicitly documented coastal point may be outside the land polygon.
				const geoId = await infrastructureProvince(
					tx,
					release,
					port,
					port.coastalProvinceCode,
				);
				await tx`
          insert into market_entry.infrastructure_pois
            (dataset_version_id, geo_id, source_key, name, code, kind, operational_status, port_type, classification_source_url, reference_url, geom)
          values (${portVersion}, ${geoId}, ${port.id}, ${port.name}, ${port.code}, ${port.kind}, ${port.operationalStatus}, ${port.portType}, ${port.classificationSourceUrl}, ${port.url},
            ST_SetSRID(ST_MakePoint(${port.longitude}, ${port.latitude}), 4326))
          on conflict (dataset_version_id, source_key) do nothing
        `;
			}

			if (publish) {
				await tx`
          update market_entry.dataset_versions set publication_status = 'published', published_at = coalesce(published_at, now())
          where dataset_version_id = any(${importedIds}::uuid[])
        `;
				await auditLocalPublish(tx, batchId);
			}
		});
		await client`analyze market_entry.geo_units, market_entry.geo_boundaries, market_entry.observations, market_entry.dataset_versions, market_entry.source_registry, market_entry.infrastructure_pois`;
	} finally {
		await client.end();
	}
}

try {
	const [
		mode = "--validate",
		manifest = "data/sprint3/manifest.json",
		...extra
	] = process.argv.slice(2);
	if (!["--validate", "--stage", "--publish"].includes(mode) || extra.length) {
		throw new Error(
			"Usage: bun run db:import:wave2 [--validate|--stage|--publish] [manifest.json]",
		);
	}
	assertLocalPublish(mode === "--publish");
	const release = await loadWave2(resolve(manifest));
	if (mode !== "--validate") await importWave2(release, mode === "--publish");
	console.log(
		JSON.stringify({
			status: mode === "--publish" ? "published" : "validated",
			databaseWritten: mode !== "--validate",
			geographyVersion: release.manifest.geographyVersion,
			series: release.series.length,
			observations: release.series.reduce(
				(count, series) => count + series.values.length,
				0,
			),
			airports: release.points.length,
			ports: release.ports.length,
		}),
	);
} catch (error) {
	console.error(
		error instanceof Error && error.name !== "PostgresError"
			? error.message
			: "The database import failed.",
	);
	process.exitCode = 1;
}
