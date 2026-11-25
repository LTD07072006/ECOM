import { databasePool } from "../../db/pool";
import { reportUnavailable } from "../../lib/api-operations";
import {
	loadPublishedGeography,
	publicReleaseConditions,
} from "../geography/database-repository";
import type { InfrastructureKind } from "./layers";
import {
	canonicalInfrastructurePois,
	type ProvinceProximityMatch,
	type ProximitySearchResult,
	type ReferenceInfrastructurePoi,
} from "./proximity";

type ProximitySqlRow = {
	geo_id: string;
	admin_code: string;
	display_name: string;
	nearest_code: string;
	nearest_name: string;
	distance_km: number;
	within_radius: boolean;
};

export async function findProvincesWithinInfrastructureRadius(
	kind: InfrastructureKind,
	maxKm: number,
): Promise<ProximitySearchResult> {
	const safeMaxKm = Math.min(Math.max(maxKm, 1), 1500);
	const maxMeters = safeMaxKm * 1000;
	const fallbackPois = canonicalInfrastructurePois.filter(
		(poi) => poi.kind === kind,
	);

	try {
		return await databasePool().begin(
			"isolation level repeatable read read only",
			async (sql) => {
				const release = await loadPublishedGeography(sql);
				if (!release) {
					return {
						mode: "unavailable",
						kind,
						maxKm: safeMaxKm,
						totalProvinces: 0,
						matchedCount: 0,
						matchedProvinceIds: [],
						provinces: [],
						pois: [],
					};
				}

				const dbPois = await sql<
					{
						code: string | null;
						name: string;
						province_code: string;
						province_name: string;
						latitude: number;
						longitude: number;
						airport_classification: "international" | "domestic" | null;
						operational_status:
							| "operational"
							| "planned"
							| "not_operational"
							| null;
						port_type:
							| "deep_sea"
							| "coastal"
							| "river"
							| "container_terminal"
							| null;
						classification_source_url: string | null;
						reference_url: string;
					}[]
				>`
          with latest_release as (
            select distinct on (poi.kind) poi.kind, dataset.dataset_version_id
            from market_entry.infrastructure_pois poi
            join market_entry.geo_units geo on geo.geo_id = poi.geo_id
            join market_entry.dataset_versions dataset on dataset.dataset_version_id = poi.dataset_version_id
            join market_entry.source_registry source on source.source_id = dataset.source_id
            where poi.kind = ${kind}
              and ${publicReleaseConditions(sql)}
              and geo.geography_version_id = ${release.geography_version_id}
              and geo.level = 'province'
            order by poi.kind, dataset.data_as_of desc, dataset.published_at desc, dataset.dataset_version_id
          )
          select
            poi.code,
            poi.name,
            geo.admin_code as province_code,
			geo.display_name as province_name,
			ST_Y(poi.geom)::float as latitude,
			ST_X(poi.geom)::float as longitude,
			poi.airport_classification,
			poi.operational_status,
			poi.port_type,
			poi.classification_source_url,
			poi.reference_url
          from latest_release
          join market_entry.infrastructure_pois poi
            on poi.dataset_version_id = latest_release.dataset_version_id and poi.kind = latest_release.kind
          join market_entry.geo_units geo on geo.geo_id = poi.geo_id
          order by poi.name
        `;

				const activePois: ReferenceInfrastructurePoi[] =
					dbPois.length > 0
						? dbPois.map((row) => ({
								code: row.code ?? row.name,
								name: row.name,
								kind,
								provinceCode: row.province_code,
								provinceName: row.province_name,
								latitude: Number(row.latitude),
								longitude: Number(row.longitude),
								referenceUrl: row.reference_url,
								airportClassification: row.airport_classification,
								airportOperationalStatus:
									kind === "airport" ? row.operational_status : null,
								portType: row.port_type,
								portOperationalStatus:
									kind === "seaport" ? row.operational_status : null,
								classificationSourceUrl: row.classification_source_url,
							}))
						: [...fallbackPois];

				const rows = await sql<ProximitySqlRow[]>`
          with poi_points as (
            select
              item.code,
              item.name,
              ST_SetSRID(ST_MakePoint(item.longitude, item.latitude), 4326)::geography as geog
            from jsonb_to_recordset(${sql.json(activePois)}::jsonb) as item(
              code text,
              name text,
              latitude double precision,
              longitude double precision
            )
          ),
          provinces as (
            select
              geo.geo_id,
              geo.admin_code,
              geo.display_name,
              ST_SetSRID(ST_MakePoint(geo.longitude::double precision, geo.latitude::double precision), 4326)::geography as geog
            from market_entry.geo_units as geo
            where geo.geography_version_id = ${release.geography_version_id}
              and geo.level = 'province'
              and geo.valid_from <= current_date
              and (geo.valid_to is null or geo.valid_to >= current_date)
              and geo.latitude is not null
              and geo.longitude is not null
          )
          select
            p.geo_id,
            p.admin_code,
            p.display_name,
            nearest.code as nearest_code,
            nearest.name as nearest_name,
            round((nearest.dist_m / 1000.0)::numeric, 1)::float as distance_km,
            exists (
              select 1 from poi_points poi
              where ST_DWithin(p.geog, poi.geog, ${maxMeters})
            ) as within_radius
          from provinces p
          cross join lateral (
            select
              poi.code,
              poi.name,
              ST_Distance(p.geog, poi.geog) as dist_m
            from poi_points poi
            order by ST_Distance(p.geog, poi.geog) asc, poi.code asc
            limit 1
          ) as nearest
          order by distance_km asc, p.display_name asc
        `;

				const provinces: ProvinceProximityMatch[] = rows.map((row) => ({
					geoId: row.geo_id,
					code: row.admin_code,
					name: row.display_name,
					nearestPoiCode: row.nearest_code,
					nearestPoiName: row.nearest_name,
					nearestPoiKind: kind,
					distanceKm: Number(row.distance_km),
					withinRadius: Boolean(row.within_radius),
				}));
				const matchedProvinceIds = provinces
					.filter((item) => item.withinRadius)
					.map((item) => item.geoId);

				return {
					mode: "database",
					kind,
					maxKm: safeMaxKm,
					totalProvinces: provinces.length,
					matchedCount: matchedProvinceIds.length,
					matchedProvinceIds,
					provinces,
					pois: activePois,
				};
			},
		);
	} catch {
		reportUnavailable("database");
		return {
			mode: "unavailable",
			kind,
			maxKm: safeMaxKm,
			totalProvinces: 0,
			matchedCount: 0,
			matchedProvinceIds: [],
			provinces: [],
			pois: [],
		};
	}
}
