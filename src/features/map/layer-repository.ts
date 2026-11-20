import postgres from "postgres";
import type { Point } from "geojson";
import { env } from "../../lib/env";
import { loadPublishedGeography, publishedDatasetColumns, publicReleaseConditions, toDataset, type DatasetRow } from "../geography/database-repository";
import { indicatorGroups, type MapLayers, type StatisticalLayer } from "./layers";

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
};

export async function loadMapLayers(): Promise<MapLayers> {
  const client = postgres(env.DATABASE_URL, { max: 1, connect_timeout: 4 });
  try {
    return await client.begin("isolation level repeatable read read only", async (sql) => {
      const geography = await loadPublishedGeography(sql);
      if (!geography) return { indicators: [], infrastructure: null };

      const stats = await sql<StatisticalRow[]>`
        select dataset.dataset_version_id as dataset_id, indicator.code as indicator, indicator.label,
          indicator.description as definition, geo.geo_id, observation.period_label,
          observation.period_start::text, observation.period_end::text, observation.unit, observation.scope,
          case when observation.quality_status <> 'unavailable' then observation.value_numeric end as value_numeric,
          observation.method_note, observation.limitations, ${publishedDatasetColumns(sql)}
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

      const grouped = new Map<string, StatisticalLayer>();
      for (const row of stats) {
        const id = JSON.stringify([row.dataset_id, row.indicator, row.period_start, row.period_end, row.scope]);
        let layer = grouped.get(id);
        if (!layer) {
          layer = {
            id, indicator: row.indicator, label: row.label, definition: row.definition,
            geographyVersion: geography.geography_code, period: row.period_label, periodStart: row.period_start,
            periodEnd: row.period_end, unit: row.unit, scope: row.scope, limitations: row.limitations ?? "",
            method: row.method_note ?? "", dataset: toDataset(row), values: {},
          };
          grouped.set(id, layer);
        }
        layer.values[row.geo_id] = row.value_numeric === null ? null : Number(row.value_numeric);
      }

      const pois = await sql<(DatasetRow & { source_key: string; name: string; code: string | null;
        geo_id: string; province: string; reference_url: string; geometry: Point })[]>`
        with release as (
          select dataset.dataset_version_id
          from market_entry.dataset_versions dataset
          join market_entry.source_registry source on source.source_id = dataset.source_id
          where ${publicReleaseConditions(sql)} and exists (
            select 1 from market_entry.infrastructure_pois poi
            join market_entry.geo_units geo on geo.geo_id = poi.geo_id
            where poi.dataset_version_id = dataset.dataset_version_id and geo.geography_version_id = ${geography.geography_version_id}
          )
          order by dataset.data_as_of desc, dataset.published_at desc, dataset.dataset_version_id
          limit 1
        )
        select poi.source_key, poi.name, poi.code, poi.geo_id, geo.display_name as province,
          poi.reference_url, ST_AsGeoJSON(poi.geom, 12)::json as geometry, ${publishedDatasetColumns(sql)}
        from release
        join market_entry.infrastructure_pois poi using (dataset_version_id)
        join market_entry.geo_units geo on geo.geo_id = poi.geo_id
        join market_entry.dataset_versions dataset on dataset.dataset_version_id = poi.dataset_version_id
        join market_entry.source_registry source on source.source_id = dataset.source_id
        where geo.geography_version_id = ${geography.geography_version_id} and geo.level = 'province'
          and geo.valid_from <= current_date and (geo.valid_to is null or geo.valid_to >= current_date)
        order by poi.name
      `;
      const codes = Object.keys(indicatorGroups);
      const indicators = [...grouped.values()].sort((left, right) => codes.indexOf(left.indicator) - codes.indexOf(right.indicator)
        || right.periodEnd.localeCompare(left.periodEnd) || Object.keys(right.values).length - Object.keys(left.values).length);
      return {
        indicators,
        infrastructure: pois[0] ? {
          dataset: toDataset(pois[0]),
          points: {
            type: "FeatureCollection",
            features: pois.map((poi) => ({
              type: "Feature", id: poi.source_key, geometry: poi.geometry,
              properties: { name: poi.name, code: poi.code, geoId: poi.geo_id, province: poi.province, url: poi.reference_url },
            })),
          },
        } : null,
      };
    });
  } finally {
    await client.end();
  }
}
