import { expect, test } from "@playwright/test";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

test("/investor-guide roadmap switches tracks, persists checklist in localStorage, and stays responsive", async ({
	page,
}) => {
	await page.goto(`${baseUrl}/investor-guide`);
	const roadmap = page.getByTestId("fdi-licensing-roadmap");
	await expect(roadmap).toBeVisible();

	await expect(
		roadmap.getByRole("checkbox", {
			name: /Investment Registration Certificate \(IRC\)/i,
		}),
	).toBeVisible();
	await expect(
		roadmap.getByRole("checkbox", { name: /Investment Policy Approval/i }),
	).toHaveCount(0);

	await roadmap
		.getByRole("button", {
			name: /Manufacturing outside Industrial Park/i,
		})
		.click();

	const policyCheckbox = roadmap.getByRole("checkbox", {
		name: /Investment Policy Approval/i,
	});
	await expect(policyCheckbox).toBeVisible();
	await policyCheckbox.check();
	await expect(policyCheckbox).toBeChecked();

	await page.reload();
	await expect(
		page
			.getByTestId("fdi-licensing-roadmap")
			.getByRole("checkbox", { name: /Investment Policy Approval/i }),
	).toBeChecked();

	await page.setViewportSize({ width: 375, height: 812 });
	const scrollWidth = await page.evaluate(
		() => document.documentElement.scrollWidth,
	);
	expect(scrollWidth).toBeLessThanOrEqual(375);
});

test("home workspace toggles VI <-> EN cleanly and holds desktop/mobile viewport bounds", async ({
	page,
}) => {
	const pageErrors: string[] = [];
	page.on("pageerror", (error) => pageErrors.push(error.message));

	await page.setViewportSize({ width: 1440, height: 900 });
	await page.goto(baseUrl);
	await expect(
		page.getByRole("heading", { name: "Vietnam Market Intelligence" }),
	).toBeVisible();

	const desktopWidth = await page.evaluate(
		() => document.documentElement.scrollWidth,
	);
	expect(desktopWidth).toBeLessThanOrEqual(1440);

	await page.getByRole("button", { name: "VI", exact: true }).click();
	await expect(page.locator("html")).toHaveAttribute("lang", "vi");

	await page.getByRole("button", { name: "EN", exact: true }).click();
	await expect(page.locator("html")).toHaveAttribute("lang", "en");

	await page.setViewportSize({ width: 375, height: 812 });
	const mobileWidth = await page.evaluate(
		() => document.documentElement.scrollWidth,
	);
	expect(mobileWidth).toBeLessThanOrEqual(375);
	expect(pageErrors).toEqual([]);
});

test("/decision compares provinces and renders CapexOpexSimulator without horizontal overflow", async ({
	page,
}) => {
	await page.goto(`${baseUrl}/decision`);
	await page.waitForLoadState("networkidle");

	const sector = page.getByRole("combobox", { name: "Sector", exact: true });
	await sector.selectOption("retail");

	const places = page.getByRole("group", { name: "Provinces" });
	await places.getByLabel("Hà Nội City", { exact: true }).check();
	await places.locator('input[type="checkbox"]:not(:checked)').first().check();

	await expect(
		page.getByRole("heading", { name: "Compare published context" }),
	).toBeVisible();

	const simulator = page.locator("section.cost-simulator");
	await expect(simulator).toBeVisible();
	await expect(simulator).toContainText("Advisory Estimate Only");

	await page.setViewportSize({ width: 390, height: 844 });
	const scrollWidth = await page.evaluate(
		() => document.documentElement.scrollWidth,
	);
	expect(scrollWidth).toBeLessThanOrEqual(390);
});
