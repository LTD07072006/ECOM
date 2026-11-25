import { expect, test } from "@playwright/test";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

test("observability page protects metrics from anonymous users", async ({
	page,
	request,
}) => {
	const metrics = await request.get(
		`${baseUrl}/api/internal/observability?hours=6`,
	);
	expect(metrics.status()).toBe(401);
	const response = await page.goto(`${baseUrl}/internal/observability`);
	expect(response?.status()).toBe(200);
	await expect(page.locator("#observability-main")).toBeVisible();
	await expect(page.getByText(/Production observability/i)).toBeVisible();
});
