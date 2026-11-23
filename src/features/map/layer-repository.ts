import { createHash } from "node:crypto";
import type { Point } from "geojson";
import { databasePool } from "../../db/pool";
import { safeSourceUrl } from "../../lib/source-url";
import { compareCohortPriority } from "../geography/cohort-policy";
import {
	loadPublishedGeography,
	publishedDatasetColumns,
	publicReleaseConditions,
	toDataset,
	type DatasetRow,
} from "../geography/database-repository";
import {
	indicatorGroups,
	type MapLayers,
	type StatisticalLayer,
} from "./layers";

type StatisticalRow = DatasetRow & {
	dataset_id: string;
	indicator: string;
	label: string;
	definition: string;
	geo_id: string;
	period_label: string;
	period_start: string;
	period_end: string;
	unit: string;
	scope: string;
	value_numeric: string | null;
	method_note: string | null;
	limitations: string | null;
	quality_status: string;
	missing_reason: string | null;
};

export async function loadMapLayers(): Promise<MapLayers> {
	return databasePool().begin(
		"isolation level repeatable read read only",
		async (sql) => {
			const geography = await loadPublishedGeography(sql);
			if (!geography) return { indicators: [], infrastructure: null };

			const stats = await sql<
				(StatisticalRow & { published_at: string | null })[]
			>`
        select indicator.code as indicator, indicator.label,
          indicator.description as definition, geo.geo_id, observation.period_label,
          observation.period_start::text, observation.period_end::text, observation.unit, observation.scope,
          case when observation.quality_status <> 'unavailable' then observation.value_numeric end as value_numeric,
          observation.method_note, observation.limitations, observation.quality_status, observation.missing_reason,
          dataset.published_at::text as published_at, ${publishedDatasetColumns(sql)}
        from market_entry.observations observation
        join market_entry.geo_units geo on geo.geo_id = observation.geo_id
        join market_entry.indicator_definitions indicator on indicator.indicator_id = observation.indicator_id
        join market_entry.dataset_versions dataset on dataset.dataset_version_id = observation.dataset_version_id
        join market_entry.source_registry source on source.source_id = dataset.source_id
        where geo.geography_version_id = ${geography.geography_version_id} and geo.level = 'province'
          and geo.valid_from <= current_date and (geo.valid_to is null or geo.valid_to >= current_date)
          and indicator.status = 'active' and indicator.code = any(${Object.keys(indicatorGroups)}::text[])
          and ${publicReleaseConditions(sql)}
        order by observation.period_end desc, dataset.published_at desc, dataset.dataset_version_id, geo.admin_code
      `;

			const grouped = new Map<
				string,
				{ layer: StatisticalLayer; publishedAt: string | null }
			>();
			for (const row of stats) {
				const id = JSON.stringify([
					row.dataset_id,
					row.indicator,
					row.period_start,
					row.period_end,
					row.scope,
					row.unit,
				]);
				let entry = grouped.get(id);
				if (!entry) {
					entry = {
						publishedAt: row.published_at,
						layer: {
							id,
							indicator: row.indicator,
							label: row.label,
							definition: row.definition,
							geographyVersion: geography.geography_code,
							period: row.period_label,
							periodStart: row.period_start,
							periodEnd: row.period_end,
							unit: row.unit,
							scope: row.scope,
							limitations: row.limitations ?? "",
							method: row.method_note ?? "",
							dataset: toDataset(row),
							values: {},
							valueDetails: {},
						},
					};
					grouped.set(id, entry);
				}
				const { layer } = entry;
				layer.values[row.geo_id] =
					row.value_numeric === null ? null : Number(row.value_numeric);
				layer.valueDetails ??= {};
				layer.valueDetails[row.geo_id] = {
					quality: row.quality_status,
					missingReason: row.missing_reason,
					method: row.method_note,
					limitations: row.limitations,
				};
			}

			const pois = await sql<
				(DatasetRow & {
					source_key: string;
					name: string;
					code: string | null;
					kind:
						| "airport"
						| "seaport"
						| "industrial_park"
						| "icd"
						| "expressway_node";
					geo_id: string;
					province: string;
					reference_url: string;
					geometry: Point;
				})[]
			>`
        with release_per_kind as (
          select distinct on (poi.kind) poi.kind, dataset.dataset_version_id
          from market_entry.infrastructure_pois poi
          join market_entry.geo_units geo on geo.geo_id = poi.geo_id
          join market_entry.dataset_versions dataset on dataset.dataset_version_id = poi.dataset_version_id
          join market_entry.source_registry source on source.source_id = dataset.source_id
          where ${publicReleaseConditions(sql)}
            and geo.geography_version_id = ${geography.geography_version_id}
            and geo.level = 'province'
          order by poi.kind, dataset.data_as_of desc, dataset.published_at desc, dataset.dataset_version_id
        )
        select poi.source_key, poi.name, poi.code, poi.kind, poi.geo_id, geo.display_name as province,
          poi.reference_url, ST_AsGeoJSON(poi.geom, 6)::json as geometry, ${publishedDatasetColumns(sql)}
        from release_per_kind
        join market_entry.infrastructure_pois poi
          on poi.dataset_version_id = release_per_kind.dataset_version_id and poi.kind = release_per_kind.kind
        join market_entry.geo_units geo on geo.geo_id = poi.geo_id
        join market_entry.dataset_versions dataset on dataset.dataset_version_id = poi.dataset_version_id
        join market_entry.source_registry source on source.source_id = dataset.source_id
        where geo.geography_version_id = ${geography.geography_version_id} and geo.level = 'province'
          and geo.valid_from <= current_date and (geo.valid_to is null or geo.valid_to >= current_date)
        order by poi.kind, poi.name
      `;
			const codes = Object.keys(indicatorGroups);
			const indicators = [...grouped.values()]
				.sort(
					(left, right) =>
						codes.indexOf(left.layer.indicator) -
							codes.indexOf(right.layer.indicator) ||
						compareCohortPriority(
							{
								periodEnd: left.layer.periodEnd,
								coverage: Object.keys(left.layer.values).length,
								publishedAt: left.publishedAt,
								datasetId: left.layer.dataset.id ?? "",
								periodStart: left.layer.periodStart,
								scope: left.layer.scope,
								unit: left.layer.unit,
							},
							{
								periodEnd: right.layer.periodEnd,
								coverage: Object.keys(right.layer.values).length,
								publishedAt: right.publishedAt,
								datasetId: right.layer.dataset.id ?? "",
								periodStart: right.layer.periodStart,
								scope: right.layer.scope,
								unit: right.layer.unit,
							},
						),
				)
				.map((entry) => entry.layer);
			const kindCounts: Record<string, number> = {};
			for (const poi of pois) {
				kindCounts[poi.kind] = (kindCounts[poi.kind] ?? 0) + 1;
			}
			return {
				indicators,
				infrastructure: pois[0]
					? {
							dataset: toDataset(pois[0]),
							kinds: kindCounts,
							points: {
								type: "FeatureCollection",
								features: pois.map((poi) => ({
									type: "Feature",
									id: poi.source_key,
									geometry: poi.geometry,
									properties: {
										name: poi.name,
										code: poi.code,
										kind: poi.kind,
										geoId: poi.geo_id,
										province: poi.province,
										url: safeSourceUrl(poi.reference_url) ?? "",
									},
								})),
							},
						}
					: null,
			};
		},
	);
}

export async function loadMapLayersTag(): Promise<string | null> {
	return databasePool().begin(
		"isolation level repeatable read read only",
		async (sql) => {
			const geography = await loadPublishedGeography(sql);
			if (!geography) return null;

			const datasetRows = await sql<{ dataset_version_id: string }[]>`
      select distinct dataset.dataset_version_id
      from market_entry.observations observation
      join market_entry.geo_units geo on geo.geo_id = observation.geo_id
      join market_entry.indicator_definitions indicator on indicator.indicator_id = observation.indicator_id
      join market_entry.dataset_versions dataset on dataset.dataset_version_id = observation.dataset_version_id
      join market_entry.source_registry source on source.source_id = dataset.source_id
      where geo.geography_version_id = ${geography.geography_version_id} and geo.level = 'province'
        and geo.valid_from <= current_date and (geo.valid_to is null or geo.valid_to >= current_date)
        and indicator.status = 'active' and indicator.code = any(${Object.keys(indicatorGroups)}::text[])
        and ${publicReleaseConditions(sql)}
      union
      select distinct dataset.dataset_version_id
      from market_entry.infrastructure_pois poi
      join market_entry.geo_units geo on geo.geo_id = poi.geo_id
      join market_entry.dataset_versions dataset on dataset.dataset_version_id = poi.dataset_version_id
      join market_entry.source_registry source on source.source_id = dataset.source_id
      where geo.geography_version_id = ${geography.geography_version_id} and geo.level = 'province'
        and ${publicReleaseConditions(sql)}
      order by 1
    `;

			if (datasetRows.length === 0) return null;
			const digest = createHash("sha256")
				.update(geography.geography_version_id)
				.update(":")
				.update(datasetRows.map((row) => row.dataset_version_id).join(","))
				.update(":g6")
				.digest("hex")
				.slice(0, 16);
			return `W/"layers-${digest}"`;
		},
	);
}
