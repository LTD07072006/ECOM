import { expect, test } from "bun:test";
import { POST } from "../../src/app/api/inquiries/route";
import { INQUIRY_NOTICE_VERSION } from "../../src/features/inquiries/privacy";

const consent = { consent: true, noticeVersion: INQUIRY_NOTICE_VERSION };

const request = (body: unknown, headers: Record<string, string> = {}) =>
	new Request("http://localhost/api/inquiries", {
		method: "POST",
		headers: { "content-type": "application/json", ...headers },
		body: JSON.stringify(body),
	});

test("public inquiry API rejects malformed input without echoing personal fields", async () => {
	const response = await POST(
		request({ ...consent, email: "not-an-email", message: "short" }),
	);
	expect(response.status).toBe(400);
	const body = await response.json();
	expect(body.fields).toEqual(["email", "message"]);
	expect(JSON.stringify(body)).not.toContain("not-an-email");
});

test("public inquiry API rejects non-JSON requests", async () => {
	const response = await POST(
		new Request("http://localhost/api/inquiries", {
			method: "POST",
			headers: { "content-type": "text/plain" },
			body: "email=a@example.com",
		}),
	);
	expect(response.status).toBe(415);
});

test("public inquiry API does not expose private fields in malformed responses", async () => {
	const response = await POST(
		request({
			...consent,
			email: "private@example.com",
			message: "This private message must not be echoed.",
			unexpected: "secret-field",
		}),
	);
	expect(response.status).toBe(400);
	const body = await response.text();
	expect(body).not.toContain("private@example.com");
	expect(body).not.toContain("This private message");
	expect(body).not.toContain("secret-field");
});

test("public inquiries require consent to the version displayed in the form", async () => {
	const inquiry = {
		email: "valid@example.test",
		message: "An ordinary investment inquiry.",
	};
	const missing = await POST(request(inquiry));
	expect(missing.status).toBe(400);
	expect((await missing.json()).fields).toEqual(["consent", "noticeVersion"]);
	const stale = await POST(
		request({ ...inquiry, consent: true, noticeVersion: "older" }),
	);
	expect(stale.status).toBe(400);
	expect((await stale.json()).fields).toEqual(["noticeVersion"]);
});

test("public inquiry byte limit applies to UTF-8 streams and cancels the reader at the limit", async () => {
	const encoder = new TextEncoder();
	let cancelled = false;
	const stream = new ReadableStream<Uint8Array>({
		start(controller) {
			controller.enqueue(encoder.encode(" ".repeat(1_000)));
			controller.enqueue(encoder.encode("ệ".repeat(22_000)));
		},
		cancel() {
			cancelled = true;
		},
	});
	const response = await POST(
		new Request("http://localhost/api/inquiries", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: stream,
		}),
	);
	expect(response.status).toBe(413);
	expect(cancelled).toBe(true);
});

test("public inquiry byte limit applies even when the declared length is smaller", async () => {
	const response = await POST(
		request(
			{ ...consent, message: "x".repeat(64_000) },
			{ "content-length": "60" },
		),
	);
	expect(response.status).toBe(413);
});
