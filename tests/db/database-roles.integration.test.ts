import { expect, test } from "bun:test";
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { databasePool } from "../../src/db/pool";

const databaseTest =
	process.env.RUN_INQUIRY_DB_TESTS === "1" ? test : test.skip;

function inquiryTestDatabase() {
	const target = new URL(process.env.DATABASE_URL ?? "");
	if (
		target.hostname !== "127.0.0.1" ||
		!/^\/ecom_inquiry_it_[a-z0-9_]+$/.test(target.pathname)
	) {
		throw new Error("Use a disposable local inquiry database.");
	}
	return databasePool();
}

async function expectSqlErrorCode(
	promise: Promise<unknown>,
	expectedCode: string,
) {
	try {
		await promise;
	} catch (cause) {
		expect((cause as { code?: string }).code).toBe(expectedCode);
		return;
	}
	throw new Error(
		`Expected PostgreSQL error ${expectedCode}, but query succeeded.`,
	);
}

databaseTest(
	"grants.sql enforces least-privilege roles idempotently and supports retention execution",
	async () => {
		const sql = inquiryTestDatabase();
		const grantsSql = readFileSync(
			resolve(process.cwd(), "database/roles/grants.sql"),
			"utf8",
		);

		// Execute twice to verify idempotency.
		await sql.unsafe(grantsSql);
		await sql.unsafe(grantsSql);

		const reserved = await sql.reserve();
		try {
			await reserved.unsafe("set role ecom_runtime");
			await expectSqlErrorCode(
				reserved`select id from market_entry.inquiry_snapshot_privacy_key`,
				"42501",
			);

			const [protectedFilters] = await reserved<{ result: unknown }[]>`
        select market_entry.protect_inquiry_snapshot_filters('{"country":"Vietnam"}'::jsonb) as result
      `;
			expect(protectedFilters.result).toMatchObject({
				protectedFilters: {
					country: expect.stringMatching(/^[0-9a-f]{64}$/),
				},
			});

			const [emptyProtected] = await reserved<{ result: unknown }[]>`
        select market_entry.protect_inquiry_snapshot_filters('{}'::jsonb) as result
      `;
			expect(emptyProtected.result).toEqual({});

			await expectSqlErrorCode(
				reserved`delete from market_entry.release_audit`,
				"42501",
			);
			await expectSqlErrorCode(
				reserved`delete from market_entry.inquiry_access_audit`,
				"42501",
			);
			await expectSqlErrorCode(
				reserved`update market_entry.inquiry_audit set actor = 'tampered'`,
				"42501",
			);
			await expectSqlErrorCode(
				reserved`update market_entry.source_registry set status = 'revoked'`,
				"42501",
			);
		} finally {
			await reserved.unsafe("reset role").catch(() => {});
			reserved.release();
		}

		// Verify ecom_runtime positive privileges for DSAR erasure audit/note redaction and release row locking.
		try {
			await sql.begin(async (tx) => {
				await tx.unsafe("set local role ecom_runtime");
				await tx`
          insert into market_entry.inquiry_access_audit (actor, action, ticket_ref)
          values ('role-check', 'exported_live_csv', null)
        `;
				await tx`
          update market_entry.inquiry_audit set note = null where false
        `;
				await tx`
          select dataset.dataset_version_id
          from market_entry.release_members member
          join market_entry.dataset_versions dataset using (dataset_version_id)
          join market_entry.source_registry source using (source_id)
          limit 1
          for update of dataset
        `;
				throw new Error("rollback_runtime_probe");
			});
		} catch (cause) {
			if ((cause as Error).message !== "rollback_runtime_probe") throw cause;
		}

		// Seed expired inquiry + audit note + notification and expired snapshot to exercise all ecom_retention grants.
		const inquiryRef = `INQ-2020-${randomBytes(4).toString("hex").toUpperCase()}`;
		const [seededInquiry] = await sql<{ inquiry_id: string }[]>`
      insert into market_entry.investor_inquiries
        (reference_code, email, message, provenance, status, retention_at, created_at, updated_at)
      values (
        ${inquiryRef},
        'retention-role@example.test',
        'Role privilege verification inquiry.',
        '{}'::jsonb,
        'new',
        '2020-01-01T00:00:00Z',
        '2019-01-01T00:00:00Z',
        '2019-01-01T00:00:00Z'
      )
      returning inquiry_id
    `;
		await sql`
      insert into market_entry.inquiry_audit (inquiry_id, actor, action, note, happened_at)
      values (${seededInquiry.inquiry_id}, 'steward', 'note_added', 'Contains PII for retention test', '2019-01-01T00:00:00Z')
    `;
		await sql`
      insert into market_entry.inquiry_notifications (inquiry_id, kind, locale, status)
      values (${seededInquiry.inquiry_id}, 'acknowledgement', 'en', 'pending')
    `;

		const snapshotId = randomUUID();
		await sql`
      insert into market_entry.inquiry_report_snapshots
        (snapshot_id, period_start, period_end, filters, metrics, retention_at, created_by)
      values (
        ${snapshotId},
        '2020-01-01T00:00:00Z',
        '2020-01-08T00:00:00Z',
        '{}'::jsonb,
        '{"total":0,"byStatus":{"new":0,"contacted":0,"qualified":0,"closed":0},"byCloseReason":{},"contactedRate":0,"qualifiedRate":0,"averageHoursToContacted":null,"averageHoursToQualified":null,"weeklyTrend":{},"byGeography":{},"byCountry":{},"bySector":{}}'::jsonb,
        '2020-01-01T00:00:00Z',
        'role-test'
      )
    `;
		await sql`
      insert into market_entry.inquiry_report_snapshot_audit (snapshot_id, actor, action)
      values (${snapshotId}, 'role-test', 'created')
    `;

		const tempUser = `ecom_retention_test_${randomBytes(6).toString("hex")}`;
		const tempPassword = randomBytes(24).toString("base64url");
		const retentionUrl = new URL(process.env.DATABASE_URL ?? "");
		retentionUrl.username = tempUser;
		retentionUrl.password = tempPassword;

		try {
			await sql.unsafe(
				`create user "${tempUser}" with password '${tempPassword}' in role ecom_retention`,
			);

			const retentionReserved = await sql.reserve();
			try {
				await retentionReserved.unsafe("set role ecom_retention");
				await expectSqlErrorCode(
					retentionReserved`select id from market_entry.inquiry_snapshot_privacy_key`,
					"42501",
				);
			} finally {
				await retentionReserved.unsafe("reset role").catch(() => {});
				retentionReserved.release();
			}

			const applyProc = Bun.spawn(
				[
					process.execPath,
					"--no-env-file",
					"run",
					"src/db/cleanup-inquiries.ts",
					"--apply",
				],
				{
					env: { ...process.env, DATABASE_URL: retentionUrl.toString() },
					stdout: "pipe",
					stderr: "pipe",
					signal: AbortSignal.timeout(20_000),
				},
			);
			const [exitCode, stdout] = await Promise.all([
				applyProc.exited,
				new Response(applyProc.stdout).text(),
			]);
			expect(exitCode).toBe(0);
			expect(stdout).toContain('"event":"retention_completed"');

			const [afterInquiry] = await sql<
				{ email: string | null; anonymized_at: Date | null }[]
			>`
        select email, anonymized_at from market_entry.investor_inquiries
        where inquiry_id = ${seededInquiry.inquiry_id}
      `;
			expect(afterInquiry.email).toBeNull();
			expect(afterInquiry.anonymized_at).not.toBeNull();

			const [afterSnapshot] = await sql<{ snapshot_id: string }[]>`
        select snapshot_id from market_entry.inquiry_report_snapshots
        where snapshot_id = ${snapshotId}
      `;
			expect(afterSnapshot).toBeUndefined();
		} finally {
			await sql.unsafe(`drop user if exists "${tempUser}"`);
		}
	},
	30_000,
);
