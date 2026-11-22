import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { en } from "../../src/lib/i18n/en";
import { vi } from "../../src/lib/i18n/vi";

test("shortlist UI exposes synchronized tray, comparison, and export actions", () => {
	const tray = readFileSync("src/features/shortlist/ShortlistTray.tsx", "utf8");
	const comparison = readFileSync(
		"src/features/comparison/ComparisonPanel.tsx",
		"utf8",
	);

	expect(tray).toContain("investor-shortlist-change");
	expect(comparison).toContain("/api/geographies/compare");
	expect(tray).toContain("/api/geographies/export");
	expect(tray).toContain("removeFromShortlist");
	expect(comparison).toContain('t("common.unavailable")');
	expect(comparison).toContain('t("comparison.note")');
	expect(en["common.unavailable"]).toBe("Unavailable");
	expect(en["comparison.note"]).toContain("Context only");
	expect(vi["common.unavailable"]).toBe("Không có dữ liệu");
});

test("shortlist button publishes changes for the tray", () => {
	const button = readFileSync(
		"src/features/shortlist/ShortlistButton.tsx",
		"utf8",
	);
	expect(button).toContain("investor-shortlist-change");
});

test("profile UI keeps dataset freshness and observation provenance visible", () => {
	const profile = readFileSync(
		"src/features/profile/GeoProfilePanel.tsx",
		"utf8",
	);
	expect(profile).toContain("administrativeDataset");
	expect(profile).toContain("observation.source.license");
	expect(profile).toContain("observation.unit");
	expect(profile).toContain("observation.periodStart");
});
