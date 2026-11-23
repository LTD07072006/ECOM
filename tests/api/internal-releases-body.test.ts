import { expect, test } from "bun:test";
import { randomBytes, randomUUID } from "node:crypto";
import { POST } from "../../src/app/api/internal/releases/route";

test("POST /api/internal/releases rejects chunked bodies over 4096 bytes with 413 and accepts mixed-case JSON content-type", async () => {
	const original = process.env.ECOM_OPERATORS;
	const token = randomBytes(32).toString("base64url");
	process.env.ECOM_OPERATORS = JSON.stringify([
		{ id: "release-steward", role: "steward", token },
	]);
	try {
		const encoder = new TextEncoder();
		const oversizedStream = new ReadableStream<Uint8Array>({
			start(controller) {
				controller.enqueue(
					encoder.encode(
						`{"batchId":"${randomUUID()}","action":"publish","note":"`,
					),
				);
				controller.enqueue(encoder.encode("a".repeat(4100)));
				controller.enqueue(encoder.encode('"}'));
				controller.close();
			},
		});

		const oversizedResponse = await POST(
			new Request("http://localhost/api/internal/releases", {
				method: "POST",
				headers: {
					authorization: `Bearer ${token}`,
					"content-type": "application/json",
				},
				body: oversizedStream,
			}),
		);
		expect(oversizedResponse.status).toBe(413);
		expect(await oversizedResponse.json()).toEqual({
			error: "The request body is too large.",
		});

		const invalidPayloadResponse = await POST(
			new Request("http://localhost/api/internal/releases", {
				method: "POST",
				headers: {
					authorization: `Bearer ${token}`,
					"Content-Type": "Application/JSON; charset=utf-8",
				},
				body: JSON.stringify({ batchId: "not-a-uuid", action: "publish" }),
			}),
		);
		expect(invalidPayloadResponse.status).toBe(400);
		expect(await invalidPayloadResponse.json()).toEqual({
			error: "Provide a release action and a note of 10 to 500 characters.",
		});

		const invalidUtf8Response = await POST(
			new Request("http://localhost/api/internal/releases", {
				method: "POST",
				headers: {
					authorization: `Bearer ${token}`,
					"content-type": "application/json",
				},
				body: new Uint8Array([0x7b, 0xff, 0x7d]),
			}),
		);
		expect(invalidUtf8Response.status).toBe(400);
	} finally {
		if (original === undefined) delete process.env.ECOM_OPERATORS;
		else process.env.ECOM_OPERATORS = original;
	}
});
