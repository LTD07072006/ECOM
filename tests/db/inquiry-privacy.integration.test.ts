import { expect, test } from "bun:test";
import { randomBytes, randomUUID } from "node:crypto";
import { POST as submitInquiry } from "../../src/app/api/inquiries/route";
import { POST as eraseInquiry } from "../../src/app/api/internal/inquiries/[referenceCode]/erasure/route";
import {
	GET as getInquiry,
	PATCH as updateInquiry,
} from "../../src/app/api/internal/inquiries/[referenceCode]/route";
import { GET as listInquiries } from "../../src/app/api/internal/inquiries/route";
import { POST as createSnapshot } from "../../src/app/api/internal/inquiries/snapshots/route";
import { databasePool } from "../../src/db/pool";
import { INQUIRY_NOTICE_VERSION } from "../../src/features/inquiries/privacy";
import {
	createInquiry,
	getInquiry as findInquiry,
	updateInquiry as updateRecord,
} from "../../src/features/inquiries/repository";

const databaseTest =
	process.env.RUN_INQUIRY_DB_TESTS === "1" ? test : test.skip;
const origin = "http://localhost";

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

function stewardOperatorEnv(actorId: string) {
	const original = process.env.ECOM_OPERATORS;
	const token = randomBytes(32).toString("base64url");
	process.env.ECOM_OPERATORS = JSON.stringify([
		{ id: actorId, role: "steward", token },
	]);
	return {
		token,
		restore() {
			if (original === undefined) delete process.env.ECOM_OPERATORS;
			else process.env.ECOM_OPERATORS = original;
		},
	};
}

databaseTest(
	"erasure API anonymizes PII, notes, and pending notifications, logs access audit, and is idempotent",
	async () => {
		const sql = inquiryTestDatabase();
		const operator = stewardOperatorEnv("privacy-steward");
		try {
			const created = await createInquiry({
				email: "dsar-subject@example.test",
				message: "Personal inquiry subject to erasure request.",
				name: "Subject Name",
				organization: "Subject Org",
				country: "Singapore",
				sector: "Retail",
				geographyIds: [],
				noticeVersion: INQUIRY_NOTICE_VERSION,
			});
			await updateRecord(
				created.referenceCode,
				{ note: "Internal note mentioning dsar-subject@example.test." },
				"privacy-steward",
			);

			const endpoint = `${origin}/api/internal/inquiries/${created.referenceCode}/erasure`;
			const context = {
				params: Promise.resolve({ referenceCode: created.referenceCode }),
			};
			const authHeaders = {
				authorization: `Bearer ${operator.token}`,
				"content-type": "application/json",
			};

			expect(
				(
					await eraseInquiry(
						new Request(endpoint, {
							method: "POST",
							headers: { "content-type": "application/json" },
							body: JSON.stringify({
								reason: "erasure_request",
								ticket: "DSAR-2026-001",
							}),
						}),
						context,
					)
				).status,
			).toBe(401);

			expect(
				(
					await eraseInquiry(
						new Request(`${endpoint}?unexpected=1`, {
							method: "POST",
							headers: authHeaders,
							body: JSON.stringify({
								reason: "erasure_request",
								ticket: "DSAR-2026-001",
							}),
						}),
						context,
					)
				).status,
			).toBe(400);

			expect(
				(
					await eraseInquiry(
						new Request(`${origin}/api/internal/inquiries/bad-ref/erasure`, {
							method: "POST",
							headers: authHeaders,
							body: JSON.stringify({
								reason: "erasure_request",
								ticket: "DSAR-2026-001",
							}),
						}),
						{ params: Promise.resolve({ referenceCode: "bad-ref" }) },
					)
				).status,
			).toBe(404);

			expect(
				(
					await eraseInquiry(
						new Request(
							`${origin}/api/internal/inquiries/INQ-2026-00000000/erasure`,
							{
								method: "POST",
								headers: authHeaders,
								body: JSON.stringify({
									reason: "erasure_request",
									ticket: "DSAR-2026-001",
								}),
							},
						),
						{ params: Promise.resolve({ referenceCode: "INQ-2026-00000000" }) },
					)
				).status,
			).toBe(404);

			expect(
				(
					await eraseInquiry(
						new Request(endpoint, {
							method: "POST",
							headers: authHeaders,
							body: JSON.stringify({
								reason: "erasure_request",
								ticket: "bad ticket with spaces",
							}),
						}),
						context,
					)
				).status,
			).toBe(400);

			expect(
				(
					await eraseInquiry(
						new Request(endpoint, {
							method: "POST",
							headers: authHeaders,
							body: JSON.stringify({
								reason: "erasure_request",
								ticket: "DSAR-2026-001",
								extra: "nope",
							}),
						}),
						context,
					)
				).status,
			).toBe(400);

			expect(
				(
					await eraseInquiry(
						new Request(endpoint, {
							method: "POST",
							headers: {
								authorization: `Bearer ${operator.token}`,
								"content-type": "text/plain",
							},
							body: "{}",
						}),
						context,
					)
				).status,
			).toBe(415);

			expect(
				(
					await eraseInquiry(
						new Request(endpoint, {
							method: "POST",
							headers: authHeaders,
							body: JSON.stringify({
								reason: "erasure_request",
								ticket: "A".repeat(2_500),
							}),
						}),
						context,
					)
				).status,
			).toBe(413);

			const first = await eraseInquiry(
				new Request(endpoint, {
					method: "POST",
					headers: authHeaders,
					body: JSON.stringify({
						reason: "erasure_request",
						ticket: "DSAR-2026-001",
					}),
				}),
				context,
			);
			expect(first.status).toBe(200);
			expect(first.headers.get("cache-control")).toBe("private, no-store");
			expect(await first.json()).toEqual({
				erased: true,
				referenceCode: created.referenceCode,
				alreadyAnonymized: false,
			});

			const record = await findInquiry(created.referenceCode);
			expect(record?.inquiry).toMatchObject({
				email: null,
				message: null,
				name: null,
				organization: null,
				country: null,
				sector: null,
			});
			expect(record?.inquiry.anonymized_at).toBeInstanceOf(Date);
			expect(record?.audit.every((event) => event.note === null)).toBe(true);
			const anonymizedEvents =
				record?.audit.filter((event) => event.action === "anonymized") ?? [];
			expect(anonymizedEvents).toHaveLength(1);
			expect(anonymizedEvents[0]?.actor).toBe("privacy-steward");

			const notifications = await sql<{ status: string }[]>`
        select status from market_entry.inquiry_notifications
        where inquiry_id = ${created.inquiryId}
      `;
			expect(notifications.length).toBeGreaterThan(0);
			expect(notifications.every((row) => row.status === "skipped")).toBe(true);

			const second = await eraseInquiry(
				new Request(endpoint, {
					method: "POST",
					headers: authHeaders,
					body: JSON.stringify({
						reason: "consent_withdrawn",
						ticket: "DSAR-2026-002",
					}),
				}),
				context,
			);
			expect(second.status).toBe(200);
			expect(await second.json()).toEqual({
				erased: true,
				referenceCode: created.referenceCode,
				alreadyAnonymized: true,
			});

			const afterSecond = await findInquiry(created.referenceCode);
			expect(
				afterSecond?.audit.filter((event) => event.action === "anonymized"),
			).toHaveLength(1);

			const accessRows = await sql<
				{ actor: string; action: string; ticket_ref: string | null }[]
			>`
        select actor, action, ticket_ref
        from market_entry.inquiry_access_audit
        where inquiry_id = ${created.inquiryId}
        order by happened_at asc
      `;
			expect([...accessRows]).toEqual([
				{
					actor: "privacy-steward",
					action: "erased_by_request",
					ticket_ref: "DSAR-2026-001",
				},
				{
					actor: "privacy-steward",
					action: "consent_withdrawn",
					ticket_ref: "DSAR-2026-002",
				},
			]);
		} finally {
			operator.restore();
		}
	},
);

databaseTest(
	"updateInquiry caps retention_at at 24 months after created_at",
	async () => {
		inquiryTestDatabase();
		const created23MonthsAgo = new Date();
		created23MonthsAgo.setUTCMonth(created23MonthsAgo.getUTCMonth() - 23);

		const created = await createInquiry(
			{
				email: "retention-cap@example.test",
				message: "Testing the 24-month hard retention ceiling.",
				geographyIds: [],
				noticeVersion: INQUIRY_NOTICE_VERSION,
			},
			created23MonthsAgo,
		);
		const before = await findInquiry(created.referenceCode);
		if (!before) throw new Error("Expected inquiry record");

		await updateRecord(created.referenceCode, {
			note: "Steward follow-up at month 23.",
		});

		const after = await findInquiry(created.referenceCode);
		if (!after) throw new Error("Expected updated inquiry record");

		const maxRetention = new Date(after.inquiry.created_at);
		maxRetention.setUTCFullYear(maxRetention.getUTCFullYear() + 2);
		expect(after.inquiry.retention_at.getTime()).toBeLessThanOrEqual(
			maxRetention.getTime(),
		);
		expect(after.inquiry.retention_at.getTime()).toBeGreaterThan(
			before.inquiry.retention_at.getTime(),
		);
	},
);

databaseTest(
	"live CSV export and detail view record inquiry_access_audit with actor and enforce strict referenceCode and query rules",
	async () => {
		const sql = inquiryTestDatabase();
		const operator = stewardOperatorEnv("audit-steward");
		try {
			const created = await createInquiry({
				email: "access-audit@example.test",
				message: "Testing access audit logging on CSV export and detail view.",
				geographyIds: [],
				noticeVersion: INQUIRY_NOTICE_VERSION,
			});

			const auth = { authorization: `Bearer ${operator.token}` };
			const csvResponse = await listInquiries(
				new Request(
					`${origin}/api/internal/inquiries?reference=${created.referenceCode}&format=csv`,
					{ headers: auth },
				),
			);
			expect(csvResponse.status).toBe(200);
			await csvResponse.text();

			const detailResponse = await getInquiry(
				new Request(
					`${origin}/api/internal/inquiries/${created.referenceCode}`,
					{ headers: auth },
				),
				{ params: Promise.resolve({ referenceCode: created.referenceCode }) },
			);
			expect(detailResponse.status).toBe(200);

			const [csvAudit] = await sql<
				{ actor: string; action: string; row_count: number | null }[]
			>`
        select actor, action, row_count
        from market_entry.inquiry_access_audit
        where actor = 'audit-steward' and action = 'exported_live_csv'
        order by happened_at desc
        limit 1
      `;
			expect(csvAudit).toEqual({
				actor: "audit-steward",
				action: "exported_live_csv",
				row_count: 1,
			});

			const [detailAudit] = await sql<
				{ actor: string; action: string; inquiry_id: string | null }[]
			>`
        select actor, action, inquiry_id
        from market_entry.inquiry_access_audit
        where actor = 'audit-steward'
          and action = 'viewed_detail'
          and inquiry_id = ${created.inquiryId}
        order by happened_at desc
        limit 1
      `;
			expect(detailAudit).toEqual({
				actor: "audit-steward",
				action: "viewed_detail",
				inquiry_id: created.inquiryId,
			});

			expect(
				(
					await getInquiry(
						new Request(`${origin}/api/internal/inquiries/not-a-ref`, {
							headers: auth,
						}),
						{ params: Promise.resolve({ referenceCode: "not-a-ref" }) },
					)
				).status,
			).toBe(404);

			expect(
				(
					await getInquiry(
						new Request(
							`${origin}/api/internal/inquiries/${created.referenceCode}?extra=1`,
							{ headers: auth },
						),
						{
							params: Promise.resolve({ referenceCode: created.referenceCode }),
						},
					)
				).status,
			).toBe(400);

			expect(
				(
					await updateInquiry(
						new Request(`${origin}/api/internal/inquiries/not-a-ref`, {
							method: "PATCH",
							headers: { ...auth, "content-type": "application/json" },
							body: JSON.stringify({ note: "Should be 404." }),
						}),
						{ params: Promise.resolve({ referenceCode: "not-a-ref" }) },
					)
				).status,
			).toBe(404);
		} finally {
			operator.restore();
		}
	},
);

databaseTest(
	"POST /api/inquiries with valid nonexistent geography UUID returns 400 without echoing the UUID",
	async () => {
		inquiryTestDatabase();
		const missingId = randomUUID();
		const response = await submitInquiry(
			new Request(`${origin}/api/inquiries`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					email: "missing-geo@example.test",
					message: "Checking nonexistent geography UUID handling.",
					geographyIds: [missingId],
					consent: true,
					noticeVersion: INQUIRY_NOTICE_VERSION,
				}),
			}),
		);
		expect(response.status).toBe(400);
		const text = await response.text();
		expect(text).toContain(
			"One or more selected places are no longer available.",
		);
		expect(text).not.toContain(missingId);
	},
);

databaseTest(
	"internal inquiry list and snapshot endpoints reject >20 geographyIds and unexpected keys with 400",
	async () => {
		inquiryTestDatabase();
		const operator = stewardOperatorEnv("validation-steward");
		try {
			const ids21 = Array.from({ length: 21 }, () => randomUUID());
			const auth = {
				authorization: `Bearer ${operator.token}`,
				"content-type": "application/json",
			};

			const tooManyGeographies = await listInquiries(
				new Request(
					`${origin}/api/internal/inquiries?geographyIds=${ids21.join(",")}`,
					{ headers: { authorization: `Bearer ${operator.token}` } },
				),
			);
			expect(tooManyGeographies.status).toBe(400);

			const extraRootKey = await createSnapshot(
				new Request(`${origin}/api/internal/inquiries/snapshots`, {
					method: "POST",
					headers: auth,
					body: JSON.stringify({
						periodStart: "2026-01-01",
						periodEnd: "2026-01-08",
						filters: {},
						unexpectedRoot: true,
					}),
				}),
			);
			expect(extraRootKey.status).toBe(400);

			const extraFilterKey = await createSnapshot(
				new Request(`${origin}/api/internal/inquiries/snapshots`, {
					method: "POST",
					headers: auth,
					body: JSON.stringify({
						periodStart: "2026-01-01",
						periodEnd: "2026-01-08",
						filters: { unexpectedFilter: "x" },
					}),
				}),
			);
			expect(extraFilterKey.status).toBe(400);

			const tooManySnapshotGeos = await createSnapshot(
				new Request(`${origin}/api/internal/inquiries/snapshots`, {
					method: "POST",
					headers: auth,
					body: JSON.stringify({
						periodStart: "2026-01-01",
						periodEnd: "2026-01-08",
						filters: { geographyIds: ids21 },
					}),
				}),
			);
			expect(tooManySnapshotGeos.status).toBe(400);
		} finally {
			operator.restore();
		}
	},
);
