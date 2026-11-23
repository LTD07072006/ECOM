import "dotenv/config";
import { resolve } from "node:path";
import postgres from "postgres";
import { normalizeSearch } from "../features/geography/domain";
import { env } from "../lib/env";
import { loadRelease, type Release } from "./release-data";
import { registerDataset } from "./dataset-store";
import {
	assertLocalPublish,
	auditLocalPublish,
	lockReleases,
	recordImport,
} from "./release-workflow";

async function importRelease(release: Release, publish: boolean) {
	const client = postgres(env.DATABASE_URL, { max: 1 });
	try {
		await client.begin(async (tx) => {
			await lockReleases(tx);
			await tx`set local timezone to 'UTC'`;
			const { manifest } = release;
			const admin = await registerDataset(tx, manifest.administration);
			const boundary = await registerDataset(tx, manifest.boundaries);
			const populationRelease = await registerDataset(tx, manifest.population);
			const { id: adminDataset } = admin;
			const { id: boundaryDataset } = boundary;
			const { id: populationDataset } = populationRelease;
			const geography = manifest.geography;
			const batchId = await recordImport(
				tx,
				"foundation",
				geography.code,
				manifest,
				[adminDataset, boundaryDataset, populationDataset],
			);
			if (admin.published && boundary.published && populationRelease.published)
				return;
			await tx`
        insert into market_entry.geography_versions (authority_source_id, dataset_version_id, code, name, effective_from)
        values (${manifest.administration.source.id}, ${adminDataset}, ${geography.code}, ${geography.name}, ${geography.effectiveFrom})
        on conflict (code) do nothing
      `;
			const [version] = await tx<
				{
					geography_version_id: string;
					dataset_version_id: string;
					status: string;
				}[]
			>`
        select geography_version_id, dataset_version_id, status from market_entry.geography_versions where code = ${geography.code}
      `;
			if (
				version.dataset_version_id !== adminDataset ||
				version.status === "retired"
			) {
				throw new Error(
					`Geography version ${geography.code} already belongs to another release or is retired`,
				);
			}

			const geoIds = new Map<string, string>();
			for (const [level, units] of [
				["country", [release.country]],
				["province", release.provinces],
				["commune", release.communes],
			] as const) {
				const records = units.map((unit) => {
					const parentId =
						unit.parent === null ? null : geoIds.get(unit.parent);
					if (unit.parent !== null && !parentId)
						throw new Error(`Missing parent geography ${unit.parent}`);
					return {
						geography_version_id: version.geography_version_id,
						admin_code: unit.code,
						name: unit.name,
						display_name:
							level === "province"
								? unit.name.replace(/^(Tỉnh|Thành phố)\s+/i, "")
								: unit.name,
						normalized_name: normalizeSearch(unit.name),
						level,
						parent_geo_id: parentId ?? null,
						valid_from: geography.effectiveFrom,
						geometry_status: "not_available",
					};
				});
				for (let offset = 0; offset < records.length; offset += 500) {
					await tx`
            insert into market_entry.geo_units ${tx(records.slice(offset, offset + 500))}
            on conflict (geography_version_id, admin_code) do nothing
          `;
				}
				const ids = await tx<{ admin_code: string; geo_id: string }[]>`
          select admin_code, geo_id from market_entry.geo_units
          where geography_version_id = ${version.geography_version_id} and level = ${level}
        `;
				if (ids.length !== units.length)
					throw new Error(`Unexpected stored coverage for ${level}`);
				for (const row of ids) geoIds.set(row.admin_code, row.geo_id);
			}

			for (const feature of release.boundaries) {
				const geoId = geoIds.get(feature.properties.code);
				if (!geoId)
					throw new Error(
						`Missing province geography ${feature.properties.code}`,
					);
				try {
					await tx`
            insert into market_entry.geo_boundaries (geo_id, dataset_version_id, geom)
            values (${geoId}, ${boundaryDataset}, ST_ForcePolygonCCW(ST_GeomFromGeoJSON(${JSON.stringify(feature.geometry)})))
            on conflict (geo_id, dataset_version_id) do nothing
          `;
				} catch (error) {
					throw new Error(
						`PostGIS rejected province boundary ${feature.properties.code}`,
						{ cause: error },
					);
				}
			}

			await tx`
        insert into market_entry.indicator_definitions
          (code, label, description, domain, value_type, unit, period_type, polarity, is_proxy, score_eligible, status)
        values ('POP_AVG', 'Average population', 'Annual average resident population published by Vietnam’s National Statistics Office.',
          'population', 'integer', 'people', 'year', 'context_only', true, false, 'active')
        on conflict (code) do nothing
      `;
			const [indicator] = await tx<{ indicator_id: string }[]>`
        select indicator_id from market_entry.indicator_definitions
        where code = 'POP_AVG' and value_type = 'integer' and unit = 'people' and polarity = 'context_only'
          and is_proxy and not score_eligible and status = 'active'
      `;
			if (!indicator) throw new Error("POP_AVG has incompatible metadata");
			const { year, values, method, limitations } = release.population;
			const observations = values.map(({ code, people }) => {
				const geoId = geoIds.get(code);
				if (!geoId) throw new Error(`Missing population geography ${code}`);
				return {
					geo_id: geoId,
					indicator_id: indicator.indicator_id,
					period_start: `${year}-01-01`,
					period_end: `${year}-12-31`,
					period_label: `${year}`,
					value_numeric: people,
					value_type: "integer",
					unit: "people",
					scope: "total_resident_population",
					source_id: manifest.population.source.id,
					dataset_version_id: populationDataset,
					quality_status: "supported",
					method_note: method,
					limitations,
				};
			});
			await tx`
        insert into market_entry.observations ${tx(observations)}
        on conflict on constraint observations_natural_key do nothing
      `;

			if (publish) {
				await tx`
          update market_entry.dataset_versions set publication_status = 'published', published_at = coalesce(published_at, now())
          where dataset_version_id in (${adminDataset}, ${boundaryDataset}, ${populationDataset})
        `;
				await tx`
          update market_entry.geography_versions set status = 'active' where geography_version_id = ${version.geography_version_id}
        `;
				await tx`
          update market_entry.geo_units as geo
          set geometry_status = 'boundary_verified',
              longitude = ST_X(ST_PointOnSurface(boundary.geom)), latitude = ST_Y(ST_PointOnSurface(boundary.geom))
          from market_entry.geo_boundaries as boundary
          where geo.geo_id = boundary.geo_id and boundary.dataset_version_id = ${boundaryDataset}
        `;
				await tx`
          update market_entry.geography_versions set status = 'retired' where code = 'demo-context-v1' and dataset_version_id is null
        `;
				await tx`
          update market_entry.dataset_versions set publication_status = 'retired'
          where dataset_code = 'DEMO_CONTEXT' and version_label = 'demo-v1' and owner_name is null
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
		manifest = "data/sprint1/manifest.json",
		...extra
	] = process.argv.slice(2);
	if (!["--validate", "--stage", "--publish"].includes(mode) || extra.length) {
		throw new Error(
			"Usage: bun run db:import [--validate|--stage|--publish] [manifest.json]",
		);
	}
	assertLocalPublish(mode === "--publish");
	const release = await loadRelease(resolve(manifest));
	if (mode !== "--validate") await importRelease(release, mode === "--publish");
	console.log(
		JSON.stringify({
			status: mode === "--publish" ? "published" : "validated",
			databaseWritten: mode !== "--validate",
			geographyVersion: release.manifest.geography.code,
			provinces: release.provinces.length,
			communes: release.communes.length,
			boundaries: release.boundaries.length,
			observations: release.population.values.length,
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
