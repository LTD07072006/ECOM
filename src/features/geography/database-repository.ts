import type postgres from "postgres";
import type { MultiPolygon, Polygon } from "geojson";
import { databasePool } from "../../db/pool";
import { safeSourceUrl } from "../../lib/source-url";
import type { Catalog, DatasetMetadata, Geography, Observation, ProvinceMapData, Source } from "./types";

export type DatasetRow = {
  dataset_id: string;
  dataset_code: string;
  version_label: string;
  owner_name: string;
  data_as_of: string;
  reviewed_at: Date;
  review_due_at: Date;
  source_id: string;
  publisher: string;
  source_title: string;
  source_url: string | null;
  citation_text: string;
  license: string;
  access_right: string;
  source_status: string;
};

type GeographyRow = {
  geo_id: string;
  admin_code: string;
  name: string;
  display_name: string;
  normalized_name: string;
  level: Geography["level"];
  parent_geo_id: string | null;
  parent_name: string | null;
  latitude: string | null;
  longitude: string | null;
  geometry_status: Geography["geometryStatus"];
};

type ObservationRow = DatasetRow & {
  observation_id: string;
  geo_id: string;
  indicator: string;
  label: string;
  definition: string;
  value_numeric: string | null;
  unit: string;
  period_label: string;
  period_start: string;
  period_end: string;
  scope: string;
  quality_status: Observation["quality"];
  score_eligible: boolean;
  missing_reason: string | null;
  method_note: string | null;
  limitations: string | null;
};

const toNumber = (value: string | null) => value === null ? null : Number(value);

export function toDataset(row: DatasetRow): DatasetMetadata {
  const source: Source = {
    id: row.source_id,
    publisher: row.publisher,
    title: row.source_title,
    url: safeSourceUrl(row.source_url),
    citation: row.citation_text,
    license: row.license,
    access: row.access_right,
    status: row.source_status,
    updatedAt: row.reviewed_at.toISOString(),
  };
  return {
    id: row.dataset_id,
    code: row.dataset_code,
    version: row.version_label,
    owner: row.owner_name,
    dataAsOf: row.data_as_of,
    reviewedAt: row.reviewed_at.toISOString(),
    reviewDueAt: row.review_due_at.toISOString(),
    freshness: row.review_due_at.valueOf() > Date.now() ? "current" : "review_due",
    publicationStatus: "published",
    source,
  };
}

export function publishedDatasetColumns(sql: postgres.TransactionSql) {
  return sql`dataset.dataset_version_id as dataset_id, dataset.dataset_code, dataset.version_label, dataset.owner_name, dataset.data_as_of::text,
    dataset.reviewed_at, dataset.review_due_at, source.source_id, source.publisher,
    source.title as source_title, source.url as source_url, source.citation_text, source.license,
    source.access_right, source.status as source_status`;
}

export function publicReleaseConditions(sql: postgres.TransactionSql) {
  return sql`dataset.publication_status = 'published' and source.access_right = 'public' and source.status = 'active'`;
}

export async function loadPublishedGeography(sql: postgres.TransactionSql) {
  const [release] = await sql<(DatasetRow & { geography_version_id: string; geography_code: string })[]>`
    select geography.geography_version_id, geography.code as geography_code, ${publishedDatasetColumns(sql)}
    from market_entry.geography_versions as geography
    join market_entry.dataset_versions as dataset on dataset.dataset_version_id = geography.dataset_version_id
    join market_entry.source_registry as source on source.source_id = dataset.source_id
    where geography.status = 'active' and geography.effective_from <= current_date
      and (geography.effective_to is null or geography.effective_to >= current_date)
      and ${publicReleaseConditions(sql)}
    order by geography.effective_from desc, dataset.published_at desc, geography.code desc
    limit 1
  `;
  return release;
}

export async function loadDatabaseCatalog(geoIds?: string[], includeObservations = true): Promise<Catalog> {
  return databasePool().begin("isolation level repeatable read read only", async (sql) => {
      const release = await loadPublishedGeography(sql);
      if (!release) return { mode: "database", publicationStatus: "unpublished", source: null, geographies: [], observations: [] };

      const geographies = await sql<GeographyRow[]>`
        select geo.geo_id, geo.admin_code, geo.name, geo.display_name, geo.normalized_name, geo.level,
          geo.parent_geo_id, parent.display_name as parent_name, geo.latitude, geo.longitude,
          case when exists (
            select 1 from market_entry.geo_boundaries as boundary
            join market_entry.dataset_versions as dataset on dataset.dataset_version_id = boundary.dataset_version_id
            join market_entry.source_registry as source on source.source_id = dataset.source_id
            where boundary.geo_id = geo.geo_id and ${publicReleaseConditions(sql)}
              and boundary.dataset_version_id = (
                select chosen.dataset_version_id
                from market_entry.dataset_versions chosen
                join market_entry.source_registry chosen_source on chosen_source.source_id = chosen.source_id
                where chosen.publication_status = 'published' and chosen_source.access_right = 'public' and chosen_source.status = 'active'
                  and exists (
                    select 1 from market_entry.geo_boundaries candidate
                    join market_entry.geo_units unit on unit.geo_id = candidate.geo_id
                    where candidate.dataset_version_id = chosen.dataset_version_id
                      and unit.geography_version_id = ${release.geography_version_id} and unit.level = 'province'
                  )
                order by chosen.published_at desc, chosen.dataset_version_id limit 1
              )
          ) then 'boundary_verified' else 'not_available' end as geometry_status
        from market_entry.geo_units as geo
        left join market_entry.geo_units as parent on parent.geo_id = geo.parent_geo_id
        where geo.geography_version_id = ${release.geography_version_id} and geo.valid_from <= current_date
          and (geo.valid_to is null or geo.valid_to >= current_date)
          and (${geoIds ?? null}::uuid[] is null or geo.geo_id = any(${geoIds ?? null}::uuid[]))
        order by case geo.level when 'country' then 0 when 'province' then 1 else 2 end, geo.display_name, geo.admin_code
      `;

      const observations = includeObservations ? await sql<ObservationRow[]>`
        with eligible as (
          select observation.observation_id, observation.geo_id, indicator.indicator_id, indicator.code as indicator, indicator.label,
          indicator.description as definition, indicator.score_eligible, observation.value_numeric, observation.unit,
          observation.period_label, observation.period_start::text, observation.period_end::text,
          observation.scope, observation.quality_status, observation.missing_reason, observation.method_note,
          observation.limitations, ${publishedDatasetColumns(sql)}, dataset.published_at,
          geo.level
        from market_entry.observations as observation
        join market_entry.geo_units as geo on geo.geo_id = observation.geo_id
        join market_entry.indicator_definitions as indicator on indicator.indicator_id = observation.indicator_id
        join market_entry.dataset_versions as dataset on dataset.dataset_version_id = observation.dataset_version_id
        join market_entry.source_registry as source on source.source_id = dataset.source_id
        where geo.geography_version_id = ${release.geography_version_id}
          and indicator.status = 'active' and ${publicReleaseConditions(sql)}
        ), cohorts as (
          select indicator_id, level, dataset_id, period_start, period_end, scope, unit, published_at,
            count(distinct geo_id) as coverage
          from eligible group by indicator_id, level, dataset_id, period_start, period_end, scope, unit, published_at
        ), chosen as (
          select distinct on (indicator_id, level) * from cohorts
          order by indicator_id, level, period_end desc, coverage desc, published_at desc,
            dataset_id, period_start desc, scope, unit
        )
        select distinct on (e.geo_id, e.indicator_id) e.* from eligible e
        join chosen c on c.indicator_id = e.indicator_id and c.level = e.level and c.dataset_id = e.dataset_id
          and c.period_start = e.period_start and c.period_end = e.period_end and c.scope = e.scope and c.unit = e.unit
        where (${geoIds ?? null}::uuid[] is null or e.geo_id = any(${geoIds ?? null}::uuid[]))
        order by e.geo_id, e.indicator_id, e.observation_id
      ` : [];

      const dataset = toDataset(release);
      return {
        mode: "database",
        publicationStatus: "published",
        source: dataset.source,
        dataset,
        geographies: geographies.map((row) => ({
          id: row.geo_id, code: row.admin_code, name: row.name, displayName: row.display_name,
          normalizedName: row.normalized_name, level: row.level, parentId: row.parent_geo_id, parentName: row.parent_name,
          geographyVersion: release.geography_code, latitude: toNumber(row.latitude), longitude: toNumber(row.longitude),
          geometryStatus: row.geometry_status,
        })),
        observations: observations.map((row) => {
          const dataset = toDataset(row);
          return {
            id: row.observation_id, geoId: row.geo_id, indicator: row.indicator, label: row.label, definition: row.definition,
            value: toNumber(row.value_numeric), unit: row.unit, period: row.period_label, periodStart: row.period_start,
            periodEnd: row.period_end, scope: row.scope, quality: row.quality_status, missingReason: row.missing_reason,
            scoreEligible: row.score_eligible,
            method: row.method_note ?? "No method note supplied.", limitations: row.limitations ?? "No limitations supplied.",
            datasetVersion: row.version_label, dataset, source: dataset.source,
          };
        }),
      };
  });
}

export async function loadProvinceMap(): Promise<ProvinceMapData> {
  return databasePool().begin("isolation level repeatable read read only", async (sql) => {
      const release = await loadPublishedGeography(sql);
      if (!release) return { type: "FeatureCollection", features: [], dataset: null };
      const shapes = await sql<(DatasetRow & {
        geo_id: string; admin_code: string; display_name: string; geometry: Polygon | MultiPolygon;
      })[]>`
        with latest_dataset as (
          select dataset.dataset_version_id
          from market_entry.dataset_versions as dataset
          join market_entry.source_registry as source on source.source_id = dataset.source_id
          where ${publicReleaseConditions(sql)} and exists (
            select 1 from market_entry.geo_boundaries as boundary
            join market_entry.geo_units as geo on geo.geo_id = boundary.geo_id
            where boundary.dataset_version_id = dataset.dataset_version_id
              and geo.geography_version_id = ${release.geography_version_id} and geo.level = 'province'
          )
          order by dataset.published_at desc, dataset.dataset_version_id
          limit 1
        )
        select geo.geo_id, geo.admin_code, geo.display_name, ST_AsGeoJSON(boundary.geom, 15)::json as geometry,
          ${publishedDatasetColumns(sql)}
        from latest_dataset
        join market_entry.geo_boundaries as boundary on boundary.dataset_version_id = latest_dataset.dataset_version_id
        join market_entry.geo_units as geo on geo.geo_id = boundary.geo_id
        join market_entry.dataset_versions as dataset on dataset.dataset_version_id = boundary.dataset_version_id
        join market_entry.source_registry as source on source.source_id = dataset.source_id
        where geo.geography_version_id = ${release.geography_version_id} and geo.level = 'province'
          and geo.valid_from <= current_date and (geo.valid_to is null or geo.valid_to >= current_date)
        order by geo.admin_code
      `;
      return {
        type: "FeatureCollection",
        features: shapes.map((shape) => ({
          type: "Feature", id: shape.geo_id, geometry: shape.geometry,
          properties: { id: shape.geo_id, code: shape.admin_code, name: shape.display_name },
        })),
        dataset: shapes[0] ? toDataset(shapes[0]) : null,
      };
  });
}
