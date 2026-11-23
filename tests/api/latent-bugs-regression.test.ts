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
import { observeApi } from "../../src/lib/api-operations";

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

test("internal releases POST enforces bounded JSON bodies (415, 413, 400) after auth and query checks", async () => {
	const original = process.env.ECOM_OPERATORS;
	const stewardToken = randomBytes(32).toString("base64url");
	try {
		process.env.ECOM_OPERATORS = JSON.stringify([
			{ id: "release-steward", role: "steward", token: stewardToken },
		]);

		// Query validation runs before body reading
		const badQuery = await postInternalReleases(
			new Request("http://localhost/api/internal/releases?unexpected=1", {
				method: "POST",
				headers: {
					authorization: `Bearer ${stewardToken}`,
					"content-type": "text/plain",
				},
				body: "not-json",
			}),
		);
		expect(badQuery.status).toBe(400);

		// Wrong Content-Type returns 415
		const wrongContentType = await postInternalReleases(
			new Request("http://localhost/api/internal/releases", {
				method: "POST",
				headers: {
					authorization: `Bearer ${stewardToken}`,
					"content-type": "text/plain",
				},
				body: "{}",
			}),
		);
		expect(wrongContentType.status).toBe(415);
		expect(wrongContentType.headers.get("cache-control")).toBe(
			"private, no-store",
		);
		expect(wrongContentType.headers.get("vary")).toBe("Authorization, Cookie");

		// Body larger than 4096 bytes returns 413
		const tooLarge = await postInternalReleases(
			new Request("http://localhost/api/internal/releases", {
				method: "POST",
				headers: {
					authorization: `Bearer ${stewardToken}`,
					"content-type": "application/json",
				},
				body: JSON.stringify({ note: "x".repeat(4200) }),
			}),
		);
		expect(tooLarge.status).toBe(413);
		expect(tooLarge.headers.get("cache-control")).toBe("private, no-store");
		expect(tooLarge.headers.get("vary")).toBe("Authorization, Cookie");

		// Malformed JSON returns 400
		const invalidJson = await postInternalReleases(
			new Request("http://localhost/api/internal/releases", {
				method: "POST",
				headers: {
					authorization: `Bearer ${stewardToken}`,
					"content-type": "application/json",
				},
				body: "{not-valid-json",
			}),
		);
		expect(invalidJson.status).toBe(400);
		expect(invalidJson.headers.get("cache-control")).toBe("private, no-store");
		expect(invalidJson.headers.get("vary")).toBe("Authorization, Cookie");
	} finally {
		if (original === undefined) delete process.env.ECOM_OPERATORS;
		else process.env.ECOM_OPERATORS = original;
	}
});

test("observeApi logs structured api_error with code and without message on 503 when NODE_ENV !== test", async () => {
	const env = process.env as Record<string, string | undefined>;
	const originalNodeEnv = env.NODE_ENV;
	const originalError = console.error;
	const originalInfo = console.info;
	const errorLogs: unknown[][] = [];
	try {
		console.error = (...args: unknown[]) => {
			errorLogs.push(args);
		};
		console.info = () => {};

		env.NODE_ENV = "development";
		const sqlError = Object.assign(
			new Error("duplicate key for investor@example.test"),
			{ code: "23505", detail: "Key (email)=(investor@example.test) exists." },
		);
		const sqlResponse = await observeApi(
			"health",
			new Request("http://localhost/api/health"),
			async () => {
				throw sqlError;
			},
		);
		expect(sqlResponse.status).toBe(503);
		expect(errorLogs).toHaveLength(1);
		const sqlLine = String(errorLogs[0][0]);
		expect(sqlLine).not.toContain("investor@example.test");
		expect(sqlLine).not.toContain("duplicate key");
		expect(JSON.parse(sqlLine)).toEqual({
			event: "api_error",
			route: "health",
			code: "23505",
		});

		errorLogs.length = 0;
		const plainResponse = await observeApi(
			"health",
			new Request("http://localhost/api/health"),
			async () => {
				throw new TypeError("sensitive PII detail");
			},
		);
		expect(plainResponse.status).toBe(503);
		expect(errorLogs).toHaveLength(1);
		const plainLine = String(errorLogs[0][0]);
		expect(plainLine).not.toContain("sensitive PII detail");
		expect(JSON.parse(plainLine)).toEqual({
			event: "api_error",
			route: "health",
			code: "TypeError",
		});

		errorLogs.length = 0;
		env.NODE_ENV = "test";
		const silentResponse = await observeApi(
			"health",
			new Request("http://localhost/api/health"),
			async () => {
				throw new Error("should not log in test env");
			},
		);
		expect(silentResponse.status).toBe(503);
		expect(errorLogs).toHaveLength(0);
	} finally {
		console.error = originalError;
		console.info = originalInfo;
		if (originalNodeEnv === undefined) delete env.NODE_ENV;
		else env.NODE_ENV = originalNodeEnv;
	}
});
