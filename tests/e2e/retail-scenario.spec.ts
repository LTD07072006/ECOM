import { expect, test } from "@playwright/test";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

test("retail scenario filters and compares provinces before explaining why scoring is unavailable", async ({
	page,
}) => {
	await page.goto(baseUrl);
	await page.getByRole("link", { name: "Explore a retail scenario" }).click();
	await expect(
		page.getByRole("heading", { name: "Explore a retail market" }),
	).toBeVisible();
	const sector = page.getByRole("combobox", { name: "Sector", exact: true });
	await expect(async () => {
		await sector.selectOption("retail");
		await expect(sector).toHaveValue("retail");
	}).toPass();
	await expect(page.getByText("34 provinces match.")).toBeVisible();
	await page
		.getByLabel("Minimum retail sales and consumer services (billion VND)")
		.fill("999999999");
	await expect(page.getByText("0 provinces match.")).toBeVisible();
	await page.getByText("Why 34 provinces were excluded").click();
	await expect(page.getByText("below 999,999,999").first()).toBeVisible();
	await page
		.getByLabel("Minimum retail sales and consumer services (billion VND)")
		.clear();
	const places = page.getByRole("group", { name: "Provinces" });
	const hanoi = places.getByLabel("Hà Nội", { exact: true });
	await hanoi.focus();
	await hanoi.press("Space");
	await expect(hanoi).toBeChecked();
	const other = places.locator('input[type="checkbox"]:not(:checked)').first();
	await other.check();
	const comparison = page.getByRole("heading", {
		name: "Compare published context",
	});
	await expect(comparison).toBeVisible();
	await expect(page.getByRole("table")).toContainText("2025");
	await expect(page.getByRole("table")).toContainText("Cục Thống kê");
	await page
		.getByLabel("Comparison baseline")
		.selectOption({ label: "Hà Nội" });
	await expect(
		page
			.getByRole("table")
			.getByText("Difference from Hà Nội", { exact: false })
			.first(),
	).toBeVisible();
	await expect(
		page.getByRole("heading", { name: "Ask about selected provinces" }),
	).toBeVisible();
	await expect(page.getByRole("textbox", { name: "Sector" })).toHaveValue(
		"Retail",
	);
	await expect(
		page.getByText("No customer needs study is available", { exact: false }),
	).toBeVisible();
	await page
		.getByRole("button", { name: "Assess evidence and calculate" })
		.click();
	await expect(page.getByText("Assessment unavailable")).toBeVisible();
	await expect(
		page.getByText("Customer needs evidence with a segment", { exact: false }),
	).toBeVisible();
	await expect(
		page
			.getByText("this indicator is not approved for scoring", { exact: false })
			.first(),
	).toBeVisible();
	await page
		.getByRole("checkbox", {
			name: "Define the retail activity, customer segment and operating model.",
		})
		.check();
	await page.setViewportSize({ width: 390, height: 844 });
	expect(
		await page.evaluate(() => document.documentElement.scrollWidth),
	).toBeLessThanOrEqual(390);
});

test("switching VI and EN on / does not refetch map boundaries, shortlist batch, or comparison data", async ({
	page,
	request,
}) => {
	const [hanoiResponse, daNangResponse] = await Promise.all([
		request.get(`${baseUrl}/api/geographies?q=ha%20noi&level=province`),
		request.get(`${baseUrl}/api/geographies?q=da%20nang&level=province`),
	]);
	expect(hanoiResponse.ok()).toBe(true);
	expect(daNangResponse.ok()).toBe(true);
	const hanoi = (
		(await hanoiResponse.json()) as {
			data: Array<{ id: string; displayName: string }>;
		}
	).data.find((place) => place.displayName === "Hà Nội");
	const daNang = (
		(await daNangResponse.json()) as {
			data: Array<{ id: string; displayName: string }>;
		}
	).data.find((place) => place.displayName === "Đà Nẵng");
	expect(hanoi).toBeDefined();
	expect(daNang).toBeDefined();
	if (!hanoi || !daNang)
		throw new Error("Expected Hà Nội and Đà Nẵng provinces");

	let mapRequests = 0;
	let compareRequests = 0;
	let batchRequests = 0;
	let perIdRequests = 0;
	const watchedIds = new Set([hanoi.id, daNang.id]);
	page.on("request", (req) => {
		const { pathname } = new URL(req.url());
		if (pathname === "/api/map/provinces") mapRequests += 1;
		else if (pathname === "/api/geographies/compare") compareRequests += 1;
		else if (pathname === "/api/geographies/batch") batchRequests += 1;
		else if (pathname.startsWith("/api/geographies/")) {
			const tail = pathname.slice("/api/geographies/".length);
			if (watchedIds.has(tail)) perIdRequests += 1;
		}
	});

	await page.addInitScript(
		(ids: string[]) => {
			localStorage.setItem("investor-shortlist", JSON.stringify(ids));
		},
		[hanoi.id, daNang.id],
	);

	await page.goto(`${baseUrl}/?compare=${hanoi.id},${daNang.id}`);
	await expect(page.locator(".province-map")).toHaveAttribute(
		"data-map-status",
		"ready",
		{ timeout: 15_000 },
	);
	await expect(
		page.getByRole("region", { name: "Saved places" }),
	).toContainText("2 saved");
	await expect(
		page.getByRole("region", { name: "Place comparison" }).getByRole("table"),
	).toContainText("Hà Nội");

	const initialMapRequests = mapRequests;
	const initialCompareRequests = compareRequests;
	const initialBatchRequests = batchRequests;
	expect(initialMapRequests).toBeGreaterThanOrEqual(1);
	expect(initialCompareRequests).toBeGreaterThanOrEqual(1);
	expect(initialBatchRequests).toBeGreaterThanOrEqual(1);
	expect(perIdRequests).toBe(0);

	await page
		.getByRole("group", { name: "Language" })
		.getByRole("button", { name: "VI", exact: true })
		.click();
	await expect(page.getByRole("group", { name: "Ngôn ngữ" })).toBeVisible();
	await expect(
		page.getByRole("region", { name: "Địa bàn đã lưu" }),
	).toContainText("Đã lưu 2");
	await expect(
		page.getByRole("region", { name: "So sánh địa bàn" }).getByRole("table"),
	).toContainText("Hà Nội");

	await page
		.getByRole("group", { name: "Ngôn ngữ" })
		.getByRole("button", { name: "EN", exact: true })
		.click();
	await expect(page.getByRole("group", { name: "Language" })).toBeVisible();
	await expect(
		page.getByRole("region", { name: "Saved places" }),
	).toContainText("2 saved");
	await expect(
		page.getByRole("region", { name: "Place comparison" }).getByRole("table"),
	).toContainText("Hà Nội");
	await expect(page.locator(".province-map")).toHaveAttribute(
		"data-map-status",
		"ready",
	);

	expect(mapRequests).toBe(initialMapRequests);
	expect(compareRequests).toBe(initialCompareRequests);
	expect(batchRequests).toBe(initialBatchRequests);
	expect(perIdRequests).toBe(0);
});
