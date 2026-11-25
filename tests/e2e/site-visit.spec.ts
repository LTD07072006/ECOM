import { expect, test } from "@playwright/test";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

test.describe("site visit logistics workspace", () => {
	test("loads as an isolated tab with accessible controls and attribution", async ({
		page,
	}) => {
		const response = await page.goto(`${baseUrl}/site-visit`);
		expect(response?.status()).toBe(200);
		await expect(page.locator("#site-visit-main")).toBeVisible();
		await expect(
			page.getByLabel(/route destination|điểm đến tính tuyến/i),
		).toBeVisible();
		await expect(page.getByText(/WeMap/)).toBeVisible();
		await expect(page.locator(".province-map")).toHaveCount(0);
	});

	test("validates context endpoint and accepts itinerary sharing state", async ({
		page,
		request,
	}) => {
		const context = await request.get(
			`${baseUrl}/api/site-visit/context?lng=105.5294&lat=21.0042`,
		);
		expect(context.status()).toBe(200);
		const body = await context.json();
		expect(body.data.features.length).toBeGreaterThan(0);

		await page.goto(
			`${baseUrl}/site-visit?stops=Hoa%20Lac%7C105.5294%7C21.0042`,
		);
		await expect(
			page.getByRole("heading", { name: /itinerary|lộ trình/i }),
		).toBeVisible();
	});
});
