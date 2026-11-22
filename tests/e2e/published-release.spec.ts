import { expect, test } from "@playwright/test";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

test("published Sprint 1 release is visible through the real browser data flow", async ({
	page,
}) => {
	await page.goto(baseUrl);
	await expect(
		page.getByRole("heading", { name: "Vietnam Market Intelligence" }),
	).toBeVisible();
	await expect(page.locator(".province-map")).toHaveAttribute(
		"data-map-status",
		"ready",
	);
	await expect(
		page.getByRole("status").filter({ hasText: "Loading" }),
	).toHaveCount(0);
	await expect(
		page.getByText("34 of 34 provincial boundaries published."),
	).toBeVisible();

	const search = page.getByLabel("Find a place");
	await search.fill("ha noi");
	await page
		.getByRole("button", { name: "Hà Nội province · Việt Nam", exact: true })
		.click();

	const profile = page.getByTestId("geo-profile");
	await expect(profile).toContainText("Hà Nội");
	await expect(profile).toContainText("8,857,526 people");
	await expect(profile).toContainText("Average population");
	await expect(profile).not.toContainText("Population context");
});

test("Wave 2 layer controls and comparison use published sources", async ({
	page,
}) => {
	await page.goto(baseUrl);
	const layerControl = page.getByLabel("Colour provinces by");
	await expect(
		layerControl.locator("option").filter({ hasText: "GRDP per capita" }),
	).toHaveCount(1);
	await layerControl.selectOption({
		label: "GRDP growth · 2025 (estimated) · PL.V03.01-2025",
	});
	await expect(page.getByLabel("Indicator legend")).toContainText(
		"34 of 34 provinces",
	);
	await page.getByLabel("Civil airports").check();
	await expect(page.getByText("22 reference points")).toBeVisible();
	await page.getByLabel("Find a place").fill("ha noi");
	await page
		.getByRole("button", { name: "Hà Nội province · Việt Nam", exact: true })
		.click();
	await expect(page.getByTestId("geo-profile")).toContainText("Hà Nội");
	const legend = page.getByLabel("Indicator legend");
	await expect(legend).toContainText("Hà Nội");
	await expect(legend).toContainText("Quality: supported");
	await expect(legend).toContainText("Source:");
	await page.getByText("Compare sources", { exact: true }).click();
	await expect(
		page.getByText("Second minus first:", { exact: false }),
	).toBeVisible();
	await page.getByRole("combobox", { name: "Second source" }).selectOption({
		label: "Licensed FDI registered capital · 2025 · PL.V04.02-2025",
	});
	await expect(
		page.getByText("Numeric comparison requires", { exact: false }),
	).toBeVisible();
});

test("province map reaches ready state after repeated production reloads", async ({
	page,
}) => {
	const errors: string[] = [];
	page.on("pageerror", (error) => errors.push(error.message));
	page.on("console", (message) => {
		if (message.type() === "error") errors.push(message.text());
	});
	for (let attempt = 0; attempt < 10; attempt += 1) {
		await page.goto(baseUrl);
		await expect(page.locator(".province-map")).toHaveAttribute(
			"data-map-status",
			"ready",
			{ timeout: 10000 },
		);
	}
	expect(errors).toEqual([]);
});

test("province map recovers when animation frames resume", async ({ page }) => {
	await page.addInitScript(() => {
		const request = window.requestAnimationFrame.bind(window);
		const cancel = window.cancelAnimationFrame.bind(window);
		const queued = new Map<number, FrameRequestCallback>();
		let nextId = -1;
		let paused = true;
		window.requestAnimationFrame = (callback) => {
			if (!paused) return request(callback);
			const id = nextId--;
			queued.set(id, callback);
			return id;
		};
		window.cancelAnimationFrame = (id) => {
			if (id < 0) queued.delete(id);
			else cancel(id);
		};
		Object.assign(window, {
			resumeMapFrames: () => {
				paused = false;
				for (const callback of queued.values()) request(callback);
				queued.clear();
			},
		});
	});
	await page.goto(baseUrl);
	await expect(page.locator(".province-map canvas")).toBeAttached();
	await expect(page.locator(".province-map")).toHaveAttribute(
		"data-map-status",
		"loading",
	);
	await page.evaluate(() =>
		(window as unknown as { resumeMapFrames: () => void }).resumeMapFrames(),
	);
	await expect(page.locator(".province-map")).toHaveAttribute(
		"data-map-status",
		"ready",
		{ timeout: 10000 },
	);
});

test("boundary request failure exposes fallback instead of endless loading", async ({
	page,
}) => {
	await page.route("**/api/map/provinces", (route) =>
		route.fulfill({ status: 503, json: { error: "Unavailable" } }),
	);
	await page.goto(baseUrl);
	await expect(page.locator(".province-map")).toHaveAttribute(
		"data-map-status",
		"unavailable",
	);
	await expect(
		page.getByRole("status").filter({ hasText: "Use place search" }),
	).toBeVisible();
	await expect(page.getByLabel("Find a place")).toBeEnabled();
});
