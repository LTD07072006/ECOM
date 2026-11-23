import { expect, test } from "@playwright/test";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

function headerValues(
	headers: Array<{ name: string; value: string }>,
	targetName: string,
) {
	const normalized = targetName.toLowerCase();
	return headers
		.filter((header) => header.name.toLowerCase() === normalized)
		.map((header) => header.value);
}

for (const routePath of [
	"/",
	"/decision",
	"/privacy/inquiries",
	"/internal/inquiries",
	"/internal/releases",
]) {
	test(`security headers and CSP nonce are enforced on ${routePath}`, async ({
		page,
	}) => {
		const cspViolations: string[] = [];
		const pageErrors: string[] = [];
		page.on("console", (message) => {
			if (/content security policy/i.test(message.text())) {
				cspViolations.push(message.text());
			}
		});
		page.on("pageerror", (error) => {
			pageErrors.push(error.message);
		});

		const response = await page.goto(new URL(routePath, baseUrl).href);
		expect(response).not.toBeNull();
		if (!response) return;
		expect(response.status()).toBe(200);

		const headers = await response.headersArray();
		const cspValues = headerValues(headers, "content-security-policy");
		expect(cspValues).toHaveLength(1);
		expect(cspValues[0]).toContain("frame-ancestors 'none'");
		expect(cspValues[0]).toContain("'nonce-");
		expect(cspValues[0]).not.toContain("upgrade-insecure-requests");

		expect(headerValues(headers, "x-frame-options")).toEqual(["DENY"]);
		expect(headerValues(headers, "x-content-type-options")).toEqual([
			"nosniff",
		]);
		expect(headerValues(headers, "referrer-policy")).toEqual([
			routePath.startsWith("/internal/")
				? "no-referrer"
				: "strict-origin-when-cross-origin",
		]);
		expect(headerValues(headers, "permissions-policy")).toEqual([
			"camera=(), microphone=(), geolocation=(), payment=(), usb=()",
		]);
		expect(headerValues(headers, "strict-transport-security")).toEqual([
			"max-age=31536000; includeSubDomains",
		]);
		expect(headerValues(headers, "x-powered-by")).toHaveLength(0);

		if (routePath === "/") {
			await expect(page.locator(".province-map")).toHaveAttribute(
				"data-map-status",
				"ready",
			);
		}

		expect(cspViolations).toEqual([]);
		expect(pageErrors).toEqual([]);
	});
}

test("CSP generates a distinct nonce per request", async ({ request }) => {
	const first = await request.get(new URL("/", baseUrl).href);
	const second = await request.get(new URL("/", baseUrl).href);
	const firstNonce = headerValues(
		first.headersArray(),
		"content-security-policy",
	)[0]?.match(/'nonce-([^']+)'/)?.[1];
	const secondNonce = headerValues(
		second.headersArray(),
		"content-security-policy",
	)[0]?.match(/'nonce-([^']+)'/)?.[1];
	expect(firstNonce).toBeTruthy();
	expect(secondNonce).toBeTruthy();
	expect(firstNonce).not.toBe(secondNonce);
});

test("/api/health emits single X-Frame-Options and X-Content-Type-Options values without X-Powered-By", async ({
	request,
}) => {
	const response = await request.get(new URL("/api/health", baseUrl).href);
	expect(response.status()).toBe(200);
	const headers = response.headersArray();
	expect(headerValues(headers, "x-frame-options")).toEqual(["DENY"]);
	expect(headerValues(headers, "x-content-type-options")).toEqual(["nosniff"]);
	expect(headerValues(headers, "x-powered-by")).toHaveLength(0);
});

test("/robots.txt disallows internal and api paths", async ({ request }) => {
	const response = await request.get(new URL("/robots.txt", baseUrl).href);
	expect(response.status()).toBe(200);
	const body = await response.text();
	expect(body).toContain("Disallow: /internal/");
	expect(body).toContain("Disallow: /api/");
});
