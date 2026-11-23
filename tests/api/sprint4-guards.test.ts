import { expect, spyOn, test } from "bun:test";
import { randomBytes } from "node:crypto";
import * as poolModule from "../../src/db/pool";
import { boundedQuery, observeApi } from "../../src/lib/api-operations";
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

test("production ingress fails closed without proxy token unless ECOM_ALLOW_DIRECT_INGRESS=1", async () => {
	const env = process.env as Record<string, string | undefined>;
	const originalNodeEnv = env.NODE_ENV;
	const originalToken = env.ECOM_TRUSTED_PROXY_TOKEN;
	const originalDirect = env.ECOM_ALLOW_DIRECT_INGRESS;
	const warnCalls: string[] = [];
	const warnSpy = spyOn(console, "warn").mockImplementation((...args) => {
		warnCalls.push(String(args[0]));
	});
	const infoSpy = spyOn(console, "info").mockImplementation(() => {});
	const fakeSql = (() =>
		Promise.resolve([
			{ limited: false, retry_after: 0 },
		])) as unknown as ReturnType<typeof poolModule.databasePool>;
	const poolSpy = spyOn(poolModule, "databasePool").mockReturnValue(fakeSql);

	let executed = 0;
	const handler = async () => {
		executed += 1;
		return Response.json({ ok: true });
	};

	try {
		env.NODE_ENV = "production";
		delete env.ECOM_TRUSTED_PROXY_TOKEN;
		delete env.ECOM_ALLOW_DIRECT_INGRESS;

		const blocked = await observeApi(
			"search",
			new Request("http://localhost/api/geographies?q=ha"),
			handler,
		);
		expect(blocked.status).toBe(503);
		expect(executed).toBe(0);

		const health = await observeApi(
			"health",
			new Request("http://localhost/api/health"),
			handler,
		);
		expect(health.status).toBe(200);
		expect(executed).toBe(1);

		env.ECOM_ALLOW_DIRECT_INGRESS = "1";
		const allowed = await observeApi(
			"search",
			new Request("http://localhost/api/geographies?q=ha"),
			handler,
		);
		expect(allowed.status).toBe(200);
		expect(executed).toBe(2);
		expect(
			warnCalls.filter((entry) => entry.includes('"ingress_unconfigured"'))
				.length,
		).toBeLessThanOrEqual(1);
	} finally {
		poolSpy.mockRestore();
		warnSpy.mockRestore();
		infoSpy.mockRestore();
		if (originalNodeEnv === undefined) delete env.NODE_ENV;
		else env.NODE_ENV = originalNodeEnv;
		if (originalToken === undefined) delete env.ECOM_TRUSTED_PROXY_TOKEN;
		else env.ECOM_TRUSTED_PROXY_TOKEN = originalToken;
		if (originalDirect === undefined) delete env.ECOM_ALLOW_DIRECT_INGRESS;
		else env.ECOM_ALLOW_DIRECT_INGRESS = originalDirect;
	}
});

test("boundaries and layers enforce 60/min local quota with Retry-After and require proxy proof", async () => {
	const env = process.env as Record<string, string | undefined>;
	const originalNodeEnv = env.NODE_ENV;
	const originalToken = env.ECOM_TRUSTED_PROXY_TOKEN;
	const token = randomBytes(32).toString("base64url");

	try {
		env.NODE_ENV = "test";
		env.ECOM_TRUSTED_PROXY_TOKEN = token;
		if (Date.now() % 60_000 > 58_000) {
			await Bun.sleep(60_000 - (Date.now() % 60_000) + 50);
		}

		for (const route of ["boundaries", "layers"] as const) {
			let executed = 0;
			const handler = async () => {
				executed += 1;
				return Response.json({ data: [] });
			};
			const missingProof = await observeApi(
				route,
				new Request(
					`http://localhost/api/map/${route === "boundaries" ? "provinces" : "layers"}`,
				),
				handler,
			);
			expect(missingProof.status).toBe(503);
			expect(executed).toBe(0);

			const request = (address: string) =>
				new Request(
					`http://localhost/api/map/${route === "boundaries" ? "provinces" : "layers"}`,
					{
						headers: {
							"x-ecom-client-ip": address,
							"x-ecom-ingress-token": token,
						},
					},
				);
			const allowed = await Promise.all(
				Array.from({ length: 60 }, () =>
					observeApi(route, request("198.51.100.10"), handler),
				),
			);
			expect(allowed.every((response) => response.status === 200)).toBe(true);
			expect(executed).toBe(60);

			const limited = await observeApi(
				route,
				request("198.51.100.10"),
				handler,
			);
			expect(limited.status).toBe(429);
			expect(Number(limited.headers.get("Retry-After"))).toBeGreaterThan(0);
			expect(executed).toBe(60);

			const otherClient = await observeApi(
				route,
				request("198.51.100.11"),
				handler,
			);
			expect(otherClient.status).toBe(200);
		}

		let healthExecuted = 0;
		const health = await observeApi(
			"health",
			new Request("http://localhost/api/health"),
			async () => {
				healthExecuted += 1;
				return Response.json({ status: "ok" });
			},
		);
		expect(health.status).toBe(200);
		expect(healthExecuted).toBe(1);
	} finally {
		if (originalNodeEnv === undefined) delete env.NODE_ENV;
		else env.NODE_ENV = originalNodeEnv;
		if (originalToken === undefined) delete env.ECOM_TRUSTED_PROXY_TOKEN;
		else env.ECOM_TRUSTED_PROXY_TOKEN = originalToken;
	}
});

test("observeApi enforces private no-store headers on internal routes even without the fourth argument", async () => {
	const response = await observeApi(
		"internal",
		new Request("http://localhost/api/internal/inquiries"),
		async () => Response.json({ ok: true }),
	);
	expect(response.status).toBe(200);
	expect(response.headers.get("Cache-Control")).toBe("private, no-store");
	expect(response.headers.get("Vary")).toBe("Authorization, Cookie");
});
