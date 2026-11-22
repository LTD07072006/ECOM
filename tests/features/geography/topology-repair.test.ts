import { expect, test } from "bun:test";
import { compareCohortPriority } from "../../../src/features/geography/cohort-policy";

test("manual An Giang boundary topology repair is explicitly allowlisted, area-bounded, and documented (ECOM-28)", async () => {
	const manifest = (await Bun.file("data/sprint1/manifest.json").json()) as {
		boundaries: {
			datasetCode?: string;
			sha256?: string;
			source?: { license?: string; citation?: string };
		};
	};
	expect(manifest.boundaries.datasetCode).toBe("VN_PROVINCE_BOUNDARIES");
	expect(manifest.boundaries.sha256).toMatch(/^[0-9a-f]{64}$/);
	expect(manifest.boundaries.source?.license).toBe("CC BY 3.0 IGO");
	expect(manifest.boundaries.source?.citation).toContain("An Giang");

	const prepScript = await Bun.file("scripts/prepare-sprint1-data.py").text();
	expect(prepScript).toContain('"91"');
	expect(prepScript).toContain("make_valid");
	expect(prepScript).toContain("0.01");
});

test("shared cohort policy applies deterministic SQL-parity tie-breakers (ECOM-33)", () => {
	const olderComplete = {
		periodEnd: "2024-12-31",
		coverage: 34,
		publishedAt: "2026-01-01T00:00:00Z",
		datasetId: "b",
		periodStart: "2024-01-01",
		scope: "total",
		unit: "%",
	};
	const newerPublished = {
		periodEnd: "2025-12-31",
		coverage: 34,
		publishedAt: "2026-06-01T00:00:00Z",
		datasetId: "b",
		periodStart: "2025-01-01",
		scope: "total",
		unit: "%",
	};
	const newerEarlierPublished = {
		...newerPublished,
		publishedAt: "2026-02-01T00:00:00Z",
		datasetId: "a",
	};
	const sorted = [olderComplete, newerEarlierPublished, newerPublished].sort(
		compareCohortPriority,
	);
	expect(sorted[0]).toBe(newerPublished);
	expect(sorted[1]).toBe(newerEarlierPublished);
	expect(sorted[2]).toBe(olderComplete);
});
