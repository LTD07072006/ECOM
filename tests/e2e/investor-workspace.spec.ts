import { expect, test } from "@playwright/test";
import { demoCatalog } from "../../src/db/seed-data";
import {
	compareProfiles,
	getProfile,
	searchGeographies,
} from "../../src/features/geography/domain";

const baseUrl = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

// Browser fixtures only: never publish the synthetic catalog to the database.
test.beforeEach(async ({ page }) => {
	await page.route("**/api/geographies**", async (route) => {
		const url = new URL(route.request().url());
		const tail = url.pathname.split("/").at(-1);
		if (tail === "geographies")
			return route.fulfill({
				json: {
					data: searchGeographies(demoCatalog, url.searchParams.get("q") ?? ""),
				},
			});
		if (tail === "compare") {
			const profiles = (url.searchParams.get("ids") ?? "")
				.split(",")
				.map((id) => getProfile(demoCatalog, id))
				.filter((p): p is NonNullable<typeof p> => p !== null);
			return route.fulfill({
				json: { data: { profiles, comparison: compareProfiles(profiles) } },
			});
		}
		if (tail === "export")
			return route.fulfill({
				body: JSON.stringify({ data: demoCatalog.geographies }),
				headers: {
					"Content-Type": "application/json",
					"Content-Disposition": 'attachment; filename="context.json"',
				},
			});
		const profile = getProfile(demoCatalog, tail ?? "");
		return route.fulfill({
			status: profile ? 200 : 404,
			json: profile
				? { data: profile }
				: { error: "Geography unit not found." },
		});
	});
});

test("investor can search, open a profile, inspect provenance, and save shortlist", async ({
	page,
}) => {
	await page.goto(baseUrl);
	await expect(
		page.getByRole("heading", { name: "Vietnam Market Intelligence" }),
	).toBeVisible();

	const search = page.getByLabel("Find a place");
	await search.fill("ha noi");
	await page.getByRole("button", { name: "Hà Nội province · Vietnam" }).click();

	await expect(page.getByTestId("geo-profile")).toContainText("Hà Nội");
	await expect(page.getByTestId("geo-profile")).toContainText(
		"No data available",
	);
	await page.getByText("Source and limitations").first().click();
	await expect(page.getByTestId("geo-profile")).toContainText("synthetic");

	await page.getByRole("button", { name: "Save to shortlist" }).click();
	await expect(
		page.getByRole("button", { name: "Saved to shortlist" }),
	).toBeVisible();
});

test("Sprint 2 saves two places, compares, downloads and synchronizes removal", async ({
	page,
}) => {
	await page.goto(baseUrl);
	await expect(
		page.getByRole("complementary", { name: "Geometry coverage" }),
	).toBeVisible();
	const search = page.getByLabel("Find a place");
	await search.fill("ha noi");
	await page
		.getByRole("button", { name: "Hà Nội province · Vietnam", exact: true })
		.click();
	await expect(page.getByTestId("geo-profile")).toContainText("people/km²");
	await page
		.getByRole("button", { name: "Save to shortlist", exact: true })
		.click();
	await search.fill("hai phong");
	await page
		.getByRole("button", { name: "Hải Phòng province · Vietnam", exact: true })
		.click();
	await page
		.getByRole("button", { name: "Save to shortlist", exact: true })
		.click();
	const tray = page.getByRole("region", { name: "Saved places" });
	await expect(tray).toContainText("2 saved");
	await tray.getByRole("button", { name: "Compare 2", exact: true }).click();
	const comparison = page.getByRole("region", { name: "Place comparison" });
	await expect(comparison.getByRole("table")).toContainText(
		"Population density",
	);
	await expect(comparison).toContainText("Context only");
	await expect(
		comparison.getByRole("cell", { name: "Unavailable", exact: true }),
	).toHaveCount(6);
	await comparison.getByRole("button", { name: "Close", exact: true }).click();
	const downloadPromise = page.waitForEvent("download");
	await tray
		.getByRole("button", { name: "Download JSON", exact: true })
		.click();
	expect((await downloadPromise).suggestedFilename()).toMatch(/\.json$/);
	await tray
		.getByRole("button", { name: "Remove Hải Phòng", exact: true })
		.click();
	await expect(
		page.getByRole("button", { name: "Save to shortlist", exact: true }),
	).toBeVisible();
	await expect(tray).toContainText("1 saved");
	await page.reload();
	await expect(tray).toContainText("Hà Nội");
});

test("stale saved IDs remain removable and storage events synchronize across tabs", async ({
	page,
}) => {
	await page.addInitScript(() =>
		localStorage.setItem(
			"investor-shortlist",
			JSON.stringify(["99999999-9999-4999-8999-999999999999"]),
		),
	);
	await page.goto(baseUrl);
	const tray = page.getByRole("region", { name: "Saved places" });
	await expect(tray).toContainText("no longer available");
	await tray
		.getByRole("button", { name: "Remove unavailable place", exact: true })
		.click();
	await expect(tray).toHaveCount(0);
});
