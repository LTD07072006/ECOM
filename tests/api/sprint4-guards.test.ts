import { expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import { observeApi, boundedQuery } from "../../src/lib/api-operations";
import { safeSourceUrl } from "../../src/lib/source-url";

test("query guard rejects duplicated parameters and unrecognized parameters", () => {
	expect(
		boundedQuery(new Request("http://localhost/?q=ha+noi"), "q")?.get("q"),
	).toBe("ha noi");
	expect(
		boundedQuery(new Request("http://localhost/?q=a&q=b"), "q"),
	).toBeNull();
	expect(
		boundedQuery(new Request("http://localhost/?other=a"), "q"),
	).toBeNull();
	expect(
		boundedQuery(new Request(`http://localhost/?q=${"a".repeat(4096)}`), "q"),
	).toBeNull();
});

test("the local quota rejects requests after the configured limit and avoids invoking the handler", async () => {
	const originalSecret = process.env.ECOM_TRUSTED_PROXY_TOKEN;
	const token = randomBytes(32).toString("base64url");
	process.env.ECOM_TRUSTED_PROXY_TOKEN = token;
	const request = (address: string) =>
		new Request("http://localhost/api/inquiries", {
			headers: { "x-ecom-client-ip": address, "x-ecom-ingress-token": token },
		});
	let executed = 0;
	const handler = async () => {
		executed += 1;
		return Response.json({ data: [] });
	};
	try {
		const responses = await Promise.all(
			Array.from({ length: 11 }, () =>
				observeApi("inquiries", request("192.0.2.42"), handler),
			),
		);
		expect(executed).toBe(10);
		const limited = responses.at(-1);
		if (!limited) throw new Error("Expected limited response");
		expect(limited.status).toBe(429);
		expect(Number(limited.headers.get("Retry-After"))).toBeGreaterThan(0);
		expect(await limited.json()).toEqual({
			error: "Too many requests. Try again shortly.",
		});
		expect(
			(await observeApi("inquiries", request("192.0.2.43"), handler)).status,
		).toBe(200);
	} finally {
		if (originalSecret === undefined)
			delete process.env.ECOM_TRUSTED_PROXY_TOKEN;
		else process.env.ECOM_TRUSTED_PROXY_TOKEN = originalSecret;
	}
});

test("source URLs allow HTTPS and reject embedded credentials and unsafe protocols", () => {
	expect(safeSourceUrl("https://www.nso.gov.vn")).toBe(
		"https://www.nso.gov.vn",
	);
	expect(safeSourceUrl("http://www.nso.gov.vn")).toBeNull();
	expect(safeSourceUrl("https://someone:secret@example.test")).toBeNull();
	expect(safeSourceUrl("javascript:alert(1)")).toBeNull();
});
