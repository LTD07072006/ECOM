import type postgres from "postgres";
import type { MultiPolygon, Polygon } from "geojson";
import { databasePool } from "../../db/pool";
import { safeSourceUrl } from "../../lib/source-url";
import { normalizeSearch } from "./domain";
import type {
	Catalog,
	DatasetMetadata,
	Geography,
	Observation,
	ProvinceMapData,
	Source,
} from "./types";

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

const toNumber = (value: string | null) =>
	value === null ? null : Number(value);

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
		freshness:
			row.review_due_at.valueOf() > Date.now() ? "current" : "review_due",
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
	const [release] = await sql<
		(DatasetRow & { geography_version_id: string; geography_code: string })[]
	>`
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

export async function loadDatabaseCatalog(
	geoIds?: string[],
	includeObservations = true,
	level?: Geography["level"],
	parentId?: string,
): Promise<Catalog> {
	return databasePool().begin(
		"isolation level repeatable read read only",
		async (sql) => {
			const release = await loadPublishedGeography(sql);
			if (!release)
				return {
					mode: "database",
					publicationStatus: "unpublished",
					source: null,
					geographies: [],
					observations: [],
				};

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
          and (${level ?? null}::text is null or geo.level = ${level ?? null})
          and (${parentId ?? null}::uuid is null or geo.parent_geo_id = ${parentId ?? null})
        order by case geo.level when 'country' then 0 when 'province' then 1 else 2 end, geo.display_name, geo.admin_code
      `;

			const observations = includeObservations
				? await sql<ObservationRow[]>`
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
          and (${level ?? null}::text is null or geo.level = ${level ?? null})
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
      `
				: [];

			const historyRows =
				includeObservations &&
				geoIds &&
				geoIds.length > 0 &&
				observations.length > 0
					? await sql<
							{
								geo_id: string;
								indicator: string;
								source_id: string;
								unit: string;
								scope: string;
								period_label: string;
								period_start: string;
								period_end: string;
								value_numeric: string | null;
								quality_status: Observation["quality"];
								version_label: string;
							}[]
						>`
          select distinct on (observation.geo_id, indicator.code, observation.source_id, observation.unit, observation.scope, observation.period_end)
            observation.geo_id, indicator.code as indicator, observation.source_id, observation.unit, observation.scope,
            observation.period_label, observation.period_start::text, observation.period_end::text,
            observation.value_numeric, observation.quality_status, dataset.version_label
          from market_entry.observations as observation
          join market_entry.geo_units as geo on geo.geo_id = observation.geo_id
          join market_entry.indicator_definitions as indicator on indicator.indicator_id = observation.indicator_id
          join market_entry.dataset_versions as dataset on dataset.dataset_version_id = observation.dataset_version_id
          join market_entry.source_registry as source on source.source_id = dataset.source_id
          where geo.geography_version_id = ${release.geography_version_id}
            and observation.geo_id = any(${geoIds}::uuid[])
            and indicator.status = 'active'
            and ${publicReleaseConditions(sql)}
          order by observation.geo_id, indicator.code, observation.source_id, observation.unit, observation.scope,
            observation.period_end asc, dataset.published_at desc, observation.observation_id
        `
					: [];

			const historyByKey = new Map<
				string,
				NonNullable<Observation["history"]>
			>();
			for (const row of historyRows) {
				const key = `${row.geo_id}|${row.indicator}|${row.source_id}|${row.unit}|${row.scope}`;
				const list = historyByKey.get(key) ?? [];
				list.push({
					period: row.period_label,
					periodStart: row.period_start,
					periodEnd: row.period_end,
					value: toNumber(row.value_numeric),
					quality: row.quality_status,
					datasetVersion: row.version_label,
				});
				historyByKey.set(key, list);
			}

			const dataset = toDataset(release);
			return {
				mode: "database",
				publicationStatus: "published",
				source: dataset.source,
				dataset,
				geographies: geographies.map((row) => ({
					id: row.geo_id,
					code: row.admin_code,
					name: row.name,
					displayName: row.display_name,
					normalizedName: row.normalized_name,
					level: row.level,
					parentId: row.parent_geo_id,
					parentName: row.parent_name,
					geographyVersion: release.geography_code,
					latitude: toNumber(row.latitude),
					longitude: toNumber(row.longitude),
					geometryStatus: row.geometry_status,
				})),
				observations: observations.map((row) => {
					const dataset = toDataset(row);
					const history = historyByKey.get(
						`${row.geo_id}|${row.indicator}|${row.source_id}|${row.unit}|${row.scope}`,
					);
					return {
						id: row.observation_id,
						geoId: row.geo_id,
						indicator: row.indicator,
						label: row.label,
						definition: row.definition,
						value: toNumber(row.value_numeric),
						unit: row.unit,
						period: row.period_label,
						periodStart: row.period_start,
						periodEnd: row.period_end,
						scope: row.scope,
						quality: row.quality_status,
						missingReason: row.missing_reason,
						scoreEligible: row.score_eligible,
						method: row.method_note ?? "No method note supplied.",
						limitations: row.limitations ?? "No limitations supplied.",
						datasetVersion: row.version_label,
						dataset,
						source: dataset.source,
						...(history ? { history } : {}),
					};
				}),
			};
		},
	);
}

export async function loadPublishedCommuneBoundary(
	provinceId: string,
	communeId: string,
) {
	return databasePool().begin(
		"isolation level repeatable read read only",
		async (sql) => {
			const release = await loadPublishedGeography(sql);
			if (!release) return null;
			const [row] = await sql<{ geometry: Polygon | MultiPolygon }[]>`
			select ST_AsGeoJSON(boundary.geom, 7)::json as geometry
			from market_entry.geo_boundaries boundary
			join market_entry.geo_units geo on geo.geo_id = boundary.geo_id
			join market_entry.dataset_versions dataset on dataset.dataset_version_id = boundary.dataset_version_id
			join market_entry.source_registry source on source.source_id = dataset.source_id
			where geo.geo_id = ${communeId} and geo.parent_geo_id = ${provinceId}
			  and geo.level = 'commune' and geo.geography_version_id = ${release.geography_version_id}
			  and geo.valid_from <= current_date and (geo.valid_to is null or geo.valid_to >= current_date)
			  and ${publicReleaseConditions(sql)}
			order by dataset.published_at desc, dataset.dataset_version_id limit 1
		`;
			return row?.geometry ?? null;
		},
	);
}

export async function loadProvinceMap(): Promise<ProvinceMapData> {
	return databasePool().begin(
		"isolation level repeatable read read only",
		async (sql) => {
			const release = await loadPublishedGeography(sql);
			if (!release)
				return { type: "FeatureCollection", features: [], dataset: null };
			const shapes = await sql<
				(DatasetRow & {
					geo_id: string;
					admin_code: string;
					display_name: string;
					geometry: Polygon | MultiPolygon;
				})[]
			>`
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
					type: "Feature",
					id: shape.geo_id,
					geometry: shape.geometry,
					properties: {
						id: shape.geo_id,
						code: shape.admin_code,
						name: shape.display_name,
					},
				})),
				dataset: shapes[0] ? toDataset(shapes[0]) : null,
			};
		},
	);
}

export type CatalogCoverage = {
	total: number;
	pointOnly: number;
	boundaryReady: number;
	publicBoundaryAvailable: boolean;
};

export type CatalogSummary = {
	mode: Catalog["mode"];
	publicationStatus: Catalog["publicationStatus"];
	dataset: DatasetMetadata | null;
	coverage: CatalogCoverage;
};

export async function loadDatabaseCatalogSummary(): Promise<CatalogSummary> {
	return databasePool().begin(
		"isolation level repeatable read read only",
		async (sql) => {
			const release = await loadPublishedGeography(sql);
			if (!release) {
				return {
					mode: "database",
					publicationStatus: "unpublished",
					dataset: null,
					coverage: {
						total: 0,
						pointOnly: 0,
						boundaryReady: 0,
						publicBoundaryAvailable: false,
					},
				};
			}

			const [counts] = await sql<{ total: number; boundary_ready: number }[]>`
      with latest_boundary as (
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
        order by chosen.published_at desc, chosen.dataset_version_id
        limit 1
      )
      select
        count(*)::int as total,
        count(boundary.geo_id)::int as boundary_ready
      from market_entry.geo_units as geo
      left join latest_boundary on true
      left join market_entry.geo_boundaries as boundary
        on boundary.geo_id = geo.geo_id and boundary.dataset_version_id = latest_boundary.dataset_version_id
      where geo.geography_version_id = ${release.geography_version_id}
        and geo.level = 'province'
        and geo.valid_from <= current_date
        and (geo.valid_to is null or geo.valid_to >= current_date)
    `;

			const total = counts?.total ?? 0;
			const boundaryReady = counts?.boundary_ready ?? 0;
			return {
				mode: "database",
				publicationStatus: "published",
				dataset: toDataset(release),
				coverage: {
					total,
					pointOnly: 0,
					boundaryReady,
					publicBoundaryAvailable: boundaryReady > 0,
				},
			};
		},
	);
}

function escapeLike(value: string) {
	return value.replace(/[\\%_]/g, (match) => `\\${match}`);
}

export type ComparableCatalogResult = Catalog & {
	availablePeriods: string[];
	selectedPeriod: string | null;
};

export async function loadComparableDatabaseCatalog(
	geoIds: string[],
	period?: string,
): Promise<ComparableCatalogResult> {
	const requestedPeriod = period?.trim() || null;
	return databasePool().begin(
		"isolation level repeatable read read only",
		async (sql) => {
			const release = await loadPublishedGeography(sql);
			if (!release) {
				return {
					mode: "database",
					publicationStatus: "unpublished",
					source: null,
					geographies: [],
					observations: [],
					availablePeriods: [],
					selectedPeriod: requestedPeriod,
				};
			}

			const geographies = await sql<GeographyRow[]>`
        select geo.geo_id, geo.admin_code, geo.name, geo.display_name, geo.normalized_name, geo.level,
          geo.parent_geo_id, parent.display_name as parent_name, geo.latitude, geo.longitude,
          case when exists (
            select 1 from market_entry.geo_boundaries as boundary
            join market_entry.dataset_versions as dataset on dataset.dataset_version_id = boundary.dataset_version_id
            join market_entry.source_registry as source on source.source_id = dataset.source_id
            where boundary.geo_id = geo.geo_id and ${publicReleaseConditions(sql)}
          ) then 'boundary_verified' else 'not_available' end as geometry_status
        from market_entry.geo_units as geo
        left join market_entry.geo_units as parent on parent.geo_id = geo.parent_geo_id
        where geo.geography_version_id = ${release.geography_version_id}
          and geo.valid_from <= current_date
          and (geo.valid_to is null or geo.valid_to >= current_date)
          and geo.geo_id = any(${geoIds}::uuid[])
        order by case geo.level when 'country' then 0 when 'province' then 1 else 2 end, geo.display_name, geo.admin_code
      `;

			const periodRows = await sql<{ period_label: string }[]>`
        select observation.period_label
        from market_entry.observations as observation
        join market_entry.geo_units as geo on geo.geo_id = observation.geo_id
        join market_entry.indicator_definitions as indicator on indicator.indicator_id = observation.indicator_id
        join market_entry.dataset_versions as dataset on dataset.dataset_version_id = observation.dataset_version_id
        join market_entry.source_registry as source on source.source_id = dataset.source_id
        where geo.geography_version_id = ${release.geography_version_id}
          and observation.geo_id = any(${geoIds}::uuid[])
          and indicator.status = 'active'
          and ${publicReleaseConditions(sql)}
        group by observation.period_label
        order by max(observation.period_end) desc, observation.period_label desc
      `;

			const observations = await sql<
				(ObservationRow & { history: Observation["history"] })[]
			>`
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
            and observation.geo_id = any(${geoIds}::uuid[])
            and (${requestedPeriod}::text is null or observation.period_label = ${requestedPeriod}::text)
            and indicator.status = 'active' and ${publicReleaseConditions(sql)}
        ), cohorts as (
          select indicator_id, level, dataset_id, period_start, period_end, scope, unit, published_at,
            count(distinct geo_id) as coverage,
            count(distinct geo_id) filter (where value_numeric is not null and quality_status <> 'unavailable') as usable_coverage
          from eligible
          group by indicator_id, level, dataset_id, period_start, period_end, scope, unit, published_at
        ), chosen as (
          select distinct on (indicator_id, level) * from cohorts
          order by indicator_id, level,
            case when usable_coverage = ${geoIds.length} then 0 else 1 end,
            case when coverage = ${geoIds.length} then 0 else 1 end,
            usable_coverage desc,
            coverage desc,
            period_end desc,
            published_at desc,
            dataset_id, period_start desc, scope, unit
        ), selected as (
          select distinct on (e.geo_id, e.indicator_id) e.* from eligible e
          join chosen c on c.indicator_id = e.indicator_id and c.level = e.level and c.dataset_id = e.dataset_id
            and c.period_start = e.period_start and c.period_end = e.period_end and c.scope = e.scope and c.unit = e.unit
          order by e.geo_id, e.indicator_id, e.observation_id
        )
        select e.*, coalesce(trend.history, '[]'::json) as history
        from selected e
        left join lateral (
          select json_agg(json_build_object(
            'period', h.period_label, 'periodStart', h.period_start, 'periodEnd', h.period_end,
            'value', h.value_numeric, 'quality', h.quality_status, 'datasetVersion', h.version_label
          ) order by h.period_end) as history
          from (
            select distinct on (o.period_end) o.period_label, o.period_start, o.period_end,
              o.value_numeric, o.quality_status, dataset.version_label
            from market_entry.observations o
            join market_entry.dataset_versions dataset on dataset.dataset_version_id = o.dataset_version_id
            join market_entry.source_registry source on source.source_id = dataset.source_id
            where o.geo_id = e.geo_id and o.indicator_id = e.indicator_id and o.source_id = e.source_id
              and o.unit = e.unit and o.scope = e.scope
              and o.period_end <= e.period_end::date and ${publicReleaseConditions(sql)}
            order by o.period_end desc, (o.observation_id = e.observation_id) desc,
              dataset.published_at desc, o.observation_id
            limit 12
          ) h
        ) trend on true
        order by e.geo_id, e.indicator_id
      `;

			const releaseDataset = toDataset(release);
			return {
				mode: "database",
				publicationStatus: "published",
				source: releaseDataset.source,
				dataset: releaseDataset,
				availablePeriods: periodRows.map((row) => row.period_label),
				selectedPeriod: requestedPeriod,
				geographies: geographies.map((row) => ({
					id: row.geo_id,
					code: row.admin_code,
					name: row.name,
					displayName: row.display_name,
					normalizedName: row.normalized_name,
					level: row.level,
					parentId: row.parent_geo_id,
					parentName: row.parent_name,
					geographyVersion: release.geography_code,
					latitude: toNumber(row.latitude),
					longitude: toNumber(row.longitude),
					geometryStatus: row.geometry_status,
				})),
				observations: observations.map((row) => {
					const rowDataset = toDataset(row);
					return {
						history: row.history,
						id: row.observation_id,
						geoId: row.geo_id,
						indicator: row.indicator,
						label: row.label,
						definition: row.definition,
						value: toNumber(row.value_numeric),
						unit: row.unit,
						period: row.period_label,
						periodStart: row.period_start,
						periodEnd: row.period_end,
						scope: row.scope,
						quality: row.quality_status,
						missingReason: row.missing_reason,
						scoreEligible: row.score_eligible,
						method: row.method_note ?? "No method note supplied.",
						limitations: row.limitations ?? "No limitations supplied.",
						datasetVersion: row.version_label,
						dataset: rowDataset,
						source: rowDataset.source,
					};
				}),
			};
		},
	);
}

export type DatabaseSearchOptions = {
	query?: string;
	level?: Geography["level"];
	indicator?: string;
	period?: string;
	quality?: "verified" | "supported";
	min?: number;
	max?: number;
	limit?: number;
};

export type SearchNumericFilterSummary = {
	indicator: string;
	label: string;
	definition: string;
	unit: string;
	period: string;
	quality: "verified" | "supported" | null;
	matchedCount: number;
	excludedMissingCount: number;
	excludedOutOfRangeCount: number;
};

export type SearchGeographiesResult = {
	mode: Catalog["mode"];
	publicationStatus: Catalog["publicationStatus"];
	dataset: DatasetMetadata | null;
	geographies: Geography[];
	numericFilter?: SearchNumericFilterSummary | null;
};

export async function searchDatabaseGeographies(
	options: DatabaseSearchOptions,
): Promise<SearchGeographiesResult> {
	const normalized = options.query ? normalizeSearch(options.query) : "";
	const pattern = normalized ? `%${escapeLike(normalized)}%` : null;
	const exactCode = normalized || null;
	const level = options.level ?? null;
	const limit = Math.min(Math.max(options.limit ?? 50, 1), 50);
	const hasNumericFilter = Boolean(
		options.indicator &&
			(options.min !== undefined ||
				options.max !== undefined ||
				options.period !== undefined ||
				options.quality !== undefined),
	);
	const indicatorCode = hasNumericFilter ? (options.indicator ?? null) : null;
	const periodFilter = options.period?.trim() || null;
	const qualityFilter = options.quality ?? null;
	const minVal = options.min ?? null;
	const maxVal = options.max ?? null;

	return databasePool().begin(
		"isolation level repeatable read read only",
		async (sql) => {
			const release = await loadPublishedGeography(sql);
			if (!release) {
				return {
					mode: "database",
					publicationStatus: "unpublished",
					dataset: null,
					geographies: [],
					numericFilter: null,
				};
			}

			const geographies = await sql<GeographyRow[]>`
      with latest_boundary as (
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
        order by chosen.published_at desc, chosen.dataset_version_id
        limit 1
      ),
      filtered_obs as (
        with eligible as (
          select observation.geo_id, indicator.indicator_id, geo.level, observation.dataset_version_id as dataset_id,
            observation.period_start, observation.period_end, observation.period_label, observation.scope, observation.unit,
            dataset.published_at, observation.value_numeric, observation.quality_status
          from market_entry.observations as observation
          join market_entry.geo_units as geo on geo.geo_id = observation.geo_id
          join market_entry.indicator_definitions as indicator on indicator.indicator_id = observation.indicator_id
          join market_entry.dataset_versions as dataset on dataset.dataset_version_id = observation.dataset_version_id
          join market_entry.source_registry as source on source.source_id = dataset.source_id
          where ${indicatorCode}::text is not null
            and indicator.code = ${indicatorCode}::text
            and indicator.status = 'active'
            and geo.geography_version_id = ${release.geography_version_id}
            and (${periodFilter}::text is null or observation.period_label = ${periodFilter}::text)
            and ${publicReleaseConditions(sql)}
        ), cohorts as (
          select indicator_id, level, dataset_id, period_start, period_end, scope, unit, published_at,
            count(distinct geo_id) as coverage
          from eligible
          group by indicator_id, level, dataset_id, period_start, period_end, scope, unit, published_at
        ), chosen as (
          select distinct on (indicator_id, level) * from cohorts
          order by indicator_id, level, period_end desc, coverage desc, published_at desc,
            dataset_id, period_start desc, scope, unit
        )
        select distinct e.geo_id
        from eligible e
        join chosen c on c.indicator_id = e.indicator_id and c.level = e.level and c.dataset_id = e.dataset_id
          and c.period_start = e.period_start and c.period_end = e.period_end and c.scope = e.scope and c.unit = e.unit
        where e.quality_status <> 'unavailable'
          and e.value_numeric is not null
          and (${qualityFilter}::text is null or e.quality_status = ${qualityFilter}::text)
          and (${minVal}::numeric is null or e.value_numeric >= ${minVal}::numeric)
          and (${maxVal}::numeric is null or e.value_numeric <= ${maxVal}::numeric)
      )
      select geo.geo_id, geo.admin_code, geo.name, geo.display_name, geo.normalized_name, geo.level,
        geo.parent_geo_id, parent.display_name as parent_name, geo.latitude, geo.longitude,
        case when boundary.geo_id is not null then 'boundary_verified' else 'not_available' end as geometry_status
      from market_entry.geo_units as geo
      left join market_entry.geo_units as parent on parent.geo_id = geo.parent_geo_id
      left join latest_boundary on true
      left join market_entry.geo_boundaries as boundary
        on boundary.geo_id = geo.geo_id and boundary.dataset_version_id = latest_boundary.dataset_version_id
      where geo.geography_version_id = ${release.geography_version_id}
        and geo.valid_from <= current_date
        and (geo.valid_to is null or geo.valid_to >= current_date)
        and (${level}::text is null or geo.level = ${level}::text)
        and (${pattern}::text is null or geo.normalized_name ilike ${pattern} escape '\\' or geo.admin_code ilike ${pattern} escape '\\')
        and (${indicatorCode}::text is null or exists (select 1 from filtered_obs fo where fo.geo_id = geo.geo_id))
      order by
        case when ${exactCode}::text is not null and lower(geo.admin_code) = ${exactCode} then 0 else 1 end,
        case geo.level when 'country' then 0 when 'province' then 1 else 2 end,
        geo.display_name,
        geo.admin_code
      limit ${limit}
    `;

			let numericFilter: SearchNumericFilterSummary | null = null;
			if (indicatorCode) {
				const [summaryRow] = await sql<
					{
						label: string | null;
						definition: string | null;
						unit: string | null;
						period: string | null;
						matched_count: number;
						excluded_missing_count: number;
						excluded_out_of_range_count: number;
					}[]
				>`
          with eligible as (
            select observation.geo_id, indicator.indicator_id, indicator.label, indicator.description as definition,
              geo.level, observation.dataset_version_id as dataset_id,
              observation.period_start, observation.period_end, observation.period_label, observation.scope, observation.unit,
              dataset.published_at, observation.value_numeric, observation.quality_status
            from market_entry.observations as observation
            join market_entry.geo_units as geo on geo.geo_id = observation.geo_id
            join market_entry.indicator_definitions as indicator on indicator.indicator_id = observation.indicator_id
            join market_entry.dataset_versions as dataset on dataset.dataset_version_id = observation.dataset_version_id
            join market_entry.source_registry as source on source.source_id = dataset.source_id
            where indicator.code = ${indicatorCode}::text
              and indicator.status = 'active'
              and geo.geography_version_id = ${release.geography_version_id}
              and (${periodFilter}::text is null or observation.period_label = ${periodFilter}::text)
              and ${publicReleaseConditions(sql)}
          ), cohorts as (
            select indicator_id, level, dataset_id, period_start, period_end, scope, unit, published_at,
              count(distinct geo_id) as coverage
            from eligible
            group by indicator_id, level, dataset_id, period_start, period_end, scope, unit, published_at
          ), chosen as (
            select distinct on (indicator_id, level) * from cohorts
            order by indicator_id, level, period_end desc, coverage desc, published_at desc,
              dataset_id, period_start desc, scope, unit
          ), chosen_obs as (
            select distinct on (e.geo_id) e.*
            from eligible e
            join chosen c on c.indicator_id = e.indicator_id and c.level = e.level and c.dataset_id = e.dataset_id
              and c.period_start = e.period_start and c.period_end = e.period_end and c.scope = e.scope and c.unit = e.unit
            order by e.geo_id, e.period_end desc
          ), scope_geos as (
            select geo.geo_id
            from market_entry.geo_units as geo
            where geo.geography_version_id = ${release.geography_version_id}
              and geo.valid_from <= current_date
              and (geo.valid_to is null or geo.valid_to >= current_date)
              and (
                (${level}::text is not null and geo.level = ${level}::text)
                or (${level}::text is null and geo.level in (select distinct level from chosen))
              )
              and (${pattern}::text is null or geo.normalized_name ilike ${pattern} escape '\\' or geo.admin_code ilike ${pattern} escape '\\')
          ), evaluated as (
            select g.geo_id, o.value_numeric, o.quality_status, o.label, o.definition, o.unit, o.period_label
            from scope_geos g
            left join chosen_obs o on o.geo_id = g.geo_id
          )
          select
            coalesce(max(label), (select label from market_entry.indicator_definitions where code = ${indicatorCode}::text limit 1)) as label,
            coalesce(max(definition), (select description from market_entry.indicator_definitions where code = ${indicatorCode}::text limit 1)) as definition,
            coalesce(max(unit), (select unit from market_entry.indicator_definitions where code = ${indicatorCode}::text limit 1)) as unit,
            coalesce(max(period_label), ${periodFilter}::text, '') as period,
            count(*) filter (
              where quality_status is not null
                and quality_status <> 'unavailable'
                and value_numeric is not null
                and (${qualityFilter}::text is null or quality_status = ${qualityFilter}::text)
                and (${minVal}::numeric is null or value_numeric >= ${minVal}::numeric)
                and (${maxVal}::numeric is null or value_numeric <= ${maxVal}::numeric)
            )::int as matched_count,
            count(*) filter (
              where quality_status is null
                or quality_status = 'unavailable'
                or value_numeric is null
            )::int as excluded_missing_count,
            count(*) filter (
              where quality_status is not null
                and quality_status <> 'unavailable'
                and value_numeric is not null
                and not (
                  (${qualityFilter}::text is null or quality_status = ${qualityFilter}::text)
                  and (${minVal}::numeric is null or value_numeric >= ${minVal}::numeric)
                  and (${maxVal}::numeric is null or value_numeric <= ${maxVal}::numeric)
                )
            )::int as excluded_out_of_range_count
          from evaluated
        `;

				if (summaryRow?.label) {
					numericFilter = {
						indicator: indicatorCode,
						label: summaryRow.label,
						definition: summaryRow.definition ?? "",
						unit: summaryRow.unit ?? "",
						period: summaryRow.period ?? "",
						quality: qualityFilter,
						matchedCount: summaryRow.matched_count,
						excludedMissingCount: summaryRow.excluded_missing_count,
						excludedOutOfRangeCount: summaryRow.excluded_out_of_range_count,
					};
				}
			}

			return {
				mode: "database",
				publicationStatus: "published",
				dataset: toDataset(release),
				numericFilter,
				geographies: geographies.map((row) => ({
					id: row.geo_id,
					code: row.admin_code,
					name: row.name,
					displayName: row.display_name,
					normalizedName: row.normalized_name,
					level: row.level,
					parentId: row.parent_geo_id,
					parentName: row.parent_name,
					geographyVersion: release.geography_code,
					latitude: toNumber(row.latitude),
					longitude: toNumber(row.longitude),
					geometryStatus: row.geometry_status,
				})),
			};
		},
	);
}

export async function loadProvinceMapTag(): Promise<{
	geographyVersionId: string;
	datasetId: string;
} | null> {
	return databasePool().begin(
		"isolation level repeatable read read only",
		async (sql) => {
			const release = await loadPublishedGeography(sql);
			if (!release) return null;
			const [row] = await sql<{ dataset_version_id: string }[]>`
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
    `;
			if (!row) return null;
			return {
				geographyVersionId: release.geography_version_id,
				datasetId: row.dataset_version_id,
			};
		},
	);
}

export async function checkDatabaseReadiness(): Promise<{
	mode: Catalog["mode"];
	publicationStatus: Catalog["publicationStatus"];
}> {
	return databasePool().begin(
		"isolation level repeatable read read only",
		async (sql) => {
			const release = await loadPublishedGeography(sql);
			return {
				mode: "database",
				publicationStatus: release ? "published" : "unpublished",
			};
		},
	);
}
