import { randomBytes, randomUUID } from "node:crypto";
import { expect, test } from "bun:test";
import { GET, POST } from "../../src/app/api/internal/releases/route";
import { databasePool } from "../../src/db/pool";
import {
	loadDatabaseCatalog,
	loadProvinceMap,
} from "../../src/features/geography/database-repository";
import { loadMapLayers } from "../../src/features/map/layer-repository";
import {
	releaseOverview,
	type ReleaseOverview,
} from "../../src/features/releases/operations";

const workflowTest =
	process.env.RUN_RELEASE_WORKFLOW_TESTS === "1" ? test : test.skip;
const url = "http://localhost/api/internal/releases";

workflowTest(
	"separates roles, publishes staged data atomically and retires Wave 2 with an audit trail",
	async () => {
		const database = new URL(process.env.DATABASE_URL ?? "");
		expect(database.hostname).toBe("127.0.0.1");
		expect(database.pathname).toMatch(/^\/ecom_sprint4_workflow_[a-z0-9_]+$/);
		const reviewer = randomBytes(32).toString("base64url");
		const steward = randomBytes(32).toString("base64url");
		process.env.RELEASE_REVIEWER_TOKEN = reviewer;
		process.env.RELEASE_STEWARD_TOKEN = steward;
		const previousOperators = process.env.ECOM_OPERATORS;
		process.env.ECOM_OPERATORS = JSON.stringify([
			{ id: "workflow-reviewer", role: "reviewer", token: reviewer },
			{ id: "workflow-steward", role: "steward", token: steward },
		]);
		async function overview(token: string) {
			const response = await GET(
				new Request(url, { headers: { Authorization: `Bearer ${token}` } }),
			);
			expect(response.status).toBe(200);
			expect(response.headers.get("Cache-Control")).toBe("private, no-store");
			expect(response.headers.get("Vary")).toBe("Authorization, Cookie");
			const payload: { role: string; data: ReleaseOverview } =
				await response.json();
			return payload.data;
		}
		function change(token: string, batchId: string, action: string) {
			return POST(
				new Request(url, {
					method: "POST",
					headers: {
						Authorization: `Bearer ${token}`,
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						batchId,
						action,
						note: "Verified Sprint 4 workflow on disposable database.",
					}),
				}),
			);
		}
		try {
			expect((await GET(new Request(url))).status).toBe(401);
			const [foundation] = (await overview(reviewer)).batches;
			expect(foundation).toMatchObject({
				kind: "foundation",
				staged: true,
				approved: false,
				blockers: [],
			});
			expect((await loadDatabaseCatalog()).publicationStatus).toBe(
				"unpublished",
			);
			expect((await loadProvinceMap()).features).toHaveLength(0);
			expect((await change(steward, foundation.id, "publish")).status).toBe(
				409,
			);
			expect((await change(steward, foundation.id, "approve")).status).toBe(
				403,
			);
			expect((await change(reviewer, foundation.id, "publish")).status).toBe(
				403,
			);
			expect((await change(reviewer, foundation.id, "approve")).status).toBe(
				200,
			);
			expect((await loadDatabaseCatalog()).publicationStatus).toBe(
				"unpublished",
			);

			const publications = await Promise.all([
				change(steward, foundation.id, "publish"),
				change(steward, foundation.id, "publish"),
			]);
			expect(publications.map((response) => response.status)).toEqual([
				200, 200,
			]);
			expect((await loadDatabaseCatalog()).geographies).toHaveLength(3356);
			expect((await loadProvinceMap()).features).toHaveLength(34);
			expect((await change(steward, foundation.id, "retire")).status).toBe(409);
			expect(
				(await overview(reviewer)).batches[0].audit.map(
					(event) => event.action,
				),
			).toEqual(["import", "approve", "publish"]);
			expect(
				(await overview(reviewer)).batches[0].audit
					.filter(
						(event) => event.action === "approve" || event.action === "publish",
					)
					.map((event) => event.actor),
			).toEqual(["workflow-reviewer", "workflow-steward"]);

			const stage = Bun.spawnSync([
				process.execPath,
				"run",
				"db:import:wave2",
				"--stage",
			]);
			expect(stage.exitCode).toBe(0);
			const wave = (await overview(reviewer)).batches.find(
				(batch) => batch.kind === "wave2",
			);
			if (!wave) throw new Error("Expected staged wave2 batch");
			expect(wave).toMatchObject({ staged: true, blockers: [] });
			expect((await loadMapLayers()).infrastructure).toBeNull();
			expect((await change(reviewer, wave.id, "approve")).status).toBe(200);
			expect((await change(steward, wave.id, "publish")).status).toBe(200);
			expect(
				(await loadMapLayers()).infrastructure?.points.features,
			).toHaveLength(22);
			expect((await change(steward, wave.id, "retire")).status).toBe(200);
			expect((await loadMapLayers()).infrastructure).toBeNull();
			expect(
				(await overview(reviewer)).batches
					.find((batch) => batch.id === wave.id)
					?.audit.map((event) => event.action),
			).toEqual(["import", "approve", "publish", "retire"]);
		} finally {
			delete process.env.RELEASE_REVIEWER_TOKEN;
			delete process.env.RELEASE_STEWARD_TOKEN;
			if (previousOperators === undefined) delete process.env.ECOM_OPERATORS;
			else process.env.ECOM_OPERATORS = previousOperators;
		}
	},
	60_000,
);

workflowTest(
	"allows staged datasets with score-eligible polarity indicators and text observations",
	async () => {
		const database = new URL(process.env.DATABASE_URL ?? "");
		expect(database.hostname).toBe("127.0.0.1");
		expect(database.pathname).toMatch(/^\/ecom_sprint4_workflow_[a-z0-9_]+$/);

		const sql = databasePool();
		const [province] = await sql<{ geo_id: string; geography_code: string }[]>`
      select geo.geo_id, gv.code as geography_code
      from market_entry.geo_units geo
      join market_entry.geography_versions gv using (geography_version_id)
      where geo.level = 'province' and gv.code <> 'demo-context-v1'
      order by gv.effective_from desc, geo.admin_code
      limit 1
    `;
		if (!province) {
			throw new Error(
				"Expected a province geography for release gate verification.",
			);
		}

		const sourceId = randomUUID();
		const datasetVersionId = randomUUID();
		const scoreIndicatorId = randomUUID();
		const textIndicatorId = randomUUID();
		const batchId = randomUUID();
		const suffix = randomBytes(4).toString("hex");
		const datasetCode = `TEST_SCORE_ELIGIBLE_${suffix}`;
		const scoreIndicatorCode = `TEST_SCORE_${suffix}`;
		const textIndicatorCode = `TEST_TEXT_${suffix}`;
		const checksum = randomBytes(32).toString("hex");
		const fingerprint = randomBytes(32).toString("hex");

		try {
			await sql`
        insert into market_entry.source_registry
          (source_id, publisher, title, url, source_type, license, access_right, citation_text, status, verified_at)
        values (
          ${sourceId}, 'Release Gate Test Authority', 'Score-Eligible Indicator Test',
          'https://example.test/rf03', 'official', 'CC-BY-4.0', 'public',
          'Release Gate Test Authority (2025).', 'active', now()
        )
      `;
			await sql`
        insert into market_entry.dataset_versions
          (dataset_version_id, source_id, dataset_code, version_label, checksum, owner_name,
           data_as_of, reviewed_at, review_due_at, publication_status)
        values (
          ${datasetVersionId}, ${sourceId}, ${datasetCode}, 'test-2025-v1', ${checksum},
          'Release Gate Steward', '2025-12-31', now(), now() + interval '180 days', 'validated'
        )
      `;
			await sql`
        insert into market_entry.indicator_definitions
          (indicator_id, code, label, description, domain, value_type, unit, period_type,
           polarity, is_proxy, score_eligible, status)
        values
          (
            ${scoreIndicatorId}, ${scoreIndicatorCode}, 'Test Score Indicator',
            'Verifies score-eligible indicators with directional polarity pass the release gate.',
            'market_context', 'decimal', 'index', 'year', 'higher', false, true, 'active'
          ),
          (
            ${textIndicatorId}, ${textIndicatorCode}, 'Test Text Indicator',
            'Verifies text observations with null numeric values pass the release gate.',
            'market_context', 'text', 'label', 'year', 'context_only', false, false, 'active'
          )
      `;
			await sql`
        insert into market_entry.observations
          (geo_id, indicator_id, period_start, period_end, period_label,
           value_numeric, value_text, value_type, unit, scope, source_id,
           dataset_version_id, quality_status, method_note, limitations)
        values
          (
            ${province.geo_id}, ${scoreIndicatorId}, '2025-01-01', '2025-12-31', '2025',
            84.5, null, 'decimal', 'index', 'provincial', ${sourceId},
            ${datasetVersionId}, 'supported', 'Official index methodology.', 'Test scope limitations.'
          ),
          (
            ${province.geo_id}, ${textIndicatorId}, '2025-01-01', '2025-12-31', '2025',
            null, 'Tier 1', 'text', 'label', 'provincial', ${sourceId},
            ${datasetVersionId}, 'supported', 'Official classification methodology.', 'Test scope limitations.'
          )
      `;
			await sql`
        insert into market_entry.release_batches (batch_id, kind, geography_code, fingerprint)
        values (${batchId}, 'wave2', ${province.geography_code}, ${fingerprint})
      `;
			await sql`
        insert into market_entry.release_members (batch_id, dataset_version_id)
        values (${batchId}, ${datasetVersionId})
      `;

			const overview = await releaseOverview();
			const dataset = overview.datasets.find(
				(item) => item.dataset_version_id === datasetVersionId,
			);
			expect(dataset).toBeDefined();
			expect(dataset?.observations).toBe(2);
			expect(dataset?.invalid_observations).toBe(0);

			const batch = overview.batches.find((item) => item.id === batchId);
			expect(batch).toBeDefined();
			expect(batch?.staged).toBe(true);
			expect(
				batch?.blockers.some((blocker) =>
					blocker.includes("failed geometry, coverage or observation checks"),
				),
			).toBe(false);
			expect(batch?.blockers).toEqual([]);
		} finally {
			await sql`delete from market_entry.release_audit where batch_id = ${batchId}`;
			await sql`delete from market_entry.release_members where batch_id = ${batchId}`;
			await sql`delete from market_entry.release_batches where batch_id = ${batchId}`;
			await sql`delete from market_entry.observations where dataset_version_id = ${datasetVersionId}`;
			await sql`delete from market_entry.indicator_definitions where indicator_id in (${scoreIndicatorId}, ${textIndicatorId})`;
			await sql`delete from market_entry.dataset_versions where dataset_version_id = ${datasetVersionId}`;
			await sql`delete from market_entry.source_registry where source_id = ${sourceId}`;
		}
	},
	30_000,
);
