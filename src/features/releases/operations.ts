import type postgres from "postgres";
import { databasePool } from "../../db/pool";
import { lockReleases } from "../../db/release-workflow";
import { safeSourceUrl } from "../../lib/source-url";

export type ReleaseRole = "reviewer" | "steward";
export type ReleaseAction = "approve" | "publish" | "retire";

type DatasetReview = {
	dataset_version_id: string;
	source_id: string;
	batch_id: string | null;
	code: string;
	version: string;
	status: string;
	owner: string | null;
	checksum: string | null;
	as_of: string | null;
	reviewed: string | null;
	due: string | null;
	stale: boolean;
	publisher: string;
	citation: string;
	license: string;
	access: string;
	source_status: string;
	url: string | null;
	units: number;
	provinces: number;
	communes: number;
	expected_provinces: number;
	covered_provinces: number;
	boundaries: number;
	observations: number;
	missing: number;
	points: number;
	invalid_geometry: number;
	invalid_observations: number;
	geographies: string[];
	periods: string[];
	methods: string[];
	limitations: string[];
};

type Batch = {
	id: string;
	kind: "foundation" | "wave2";
	geography: string;
	fingerprint: string;
	created: string;
	approved: boolean;
	published: boolean;
	retired: boolean;
	audit: { action: string; actor: string; at: string; note: string | null }[];
};

async function readDatasets(
	sql: postgres.TransactionSql,
	batchId: string | null = null,
) {
	// This review query combines small catalog tables with several PostGIS aggregates.
	await sql`set local jit = off`;
	const rows = await sql<DatasetReview[]>`
    with versions as (
      select dataset.*, member.batch_id
      from market_entry.dataset_versions dataset
      left join market_entry.release_members member using (dataset_version_id)
      where dataset.dataset_code <> 'DEMO_CONTEXT' and (${batchId}::uuid is null or member.batch_id = ${batchId}::uuid)
    ), coverage as (
      select v.dataset_version_id, geo.geo_id, geo.level, geography.code, 'unit' as kind
      from versions v
      join market_entry.geography_versions geography using (dataset_version_id)
      join market_entry.geo_units geo using (geography_version_id)
      union all
      select v.dataset_version_id, geo.geo_id, geo.level, geography.code, reference.kind
      from versions v
      join lateral (
        select geo_id, 'boundary' as kind from market_entry.geo_boundaries where dataset_version_id = v.dataset_version_id
        union all select geo_id, 'observation' from market_entry.observations where dataset_version_id = v.dataset_version_id
        union all select geo_id, 'point' from market_entry.infrastructure_pois where dataset_version_id = v.dataset_version_id
      ) reference on true
      join market_entry.geo_units geo using (geo_id)
      join market_entry.geography_versions geography using (geography_version_id)
    )
    select v.dataset_version_id, v.source_id, v.batch_id, v.dataset_code as code, v.version_label as version,
      v.publication_status as status, v.owner_name as owner, v.checksum,
      v.data_as_of::text as as_of, v.reviewed_at::date::text as reviewed, v.review_due_at::date::text as due,
      coalesce(v.review_due_at <= now(), true) as stale,
      source.publisher, source.citation_text as citation, source.license, source.access_right as access,
      source.status as source_status, source.url,
      coalesce(c.units, 0) as units, coalesce(c.provinces, 0) as provinces, coalesce(c.communes, 0) as communes,
      expected.provinces as expected_provinces, coalesce(c.covered_provinces, 0) as covered_provinces,
      coalesce(c.boundaries, 0) as boundaries, observations.total as observations, observations.missing,
      points.total as points, geometry.invalid + points.invalid as invalid_geometry, observations.invalid as invalid_observations,
      coalesce(c.geographies, '{}') as geographies, coalesce(observations.periods, '{}') as periods,
      coalesce(observations.methods, '{}') as methods, coalesce(observations.limitations, '{}') as limitations
    from versions v
    join market_entry.source_registry source using (source_id)
    left join lateral (
      select count(*) filter (where kind = 'unit')::int as units,
        count(*) filter (where kind = 'unit' and level = 'province')::int as provinces,
        count(*) filter (where kind = 'unit' and level = 'commune')::int as communes,
        count(*) filter (where kind = 'boundary')::int as boundaries,
        count(distinct geo_id) filter (where level = 'province')::int as covered_provinces,
        array_agg(distinct code order by code) as geographies
      from coverage where dataset_version_id = v.dataset_version_id
    ) c on true
    left join lateral (
      select count(*)::int as provinces from market_entry.geo_units geo
      join market_entry.geography_versions geography using (geography_version_id)
      where geo.level = 'province' and geography.code = any(c.geographies)
    ) expected on true
    left join lateral (
      select count(*)::int as total, count(*) filter (where value_numeric is null)::int as missing,
        count(*) filter (where period_end > v.data_as_of or period_start > period_end or
          (o.value_numeric is null) <> (o.quality_status = 'unavailable' or o.value_type in ('text', 'category')) or
          nullif(btrim(method_note), '') is null or nullif(btrim(o.limitations), '') is null)::int as invalid,
        array_agg(distinct period_label || ' (' || period_start || ' to ' || period_end || ')') as periods,
        array_agg(distinct method_note) filter (where method_note is not null) as methods,
        array_agg(distinct o.limitations) filter (where o.limitations is not null) as limitations
      from market_entry.observations o join market_entry.indicator_definitions indicator using (indicator_id)
      where o.dataset_version_id = v.dataset_version_id
    ) observations on true
    left join lateral (
      select count(*) filter (where not ST_IsValid(geom) or ST_IsEmpty(geom) or ST_SRID(geom) <> 4326
        or GeometryType(geom) not in ('POLYGON', 'MULTIPOLYGON'))::int as invalid
      from market_entry.geo_boundaries where dataset_version_id = v.dataset_version_id
    ) geometry on true
    left join lateral (
      select count(*)::int as total, count(*) filter (where not ST_IsValid(geom) or ST_IsEmpty(geom)
        or ST_SRID(geom) <> 4326 or GeometryType(geom) <> 'POINT'
        or reference_url !~ '^https://[^/@]+([/?#]|$)')::int as invalid
      from market_entry.infrastructure_pois where dataset_version_id = v.dataset_version_id
    ) points on true
    order by v.dataset_code, v.data_as_of desc nulls last, v.version_label
  `;
	return rows.map((row) => ({ ...row, url: safeSourceUrl(row.url) }));
}

async function readBatches(
	sql: postgres.TransactionSql,
	id: string | null = null,
) {
	return sql<Batch[]>`
    select batch.batch_id as id, batch.kind, batch.geography_code as geography, batch.fingerprint,
      batch.created_at::text as created, coalesce(bool_or(event.action = 'approve'), false) as approved,
      coalesce(bool_or(event.action in ('publish', 'local_publish')), false) as published,
      coalesce(bool_or(event.action = 'retire'), false) as retired,
      coalesce(json_agg(json_build_object('action', event.action, 'actor', event.actor,
        'at', event.happened_at, 'note', event.note) order by event.happened_at, event.event_id)
        filter (where event.event_id is not null), '[]') as audit
    from market_entry.release_batches batch
    left join market_entry.release_audit event using (batch_id)
    where ${id}::uuid is null or batch.batch_id = ${id}::uuid
    group by batch.batch_id order by batch.created_at desc, batch.batch_id
  `;
}

function reviewBlockers(batch: Batch, datasets: DatasetReview[]) {
	const blockers = datasets.flatMap((dataset) => {
		const { code } = dataset;
		const errors = [];
		if (
			!dataset.owner ||
			!dataset.citation ||
			!dataset.publisher ||
			!dataset.url ||
			!dataset.license ||
			!dataset.as_of ||
			!dataset.reviewed ||
			!dataset.due ||
			!/^[a-f0-9]{64}$/.test(dataset.checksum ?? "")
		) {
			errors.push(`${code} has incomplete provenance.`);
		}
		if (
			dataset.source_status !== "active" ||
			dataset.access !== "public" ||
			dataset.stale
		) {
			errors.push(
				`${code} requires an active public source and a current review.`,
			);
		}
		if (
			dataset.geographies.length !== 1 ||
			dataset.geographies[0] !== batch.geography ||
			!dataset.covered_provinces
		) {
			errors.push(`${code} has incompatible geography coverage.`);
		}
		if (
			dataset.invalid_geometry ||
			dataset.invalid_observations ||
			(dataset.boundaries && dataset.boundaries !== dataset.expected_provinces)
		) {
			errors.push(`${code} failed geometry, coverage or observation checks.`);
		}
		return errors;
	});
	if (
		!datasets.length ||
		(batch.kind === "foundation" &&
			!datasets.some((dataset) => dataset.boundaries > 0))
	) {
		blockers.push("The batch is missing required data.");
	}
	return blockers;
}

export async function releaseOverview() {
	return databasePool().begin(
		"isolation level repeatable read read only",
		async (tx) => {
			const datasets = await readDatasets(tx);
			const batches = await readBatches(tx);
			const visible = datasets.filter(
				(dataset) => dataset.status === "published",
			);
			return {
				datasets,
				batches: batches.map((batch) => {
					const members = datasets.filter(
						(dataset) => dataset.batch_id === batch.id,
					);
					return {
						...batch,
						staged:
							members.length > 0 &&
							members.every((dataset) => dataset.status === "validated"),
						blockers: reviewBlockers(batch, members),
					};
				}),
				freshness: {
					publishedDatasets: visible.length,
					reviewDue: visible.filter((dataset) => dataset.stale).length,
					staleSources: new Set(
						visible
							.filter((dataset) => dataset.stale)
							.map((dataset) => dataset.source_id),
					).size,
					revokedSources: new Set(
						visible
							.filter((dataset) => dataset.source_status === "revoked")
							.map((dataset) => dataset.source_id),
					).size,
					blockedDatasets: visible.filter(
						(dataset) =>
							dataset.source_status !== "active" || dataset.access !== "public",
					).length,
					invalidGeometry: visible.reduce(
						(total, dataset) => total + dataset.invalid_geometry,
						0,
					),
				},
			};
		},
	);
}

export type ReleaseOverview = Awaited<ReturnType<typeof releaseOverview>>;

export async function applyReleaseAction(
	id: string,
	action: ReleaseAction,
	role: ReleaseRole,
	note: string,
	actor = role as string,
) {
	return databasePool().begin(async (tx) => {
		await lockReleases(tx);
		const [batch] = await readBatches(tx, id);
		if (!batch) return { status: 404, message: "Release batch not found." };
		if (batch.audit.some((event) => event.action === action))
			return { status: 200 };
		await tx`
      select dataset.dataset_version_id from market_entry.release_members member
      join market_entry.dataset_versions dataset using (dataset_version_id)
      join market_entry.source_registry source using (source_id)
      where member.batch_id = ${id}
      order by dataset.dataset_version_id for update of dataset, source
    `;

		const datasets = await readDatasets(tx, id);
		const datasetIds = datasets.map((dataset) => dataset.dataset_version_id);
		if (action === "retire") {
			if (
				batch.kind !== "wave2" ||
				!batch.published ||
				!datasets.length ||
				datasets.some((dataset) => dataset.status !== "published")
			) {
				return {
					status: 409,
					message: "Only a published Wave 2 batch can be retired here.",
				};
			}
			await tx`update market_entry.dataset_versions set publication_status = 'retired'
        where dataset_version_id = any(${datasetIds}::uuid[])`;
		} else {
			if (
				batch.retired ||
				!datasets.length ||
				datasets.some((dataset) => dataset.status !== "validated")
			) {
				return { status: 409, message: "Stage a new validated batch first." };
			}
			const blockers = reviewBlockers(batch, datasets);
			if (blockers.length) return { status: 409, message: blockers.join(" ") };
			if (action === "publish") {
				if (!batch.approved)
					return {
						status: 409,
						message: "Reviewer approval is required before publication.",
					};
				const [geography] = await tx<
					{ id: string; status: string; ready: boolean }[]
				>`
          select geography_version_id as id, geography.status,
            geography.effective_from <= current_date and (geography.effective_to is null or geography.effective_to >= current_date)
              and source.status = 'active' and source.access_right = 'public'
              and (${batch.kind} = 'foundation' or dataset.publication_status = 'published') as ready
          from market_entry.geography_versions geography
          join market_entry.dataset_versions dataset using (dataset_version_id)
          join market_entry.source_registry source using (source_id)
          where geography.code = ${batch.geography}
        `;
				if (
					!geography?.ready ||
					geography.status !==
						(batch.kind === "foundation" ? "draft" : "active")
				) {
					return {
						status: 409,
						message: "The target geography is incompatible with this release.",
					};
				}
				await tx`update market_entry.dataset_versions set publication_status = 'published', published_at = now()
          where dataset_version_id = any(${datasetIds}::uuid[])`;
				if (batch.kind === "foundation") {
					await tx`update market_entry.geography_versions set status = 'active' where geography_version_id = ${geography.id}`;
					await tx`
            update market_entry.geo_units geo set geometry_status = 'boundary_verified',
              longitude = ST_X(ST_PointOnSurface(boundary.geom)), latitude = ST_Y(ST_PointOnSurface(boundary.geom))
            from market_entry.geo_boundaries boundary
            where geo.geo_id = boundary.geo_id and geo.geography_version_id = ${geography.id}
              and boundary.dataset_version_id = any(${datasetIds}::uuid[])
          `;
					await tx`update market_entry.geography_versions set status = 'retired' where code = 'demo-context-v1' and dataset_version_id is null`;
					await tx`update market_entry.dataset_versions set publication_status = 'retired'
            where dataset_code = 'DEMO_CONTEXT' and version_label = 'demo-v1' and owner_name is null`;
				}
			}
		}
		await tx`insert into market_entry.release_audit (batch_id, action, actor, note, happened_at)
      values (${id}, ${action}, ${actor}, ${note}, clock_timestamp())`;
		return { status: 200 };
	});
}
