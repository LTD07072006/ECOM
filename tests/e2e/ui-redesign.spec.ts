import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { INQUIRY_NOTICE_VERSION } from "../../src/features/inquiries/privacy";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";
const evidenceDir = join(process.cwd(), "test-results", "ui-evidence");

function safeRouteSlug(route: string): string {
	return route === "/"
		? "home"
		: route.replace(/^\//, "").replace(/[^a-z0-9-]+/gi, "-");
}

test("a. P0: province map renders with non-zero bounding box on desktop and mobile", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1280, height: 800 });
	await page.goto(baseUrl);
	const map = page.locator(".province-map");
	await expect(map).toHaveAttribute("data-map-status", "ready", {
		timeout: 25_000,
	});
	const desktopBox = await map.boundingBox();
	expect(desktopBox).not.toBeNull();
	expect(desktopBox?.height ?? 0).toBeGreaterThanOrEqual(300);
	const desktopCanvasBox = await page
		.locator(".province-map canvas")
		.boundingBox();
	expect(desktopCanvasBox?.width ?? 0).toBeGreaterThan(0);
	expect(desktopCanvasBox?.height ?? 0).toBeGreaterThan(0);

	await page.setViewportSize({ width: 390, height: 844 });
	await page.waitForTimeout(200);
	const mobileBox = await map.boundingBox();
	expect(mobileBox).not.toBeNull();
	expect(mobileBox?.height ?? 0).toBeGreaterThanOrEqual(240);
	const mobileCanvasBox = await page
		.locator(".province-map canvas")
		.boundingBox();
	expect(mobileCanvasBox?.width ?? 0).toBeGreaterThan(0);
	expect(mobileCanvasBox?.height ?? 0).toBeGreaterThan(0);
});

test("b. no horizontal overflow and responsive evidence across key viewports", async ({
	page,
}) => {
	mkdirSync(evidenceDir, { recursive: true });
	const routes = [
		"/",
		"/decision",
		"/investor-guide",
		"/inquiries/status",
		"/privacy/inquiries",
		"/does-not-exist",
	];
	const widths = [390, 768, 1280, 1440];

	for (const route of routes) {
		for (const width of widths) {
			await page.setViewportSize({ width, height: 900 });
			await page.goto(`${baseUrl}${route}`);
			if (route === "/") {
				await expect(page.locator(".province-map")).toHaveAttribute(
					"data-map-status",
					"ready",
					{ timeout: 25_000 },
				);
				await page.waitForTimeout(350);
			} else {
				await page.waitForLoadState("networkidle");
			}
			const metrics = await page.evaluate(() => ({
				scrollWidth: document.documentElement.scrollWidth,
				innerWidth: window.innerWidth,
			}));
			expect(
				metrics.scrollWidth,
				`route=${route} width=${width} scrollWidth=${metrics.scrollWidth} innerWidth=${metrics.innerWidth}`,
			).toBeLessThanOrEqual(metrics.innerWidth);

			await page.screenshot({
				path: join(evidenceDir, `${safeRouteSlug(route)}-${width}.png`),
				fullPage: false,
			});
		}
	}
});

test("c. keyboard skip link focuses main content", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 });
	await page.goto(baseUrl);
	await page.keyboard.press("Tab");
	const skipFocused = await page.evaluate(() =>
		document.activeElement?.classList.contains("skip-link"),
	);
	expect(skipFocused).toBe(true);
	await page.keyboard.press("Enter");
	const inMain = await page.evaluate(() => {
		const active = document.activeElement;
		return active?.tagName === "MAIN" || active?.closest("main") !== null;
	});
	expect(inMain).toBe(true);
});

test("d. focus-visible outlines are solid >= 2px across nav, search, and province rail", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1280, height: 800 });
	await page.goto(baseUrl);
	await expect(page.locator(".province-map")).toHaveAttribute(
		"data-map-status",
		"ready",
		{ timeout: 25_000 },
	);

	// Enter keyboard focus modality via Tab, then focus key interactive controls
	await page.keyboard.press("Tab");
	await page.keyboard.press("Tab"); // brand link
	await page.keyboard.press("Tab"); // nav link
	const navOutline = await page.evaluate(() => {
		const el = document.activeElement as HTMLElement | null;
		if (!el) return null;
		const style = getComputedStyle(el);
		return {
			tag: el.tagName,
			outlineStyle: style.outlineStyle,
			outlineWidth: Number.parseFloat(style.outlineWidth),
		};
	});
	expect(navOutline?.outlineStyle).toBe("solid");
	expect(navOutline?.outlineWidth ?? 0).toBeGreaterThanOrEqual(2);

	await page.locator("#geo-search-input").focus();
	await page.keyboard.press("Shift+Tab");
	await page.keyboard.press("Tab");
	const searchOutline = await page.evaluate(() => {
		const el = document.getElementById("geo-search-input");
		if (!el) return null;
		const style = getComputedStyle(el);
		return {
			activeId: document.activeElement?.id,
			outlineStyle: style.outlineStyle,
			outlineWidth: Number.parseFloat(style.outlineWidth),
		};
	});
	expect(searchOutline?.activeId).toBe("geo-search-input");
	expect(searchOutline?.outlineStyle).toBe("solid");
	expect(searchOutline?.outlineWidth ?? 0).toBeGreaterThanOrEqual(2);

	const firstProvinceRow = page.locator(".province-row").first();
	await firstProvinceRow.focus();
	const railOutline = await firstProvinceRow.evaluate((el) => {
		const style = getComputedStyle(el);
		return {
			outlineStyle: style.outlineStyle,
			outlineWidth: Number.parseFloat(style.outlineWidth),
		};
	});
	expect(railOutline.outlineStyle).toBe("solid");
	expect(railOutline.outlineWidth).toBeGreaterThanOrEqual(2);
});

test("e. interactive target sizes meet 24x24 minimum and 44px primary control minimum on 390x844", async ({
	page,
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto(baseUrl);
	await expect(page.locator(".province-map")).toHaveAttribute(
		"data-map-status",
		"ready",
		{ timeout: 25_000 },
	);

	const violations = await page.evaluate(() => {
		const bad: Array<{ selector: string; width: number; height: number }> = [];
		const nodes = document.querySelectorAll(
			"header button, header a, header input, header select, main button, main a, main input, main select",
		);
		for (const node of nodes) {
			if (
				node.classList.contains("skip-link") ||
				node.closest(".maplibregl-ctrl")
			) {
				continue;
			}
			const style = getComputedStyle(node);
			if (style.display === "none" || style.visibility === "hidden") continue;
			const target =
				node instanceof HTMLInputElement &&
				(node.type === "checkbox" || node.type === "radio")
					? (node.closest("label") ?? node)
					: node;
			const rect = target.getBoundingClientRect();
			if (rect.width === 0 && rect.height === 0) continue;
			if (rect.width < 23.5 || rect.height < 23.5) {
				bad.push({
					selector: `${node.tagName.toLowerCase()}.${Array.from(node.classList).join(".")}`,
					width: rect.width,
					height: rect.height,
				});
			}
		}
		return bad;
	});
	expect(violations).toEqual([]);

	const primaryHeights = await page.evaluate(() => {
		const search = document
			.getElementById("geo-search-input")
			?.getBoundingClientRect();
		const cta = document
			.querySelector("header .btn-cta")
			?.getBoundingClientRect();
		return {
			searchHeight: search?.height ?? 0,
			ctaHeight: cta?.height ?? 0,
		};
	});
	expect(primaryHeights.searchHeight).toBeGreaterThanOrEqual(44);
	expect(primaryHeights.ctaHeight).toBeGreaterThanOrEqual(44);
});

test("f. typography loads self-hosted Be_Vietnam_Pro with safe tracking and Vietnamese glyphs", async ({
	page,
}) => {
	await page.goto(baseUrl);
	const typography = await page.evaluate(async () => {
		await document.fonts.ready;
		const bodyStyle = getComputedStyle(document.body);
		const h1 = document.querySelector("h1");
		const h2 = document.querySelector("h2");
		const h1Style = h1 ? getComputedStyle(h1) : null;
		const h2Style = h2 ? getComputedStyle(h2) : null;
		const primaryFamily = bodyStyle.fontFamily.split(",")[0]?.trim() ?? "";
		const glyphsLoaded = primaryFamily
			? document.fonts.check(`16px ${primaryFamily}`, "Hồ Chí Minh tỷ đồng")
			: false;
		const trackingRatio = (style: CSSStyleDeclaration | null) => {
			if (!style) return 0;
			const ls =
				style.letterSpacing === "normal"
					? 0
					: Number.parseFloat(style.letterSpacing);
			const fs = Number.parseFloat(style.fontSize);
			return fs > 0 ? ls / fs : 0;
		};
		return {
			bodyFont: bodyStyle.fontFamily,
			h1Font: h1Style?.fontFamily ?? "",
			glyphsLoaded,
			h1Ratio: trackingRatio(h1Style),
			h2Ratio: trackingRatio(h2Style),
		};
	});
	expect(typography.bodyFont).toMatch(/Be_Vietnam_Pro|Be Vietnam Pro/i);
	expect(typography.h1Font).toMatch(/Be_Vietnam_Pro|Be Vietnam Pro/i);
	expect(typography.glyphsLoaded).toBe(true);
	expect(typography.h1Ratio).toBeGreaterThanOrEqual(-0.02);
	expect(typography.h2Ratio).toBeGreaterThanOrEqual(-0.02);
});

test("g. exonym search aliases, keyboard navigation, and empty state guidance work", async ({
	page,
}) => {
	await page.goto(baseUrl);
	const search = page.getByLabel("Find a place");

	for (const [query, expected] of [
		["Hanoi", "Hà Nội"],
		["HCMC", "Hồ Chí Minh"],
		["Saigon", "Hồ Chí Minh"],
		["Danang", "Đà Nẵng"],
	] as const) {
		await search.fill(query);
		await expect(
			page.locator(".search-results button strong").first(),
		).toContainText(expected);
	}

	await search.fill("Sài Gòn");
	await expect(
		page.locator(".search-results button strong").first(),
	).toContainText("Hồ Chí Minh");
	await expect(
		page
			.locator(".search-results button strong")
			.filter({ hasText: "Phường Sài Gòn" }),
	).toBeVisible();

	await search.fill("Hanoi");
	await expect(page.locator(".search-results button").first()).toBeVisible();
	await search.press("ArrowDown");
	await search.press("Enter");
	await expect(page.getByTestId("geo-profile")).toContainText("Hà Nội");

	await search.fill("Hanoi");
	await expect(page.locator(".search-results button").first()).toBeVisible();
	await search.press("Escape");
	await expect(page.locator(".search-results")).toHaveCount(0);

	await search.fill("zzzz-no-such-province-999");
	await expect(
		page.getByText("Try a province name", { exact: false }),
	).toBeVisible();
});

test("h. comparison panel closes on Escape and restores focus to trigger", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1280, height: 800 });
	await page.goto(baseUrl);

	const search = page.getByLabel("Find a place");
	await search.fill("Hanoi");
	await page
		.locator(".search-results button", { hasText: "Hà Nội" })
		.first()
		.click();
	await expect(page.getByTestId("geo-profile")).toContainText("Hà Nội");
	await page.getByRole("button", { name: "Save to shortlist" }).click();

	await search.fill("Danang");
	await page
		.locator(".search-results button", { hasText: "Đà Nẵng" })
		.first()
		.click();
	await expect(page.getByTestId("geo-profile")).toContainText("Đà Nẵng");
	await page.getByRole("button", { name: "Save to shortlist" }).click();

	const compareBtn = page.getByRole("button", { name: /^Compare 2/ });
	await compareBtn.click();
	const comparisonRegion = page.getByRole("region", {
		name: "Place comparison",
	});
	await expect(comparisonRegion).toBeVisible();
	await page.keyboard.press("Escape");
	await expect(comparisonRegion).toHaveCount(0);
	const restored = await page.evaluate(
		() => document.activeElement?.textContent ?? "",
	);
	expect(restored).toContain("Compare 2");
});

test("i. destructive actions are secondary/destructive styled and require confirmation or offer undo", async ({
	page,
}) => {
	await page.goto(`${baseUrl}/decision`);
	await page.getByRole("combobox", { name: "Sector" }).selectOption("retail");
	const resetBtn = page.getByRole("button", { name: "Reset saved scenario" });
	await expect(resetBtn).not.toHaveClass(/\bbtn-primary\b/);
	await expect(resetBtn).toHaveClass(/\bbtn-destructive\b/);
	await resetBtn.click();
	await expect(
		page.getByRole("button", { name: "Confirm reset" }),
	).toBeVisible();
	await page.getByRole("button", { name: "Cancel" }).click();

	await page.goto(baseUrl);
	await page.locator(".province-row").first().click();
	await expect(page.getByTestId("geo-profile")).toBeVisible();
	await page.getByRole("button", { name: "Show regional comparison" }).click();
	await page.getByRole("button", { name: "Add current province" }).click();
	await page.getByLabel("Name this comparison").fill("North anchor");
	await page.getByRole("button", { name: "Save on this device" }).click();
	const deleteSavedBtn = page.getByRole("button", { name: "Delete" }).first();
	await expect(deleteSavedBtn).not.toHaveClass(/\bbtn-primary\b/);
	await expect(deleteSavedBtn).toHaveClass(/\bbtn-destructive\b/);
	await deleteSavedBtn.click();
	await expect(page.getByRole("button", { name: "Confirm" })).toBeVisible();
	await page.getByRole("button", { name: "Cancel" }).click();

	const clearBtn = page.getByRole("button", { name: "Clear regions" });
	await expect(clearBtn).not.toHaveClass(/\bbtn-primary\b/);
	await clearBtn.click();
	await expect(page.getByText("Regions cleared.")).toBeVisible();
	await page.getByRole("button", { name: "Undo" }).click();
	await expect(page.getByText("Regions cleared.")).toHaveCount(0);
});

test("j. 404 route returns status 404 and includes navigation back to /", async ({
	page,
}) => {
	const response = await page.goto(`${baseUrl}/does-not-exist`);
	expect(response?.status()).toBe(404);
	await expect(
		page.getByRole("heading", { name: "Page not found" }),
	).toBeVisible();
	await expect(
		page.locator('main a[href="/"]', { hasText: /Return to map/i }),
	).toBeVisible();
});

test("k. /decision assess button is disabled upfront with visible eligibility reason", async ({
	page,
}) => {
	await page.goto(`${baseUrl}/decision`);
	await page.getByRole("combobox", { name: "Sector" }).selectOption("retail");
	const assessBtn = page.getByRole("button", {
		name: "Assess evidence and calculate",
	});
	await expect(assessBtn).toBeDisabled();
	await expect(page.getByText("Assessment unavailable")).toBeVisible();
	await expect(
		page.getByText("Select two or three different provinces.", {
			exact: false,
		}),
	).toBeVisible();
	await expect(
		page.getByText("Customer needs evidence with a segment", { exact: false }),
	).toBeVisible();
});

test("l. LocaleSwitcher lives inside header banner and does not overlap at 390px", async ({
	page,
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto(baseUrl);
	const banner = page.getByRole("banner");
	const switcher = banner.getByRole("group", { name: "Language" });
	await expect(switcher).toBeVisible();

	const overlap = await page.evaluate(() => {
		const group = document.querySelector("header .locale-switcher");
		if (!group) return { found: false, overlaps: true };
		const groupRect = group.getBoundingClientRect();
		const others = Array.from(
			document.querySelectorAll("header a, header button.btn-cta"),
		);
		const overlaps = others.some((el) => {
			const r = el.getBoundingClientRect();
			return !(
				r.right <= groupRect.left ||
				r.left >= groupRect.right ||
				r.bottom <= groupRect.top ||
				r.top >= groupRect.bottom
			);
		});
		return { found: true, overlaps };
	});
	expect(overlap.found).toBe(true);
	expect(overlap.overlaps).toBe(false);
});

test("m. /inquiries/status never exposes internal Spam label publicly", async ({
	page,
}) => {
	await page.route("**/api/inquiries/status", (route) =>
		route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				data: {
					referenceCode: "INQ-2026-0000DEAD",
					status: "closed",
					closeReason: "spam",
					submittedAt: "2026-11-23T09:00:00.000Z",
					updatedAt: "2026-11-23T10:00:00.000Z",
					geographyCount: 1,
					timeline: [
						{
							action: "submitted",
							fromStatus: null,
							toStatus: "new",
							happenedAt: "2026-11-23T09:00:00.000Z",
						},
						{
							action: "status_changed",
							fromStatus: "new",
							toStatus: "closed",
							happenedAt: "2026-11-23T10:00:00.000Z",
						},
					],
				},
			}),
		}),
	);
	await page.goto(`${baseUrl}/inquiries/status`);
	await page.getByLabel("Reference code").fill("INQ-2026-0000DEAD");
	await page.getByLabel("Submission email").fill("test@example.com");
	await page.getByRole("button", { name: "Check status" }).click();
	await expect(
		page.getByRole("heading", { name: "INQ-2026-0000DEAD" }),
	).toBeVisible();
	await expect(page.getByRole("main")).not.toContainText(/\bSpam\b/i);
});

test("n. computed text and search placeholder contrast meet >= 4.5:1", async ({
	page,
}) => {
	await page.goto(baseUrl);
	const ratios = await page.evaluate(() => {
		function parseRgb(input: string): [number, number, number] {
			const match = input.match(/\d+/g);
			if (!match || match.length < 3) return [0, 0, 0];
			return [Number(match[0]), Number(match[1]), Number(match[2])];
		}
		function luminance([r, g, b]: [number, number, number]) {
			const ch = [r, g, b].map((v) => {
				const s = v / 255;
				return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
			});
			return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
		}
		function contrast(fg: string, bg: string) {
			const l1 = luminance(parseRgb(fg));
			const l2 = luminance(parseRgb(bg));
			return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
		}
		function opaqueBg(el: Element | null): string {
			let cur: Element | null = el;
			while (cur) {
				const bg = getComputedStyle(cur).backgroundColor;
				if (bg && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)") return bg;
				cur = cur.parentElement;
			}
			return "rgb(255, 255, 255)";
		}

		const bodyColor = getComputedStyle(document.body).color;
		const bodyBg = opaqueBg(document.body);
		const searchInput = document.getElementById("geo-search-input");
		const placeholderColor = searchInput
			? getComputedStyle(searchInput, "::placeholder").color
			: bodyColor;
		const inputBg = opaqueBg(searchInput);

		return {
			bodyContrast: contrast(bodyColor, bodyBg),
			placeholderContrast: contrast(placeholderColor, inputBg),
		};
	});
	expect(ratios.bodyContrast).toBeGreaterThanOrEqual(4.5);
	expect(ratios.placeholderContrast).toBeGreaterThanOrEqual(4.5);
});

test("o. prefers-reduced-motion zeroes transitions and animations on overprint elements", async ({
	browser,
}) => {
	const context = await browser.newContext({ reducedMotion: "reduce" });
	const page = await context.newPage();
	await page.goto(baseUrl);
	const durations = await page.evaluate(() => {
		const els = Array.from(document.querySelectorAll(".overprint-transition"));
		return els.map((el) => {
			const s = getComputedStyle(el);
			return {
				transition: Number.parseFloat(s.transitionDuration) || 0,
				animation: Number.parseFloat(s.animationDuration) || 0,
			};
		});
	});
	expect(durations.length).toBeGreaterThan(0);
	for (const entry of durations) {
		expect(entry.transition).toBe(0);
		expect(entry.animation).toBe(0);
	}
	await context.close();
});

test("p. internal /internal/inquiries keeps layout clean, tabular headers present, and erasure confirmation guarded", async ({
	page,
	request,
}) => {
	const stewardToken = process.env.E2E_RELEASE_STEWARD_TOKEN;
	test.skip(!stewardToken, "Set E2E_RELEASE_STEWARD_TOKEN for internal E2E.");
	if (!stewardToken) return;

	const catalog = await request.get(
		`${baseUrl}/api/geographies?q=ha+noi&level=province`,
	);
	expect(catalog.ok()).toBe(true);
	const { data: provinces } = (await catalog.json()) as {
		data: { code: string; id: string }[];
	};
	const hanoi = provinces.find(({ code }) => code === "01");
	expect(hanoi).toBeDefined();
	if (!hanoi) throw new Error("Expected Hanoi province");

	const sector = `E2E UI guard ${randomUUID()}`;
	const email = "ui-guard-e2e@example.test";
	const message = "Synthetic E2E inquiry to verify erasure confirm dismissal.";
	const submitted = await request.post(`${baseUrl}/api/inquiries`, {
		data: {
			email,
			message,
			sector,
			geographyIds: [hanoi.id],
			consent: true,
			noticeVersion: INQUIRY_NOTICE_VERSION,
		},
	});
	expect(submitted.status()).toBe(201);
	const { referenceCode } = (await submitted.json()) as {
		referenceCode: string;
	};

	await page.goto(`${baseUrl}/internal/inquiries`);
	await page.getByLabel("Steward token").fill(stewardToken);
	await page.getByRole("button", { name: "Đăng nhập phiên (cookie)" }).click();
	await expect(page.getByText(/Đang đăng nhập:/)).toBeVisible();

	for (const width of [1280, 390]) {
		await page.setViewportSize({ width, height: 900 });
		const metrics = await page.evaluate(() => ({
			scrollWidth: document.documentElement.scrollWidth,
			innerWidth: window.innerWidth,
		}));
		expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth);
	}

	await page.setViewportSize({ width: 1280, height: 900 });
	await page.getByLabel("Lĩnh vực", { exact: true }).fill(sector);
	await page.getByRole("button", { name: "Tải danh sách" }).click();
	const table = page.getByRole("table", { name: "Danh sách yêu cầu" });
	await expect(table.locator("th").first()).toBeVisible();

	await table.getByRole("button", { name: referenceCode, exact: true }).click();
	const detail = page.getByRole("article").filter({
		has: page.getByRole("heading", { name: referenceCode, exact: true }),
	});
	await expect(detail).toContainText(email);

	const privacySection = detail.getByRole("region", {
		name: "Yêu cầu quyền riêng tư",
	});
	await privacySection.getByLabel("Mã ticket").fill("DSAR-UI-GUARD-001");
	const eraseBtn = privacySection.getByRole("button", {
		name: "Ẩn danh dữ liệu cá nhân",
	});
	await expect(eraseBtn).not.toHaveClass(/\bbtn-primary\b/);
	await expect(eraseBtn).toHaveClass(/\bbtn-destructive\b/);

	const erasureRequests: string[] = [];
	page.on("request", (req) => {
		if (
			new URL(req.url()).pathname ===
			`/api/internal/inquiries/${referenceCode}/erasure`
		) {
			erasureRequests.push(req.url());
		}
	});

	let dialogType: string | null = null;
	page.once("dialog", async (dialog) => {
		dialogType = dialog.type();
		await dialog.dismiss();
	});
	await eraseBtn.click();
	expect(dialogType).toBe("confirm");
	await page.waitForTimeout(250);
	expect(erasureRequests).toHaveLength(0);
	await expect(detail).toContainText(email);
});

test("q. layer selector matches active choropleth and boundaries-only mode persists across reload", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto(baseUrl);
	await expect(page.locator(".province-map")).toHaveAttribute(
		"data-map-status",
		"ready",
		{ timeout: 25_000 },
	);

	const layerSelect = page.getByLabel("Colour provinces by");
	const popValue = await layerSelect.evaluate((select) => {
		const option = [...(select as HTMLSelectElement).options].find((item) =>
			item.textContent?.includes("Average population"),
		);
		return option?.value ?? "";
	});
	expect(popValue).not.toBe("");
	await expect(layerSelect).toHaveValue(popValue);
	await expect(page).not.toHaveURL(/layer=/);

	const legend = page.getByLabel("Indicator legend");
	await expect(legend).toContainText("Average population");
	await expect(legend).toContainText("people");
	const legendText = await legend.innerText();
	expect(legendText).not.toContain("VN_ADMIN_2025_07");
	// Integer layer thresholds should not display decimal fractions
	expect(legendText).not.toMatch(/\d+\.\d+\s*–|\s*–\s*\d+\.\d+/);

	await layerSelect.selectOption("boundaries");
	await expect(page).toHaveURL(/layer=boundaries/);
	await expect(legend).toContainText("Administrative boundaries");
	await expect(legend).toContainText("outlines only");
	await expect(
		page.locator('.family-switch-btn[aria-pressed="true"]'),
	).toHaveCount(0);

	await page.reload();
	await expect(page.locator(".province-map")).toHaveAttribute(
		"data-map-status",
		"ready",
		{ timeout: 25_000 },
	);
	await expect(page).toHaveURL(/layer=boundaries/);
	await expect(page.getByLabel("Colour provinces by")).toHaveValue(
		"boundaries",
	);
	await expect(page.getByLabel("Indicator legend")).toContainText(
		"Administrative boundaries",
	);
});

test("r. mobile search input appears in first viewport and precedes map controls in keyboard Tab order", async ({
	page,
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto(baseUrl);
	await expect(page.locator(".province-map")).toHaveAttribute(
		"data-map-status",
		"ready",
		{ timeout: 25_000 },
	);

	const searchBox = await page.locator("#geo-search-input").boundingBox();
	expect(searchBox).not.toBeNull();
	expect(searchBox?.y ?? 9999).toBeLessThanOrEqual(400);

	// Tabbing out of the header must reach #geo-search-input before any map control
	const headerCta = page.locator("header .btn-cta");
	await headerCta.focus();
	await page.keyboard.press("Tab");
	const activeId = await page.evaluate(() => document.activeElement?.id ?? "");
	expect(activeId).toBe("geo-search-input");
});
