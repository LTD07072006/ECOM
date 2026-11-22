import { afterEach, expect, spyOn, test } from "bun:test";
import { POST as lookupStatus } from "../../src/app/api/inquiries/status/route";
import * as repo from "../../src/features/inquiries/repository";

let lookupSpy:
	| ReturnType<typeof spyOn<typeof repo, "lookupPublicInquiryStatus">>
	| undefined;

afterEach(() => {
	lookupSpy?.mockRestore();
	lookupSpy = undefined;
});

test("POST /api/inquiries/status validates JSON and rejects malformed input without echoing PII", async () => {
	const nonJson = await lookupStatus(
		new Request("http://localhost/api/inquiries/status", {
			method: "POST",
			body: "plain",
		}),
	);
	expect(nonJson.status).toBe(415);

	const badRef = await lookupStatus(
		new Request("http://localhost/api/inquiries/status", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				referenceCode: "BAD-CODE",
				email: "secret@example.test",
			}),
		}),
	);
	expect(badRef.status).toBe(400);
	const text = await badRef.text();
	expect(text).not.toContain("secret@example.test");
	expect(text).not.toContain("BAD-CODE");
});

test("POST /api/inquiries/status returns uniform 404 on miss and non-sensitive milestones on match", async () => {
	lookupSpy = spyOn(repo, "lookupPublicInquiryStatus")
		.mockResolvedValueOnce(null)
		.mockResolvedValueOnce({
			referenceCode: "INQ-2026-ABCDEF12",
			status: "contacted",
			closeReason: null,
			submittedAt: "2026-11-20T09:00:00.000Z",
			updatedAt: "2026-11-21T10:30:00.000Z",
			geographyCount: 2,
			timeline: [
				{
					action: "submitted",
					fromStatus: null,
					toStatus: "new",
					happenedAt: "2026-11-20T09:00:00.000Z",
				},
				{
					action: "status_changed",
					fromStatus: "new",
					toStatus: "contacted",
					happenedAt: "2026-11-21T10:30:00.000Z",
				},
			],
		});

	const missing = await lookupStatus(
		new Request("http://localhost/api/inquiries/status", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				referenceCode: "INQ-2026-00000000",
				email: "nobody@example.test",
			}),
		}),
	);
	expect(missing.status).toBe(404);
	expect(missing.headers.get("cache-control")).toBe("private, no-store");

	const found = await lookupStatus(
		new Request("http://localhost/api/inquiries/status", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				referenceCode: "inq-2026-abcdef12",
				email: "Investor@Example.Test",
			}),
		}),
	);
	expect(found.status).toBe(200);
	expect(found.headers.get("cache-control")).toBe("private, no-store");
	const body = await found.json();
	expect(body.data.referenceCode).toBe("INQ-2026-ABCDEF12");
	expect(body.data.status).toBe("contacted");
	expect(body.data.timeline).toHaveLength(2);
	expect(JSON.stringify(body)).not.toContain("Investor@Example.Test");
	expect(JSON.stringify(body)).not.toContain("note");
});

test("emailsMatchConstantTime normalizes case and rejects mismatches", () => {
	expect(
		repo.emailsMatchConstantTime(
			"Investor@Example.Test",
			" investor@example.test ",
		),
	).toBe(true);
	expect(
		repo.emailsMatchConstantTime("investor@example.test", "other@example.test"),
	).toBe(false);
});
