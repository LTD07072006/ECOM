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
		const canvas = page.locator(".site-visit-map canvas");
		await expect(canvas).toBeVisible();
		expect((await canvas.boundingBox())?.height).toBeGreaterThan(300);
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

	test("shows logistics network controls after selecting a candidate", async ({
		page,
	}) => {
		await page.goto(`${baseUrl}/site-visit?label=Test%20site&lng=105.8&lat=21`);
		await expect(
			page.getByRole("heading", { name: /connections from this site/i }),
		).toBeVisible();
		await expect(page.getByText(/0\/20/)).toBeVisible();
		await expect(
			page.getByRole("button", { name: /calculate logistics network/i }),
		).toBeDisabled();
	});

	test("restores and updates a shared pinned location from the map", async ({
		page,
	}) => {
		await page.goto(
			`${baseUrl}/site-visit?label=Shared%20site&lng=105.8&lat=21`,
		);
		await expect(page.locator(".site-visit-candidate-marker")).toBeVisible();
		await expect(page.locator(".site-visit-map-hint")).toContainText(/click/i);

		const marker = page.locator(".site-visit-candidate-marker");
		const markerBox = await marker.boundingBox();
		expect(markerBox).not.toBeNull();
		if (!markerBox) return;
		await page.mouse.move(
			markerBox.x + markerBox.width / 2,
			markerBox.y + markerBox.height / 2,
		);
		await page.mouse.down();
		await page.mouse.move(markerBox.x + 36, markerBox.y + 24);
		await page.mouse.up();
		const movedUrl = new URL(page.url());
		expect(movedUrl.searchParams.get("label")).toBe("Shared site");
		expect(Number(movedUrl.searchParams.get("lng"))).toBeCloseTo(105.8, 1);
		expect(Number(movedUrl.searchParams.get("lat"))).toBeCloseTo(21, 1);

		const canvas = page.locator(".site-visit-map canvas");
		const canvasBox = await canvas.boundingBox();
		expect(canvasBox).not.toBeNull();
		if (!canvasBox) return;
		await page.mouse.click(
			canvasBox.x + canvasBox.width - 80,
			canvasBox.y + 80,
		);
		await expect(
			page.getByText("Pinned location", { exact: true }),
		).toBeVisible();
		expect(new URL(page.url()).searchParams.get("label")).toBe(
			"Pinned location",
		);
	});

	test("selecting a calculated logistics row updates the map selection state", async ({
		page,
	}) => {
		await page.route("**/api/site-visit/route**", async (route) => {
			const requestUrl = new URL(route.request().url());
			const longitude = Number(requestUrl.searchParams.get("lng"));
			const latitude = Number(requestUrl.searchParams.get("lat"));
			await route.fulfill({
				json: {
					data: {
						mode: "live",
						distanceMeters: 18_000,
						durationSeconds: 1_800,
						provider: "test-router",
						fallback: false,
						geometry: {
							type: "LineString",
							coordinates: [
								[longitude, latitude],
								[longitude + 0.1, latitude + 0.1],
							],
						},
					},
				},
			});
		});
		await page.goto(`${baseUrl}/site-visit?label=Test%20site&lng=105.8&lat=21`);
		const network = page.getByRole("region", {
			name: "Connections from this site",
		});
		await network.getByRole("checkbox").first().check();
		await network
			.getByRole("button", { name: "Calculate logistics network" })
			.click();
		const rowLink = page.locator(".site-visit-matrix-link").first();
		await expect(rowLink).toBeVisible();
		const destinationCode = await rowLink.getAttribute("data-destination-code");
		expect(destinationCode).toBeTruthy();
		await rowLink.click();
		await expect(rowLink).toHaveAttribute("aria-current", "true");
		await expect(page.locator(".site-visit-map")).toHaveAttribute(
			"data-selected-destination",
			destinationCode ?? "",
		);
	});

	test("changing network destinations cancels an outdated calculation", async ({
		page,
	}) => {
		let releaseResponse = () => {};
		const held = new Promise<void>((resolve) => {
			releaseResponse = resolve;
		});
		await page.route("**/api/site-visit/route?*", async (route) => {
			await held;
			await route.fulfill({
				json: {
					data: {
						mode: "baseline",
						distanceMeters: 1000,
						durationSeconds: 60,
						provider: "dated-baseline",
						fallback: true,
					},
				},
			});
		});
		try {
			await page.goto(
				`${baseUrl}/site-visit?label=Test%20site&lng=105.8&lat=21`,
			);
			const network = page.getByRole("region", {
				name: "Connections from this site",
			});
			const destination = network.getByRole("checkbox").first();
			await destination.check();
			await Promise.all([
				page.waitForRequest(
					(request) =>
						new URL(request.url()).pathname === "/api/site-visit/route",
				),
				network
					.getByRole("button", { name: "Calculate logistics network" })
					.click(),
			]);
			await destination.uncheck();
			await expect(
				network.getByRole("button", { name: "Calculate logistics network" }),
			).toBeDisabled();
			await expect(
				network.getByText("0 baseline", { exact: true }),
			).toBeVisible();
		} finally {
			releaseResponse();
		}
	});
});
