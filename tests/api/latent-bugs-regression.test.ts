import { expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import { GET as listInternalInquiries } from "../../src/app/api/internal/inquiries/route";
import { PATCH as patchInternalInquiry } from "../../src/app/api/internal/inquiries/[referenceCode]/route";
import {
	GET as getInternalReleases,
	POST as postInternalReleases,
} from "../../src/app/api/internal/releases/route";
import { INQUIRY_NOTICE_VERSION } from "../../src/features/inquiries/privacy";
import { VIETNAM_REPORT_TIME_ZONE } from "../../src/features/inquiries/reporting";
import { inquirySubmissionSchema } from "../../src/features/inquiries/validation";

test("optionalText normalizes blank strings from FormData into undefined", () => {
	const parsed = inquirySubmissionSchema.parse({
		email: "investor@example.test",
		message: "Looking for industrial park context in Hai Phong.",
		name: "",
		organization: "   ",
		country: "",
		sector: "",
		geographyIds: [],
		consent: true,
		noticeVersion: INQUIRY_NOTICE_VERSION,
		honeypot: "",
	});
	expect(parsed.name).toBeUndefined();
	expect(parsed.organization).toBeUndefined();
	expect(parsed.country).toBeUndefined();
	expect(parsed.sector).toBeUndefined();
});

test("internal inquiry routes enforce private cache headers, strict UUID validation, and bounded JSON bodies", async () => {
	const original = process.env.ECOM_OPERATORS;
	const stewardToken = randomBytes(32).toString("base64url");
	try {
		process.env.ECOM_OPERATORS = JSON.stringify([
			{ id: "regression-steward", role: "steward", token: stewardToken },
		]);

		// 36 hyphens previously passed /^[0-9a-f-]{36}$/i and triggered a 503 PostgreSQL error instead of 400
		const badUuid = await listInternalInquiries(
			new Request(
				"http://localhost/api/internal/inquiries?geographyIds=------------------------------------",
				{ headers: { authorization: `Bearer ${stewardToken}` } },
			),
		);
		expect(badUuid.status).toBe(400);
		expect(badUuid.headers.get("cache-control")).toBe("private, no-store");
		expect(badUuid.headers.get("vary")).toBe("Authorization, Cookie");

		// Invalid format query is rejected with 400
		const badFormat = await listInternalInquiries(
			new Request("http://localhost/api/internal/inquiries?format=xml", {
				headers: { authorization: `Bearer ${stewardToken}` },
			}),
		);
		expect(badFormat.status).toBe(400);

		// Oversized PATCH payload is rejected with 413 by readBoundedJson
		const oversized = await patchInternalInquiry(
			new Request("http://localhost/api/internal/inquiries/INQ-2026-ABCDEF12", {
				method: "PATCH",
				headers: {
					authorization: `Bearer ${stewardToken}`,
					"content-type": "application/json",
				},
				body: JSON.stringify({ note: "x".repeat(40_000) }),
			}),
			{ params: Promise.resolve({ referenceCode: "INQ-2026-ABCDEF12" }) },
		);
		expect(oversized.status).toBe(413);
		expect(oversized.headers.get("cache-control")).toBe("private, no-store");
		expect(oversized.headers.get("vary")).toBe("Authorization, Cookie");
	} finally {
		if (original === undefined) delete process.env.ECOM_OPERATORS;
		else process.env.ECOM_OPERATORS = original;
	}
});

test("notifications flush uses advisory lock instead of holding a DB transaction across HTTP calls", async () => {
	const source = await Bun.file(
		"src/features/inquiries/notifications.ts",
	).text();
	expect(source).toContain("pg_try_advisory_lock");
	expect(source).toContain("pg_advisory_unlock");
	expect(source).not.toContain("sql.begin(");
});

test("internal releases route sets private, no-store and Vary headers consistently", async () => {
	const getUnauthorized = await getInternalReleases(
		new Request("http://localhost/api/internal/releases"),
	);
	expect(getUnauthorized.status).toBe(401);
	expect(getUnauthorized.headers.get("cache-control")).toBe(
		"private, no-store",
	);
	expect(getUnauthorized.headers.get("vary")).toBe("Authorization, Cookie");
	expect(getUnauthorized.headers.get("x-content-type-options")).toBe("nosniff");

	const postUnauthorized = await postInternalReleases(
		new Request("http://localhost/api/internal/releases", { method: "POST" }),
	);
	expect(postUnauthorized.status).toBe(401);
	expect(postUnauthorized.headers.get("cache-control")).toBe(
		"private, no-store",
	);
	expect(postUnauthorized.headers.get("vary")).toBe("Authorization, Cookie");
});

test("snapshot creation defaults timeZone to Asia/Ho_Chi_Minh and passes it to inquiryAnalytics", async () => {
	const routeSource = await Bun.file(
		"src/app/api/internal/inquiries/snapshots/route.ts",
	).text();
	const snapshotsSource = await Bun.file(
		"src/features/inquiries/snapshots.ts",
	).text();
	expect(VIETNAM_REPORT_TIME_ZONE).toBe("Asia/Ho_Chi_Minh");
	expect(routeSource).toContain(".default(VIETNAM_REPORT_TIME_ZONE)");
	expect(routeSource).toContain(
		"inquiryAnalytics(filters, canonical.timeZone)",
	);
	expect(snapshotsSource).toContain(
		"input.timeZone ?? VIETNAM_REPORT_TIME_ZONE",
	);
});
