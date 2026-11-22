import { expect, test } from "bun:test";
import {
	GET as read,
	POST as create,
} from "../../src/app/api/internal/inquiries/snapshots/route";
import { GET as getDetail } from "../../src/app/api/internal/inquiries/snapshots/[snapshotId]/route";
import {
	GET as readComparison,
	POST as compare,
} from "../../src/app/api/internal/inquiries/snapshots/compare/route";
import {
	GET as readExport,
	POST as exportCsv,
} from "../../src/app/api/internal/inquiries/snapshots/export/route";
import {
	FORMULA_VERSION,
	cleanupExpiredInquiryReportSnapshots,
	createInquiryReportSnapshot,
	getInquiryReportSnapshot,
	listInquiryReportSnapshots,
	snapshotMetricsCsv,
} from "../../src/features/inquiries/snapshots";
import { databasePool } from "../../src/db/pool";

const databaseTest =
	process.env.RUN_INQUIRY_DB_TESTS === "1" ? test : test.skip;
const endpoint = "http://localhost/api/internal/inquiries/snapshots";

function inquiryTestDatabase() {
	const database = new URL(process.env.DATABASE_URL ?? "");
	if (
		database.hostname !== "127.0.0.1" ||
		!/^\/ecom_inquiry_it_[a-z0-9_]+$/.test(database.pathname)
	) {
		throw new Error("Use a disposable local inquiry database.");
	}
	return databasePool();
}

databaseTest(
	"stores a non-sensitive weekly inquiry report snapshot",
	async () => {
		inquiryTestDatabase();
		const now = new Date("2026-11-21T00:00:00Z");
		const snapshot = await createInquiryReportSnapshot({
			periodStart: new Date("2026-11-14T00:00:00Z"),
			periodEnd: now,
			filters: { country: "synthetic@example.test", page: 1, pageSize: 25 },
			metrics: {
				total: 2,
				byStatus: { new: 2, contacted: 0, qualified: 0, closed: 0 },
				byCloseReason: {},
				contactedRate: 0,
				qualifiedRate: 0,
				averageHoursToContacted: null,
				averageHoursToQualified: null,
				weeklyTrend: { "2026-W46": 2 },
				byGeography: {},
				byCountry: { vietnam: 2 },
				bySector: {},
			},
			createdBy: "steward",
		});
		expect(snapshot.filters).toEqual({
			protectedFilters: { country: expect.stringMatching(/^[0-9a-f]{64}$/) },
			page: 1,
			pageSize: 25,
		});
		expect(snapshot.metrics.total).toBe(2);
		expect(snapshot.metrics.byCountry).toEqual({});
		expect(snapshot.metrics.bySector).toEqual({});
		expect(JSON.stringify(snapshot)).not.toContain("synthetic@example.test");
		expect(
			(await listInquiryReportSnapshots()).some(
				(item) => item.snapshot_id === snapshot.snapshot_id,
			),
		).toBe(true);
		expect(
			(
				await cleanupExpiredInquiryReportSnapshots(
					false,
					new Date("2026-11-21T00:00:00Z"),
				)
			).applied,
		).toBe(false);
	},
	30_000,
);

databaseTest(
	"snapshot reads remain read-only and audited actions require POST",
	async () => {
		inquiryTestDatabase();
		const steward = process.env.RELEASE_STEWARD_TOKEN;
		if (!steward) throw new Error("Use a disposable steward token.");
		const headers = {
			authorization: `Bearer ${steward}`,
			"content-type": "application/json",
		};
		const get = (path = "") => new Request(endpoint + path, { headers });
		const post = (path: string, payload: Record<string, unknown>) =>
			new Request(endpoint + path, {
				method: "POST",
				headers,
				body: JSON.stringify(payload),
			});
		async function snapshot(
			country: string,
			periodStart: string,
			periodEnd: string,
		) {
			const response = await create(
				post("", { periodStart, periodEnd, filters: { country } }),
			);
			expect(response.status).toBe(201);
			const { data } = await response.json();
			expect(data.filters).toEqual({ country: "Giá trị được ẩn" });
			return data.snapshot_id as string;
		}
		const left = await snapshot(
			"Personal label@example.test",
			"2020-01-01",
			"2020-01-08",
		);
		const right = await snapshot(
			"personal label@example.test",
			"2020-01-08",
			"2020-01-15",
		);
		const detail = () =>
			getDetail(get(`/${left}`), {
				params: Promise.resolve({ snapshotId: left }),
			});
		const audit = async () =>
			(
				(await detail().then((response) => response.json())).data.audit as {
					action: string;
				}[]
			).map(({ action }) => action);
		for (const response of await Promise.all([
			read(get()),
			detail(),
			readComparison(get("/compare")),
			readExport(get("/export")),
		])) {
			expect(response.headers.get("Cache-Control")).toBe("private, no-store");
			expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
		}
		expect((await readComparison(get("/compare"))).status).toBe(405);
		expect((await readExport(get("/export"))).status).toBe(405);
		expect(await audit()).toEqual(["created"]);
		const exportResponse = await exportCsv(post("/export", { id: left }));
		expect(exportResponse.status).toBe(200);
		expect(await exportResponse.text()).not.toContain("example.test");
		const comparison = await compare(post("/compare", { left, right }));
		expect(comparison.status).toBe(200);
		expect(await audit()).toEqual(["created", "exported", "compared"]);
	},
);

databaseTest(
	"historical snapshot metrics stay stable when inquiry data changes",
	async () => {
		const sql = inquiryTestDatabase();
		const historical = {
			total: 5,
			byStatus: { new: 2, contacted: 1, qualified: 1, closed: 1 },
			byCloseReason: { resolved: 1 },
			contactedRate: 0.6,
			qualifiedRate: 0.4,
			averageHoursToContacted: 2,
			averageHoursToQualified: 5,
			weeklyTrend: { "2025-W01": 5 },
			byGeography: {},
			byCountry: {},
			bySector: {},
		};
		const snapshot = await createInquiryReportSnapshot({
			periodStart: new Date("2025-01-01"),
			periodEnd: new Date("2025-01-08"),
			filters: {},
			metrics: historical,
			formulaVersion: "inquiry-funnel-v3",
			createdBy: "steward",
		});
		const asCsv = (value: typeof snapshot) =>
			snapshotMetricsCsv({
				snapshotId: value.snapshot_id,
				periodStart: value.period_start.toISOString(),
				periodEnd: value.period_end.toISOString(),
				timeZone: value.time_zone,
				formulaVersion: value.formula_version,
				filters: value.filters,
				metrics: value.metrics,
			});
		const before = asCsv(snapshot);
		await sql`insert into market_entry.investor_inquiries (reference_code, provenance, retention_at)
    values (${`INQ-TEST-${crypto.randomUUID()}`}, '{}'::jsonb, now() + interval '1 year')`;
		const after = await getInquiryReportSnapshot(snapshot.snapshot_id);
		expect(after?.formula_version).toBe("inquiry-funnel-v3");
		expect(FORMULA_VERSION).toBe("inquiry-funnel-v4");
		expect(after?.metrics).toEqual(historical);
		if (!after) throw new Error("Expected stored snapshot");
		expect(asCsv(after)).toBe(before);
	},
);

databaseTest(
	"snapshot retention defers an original while a current correction depends on it",
	async () => {
		const sql = inquiryTestDatabase();
		const input = {
			periodStart: new Date("2020-01-01"),
			periodEnd: new Date("2020-01-08"),
			filters: {},
			metrics: {
				total: 0,
				byStatus: { new: 0, contacted: 0, qualified: 0, closed: 0 },
				byCloseReason: {},
				contactedRate: 0,
				qualifiedRate: 0,
				averageHoursToContacted: null,
				averageHoursToQualified: null,
				weeklyTrend: {},
				byGeography: {},
				byCountry: {},
				bySector: {},
			},
			createdBy: "steward",
		};
		const original = await createInquiryReportSnapshot(input);
		const correction = await createInquiryReportSnapshot({
			...input,
			correctsSnapshotId: original.snapshot_id,
		});
		const runAt = new Date("2020-03-01");
		const originalId = original.snapshot_id;
		const correctionId = correction.snapshot_id;
		await sql`update market_entry.inquiry_report_snapshots set retention_at = '2020-02-01' where snapshot_id = ${originalId}`;
		expect(await cleanupExpiredInquiryReportSnapshots(true, runAt)).toEqual({
			count: 0,
			applied: true,
		});
		expect(
			(await getInquiryReportSnapshot(correctionId))?.corrects_snapshot_id,
		).toBe(originalId);
		await sql`update market_entry.inquiry_report_snapshots set retention_at = '2020-02-01' where snapshot_id = ${correctionId}`;
		expect(await cleanupExpiredInquiryReportSnapshots(false, runAt)).toEqual({
			count: 2,
			applied: false,
		});
		expect(await cleanupExpiredInquiryReportSnapshots(true, runAt)).toEqual({
			count: 2,
			applied: true,
		});
		expect(await getInquiryReportSnapshot(originalId)).toBeNull();
		expect(await getInquiryReportSnapshot(correctionId)).toBeNull();
	},
);
