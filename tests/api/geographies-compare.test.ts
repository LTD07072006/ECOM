import { afterEach, beforeEach, expect, spyOn, test } from "bun:test";
import { GET } from "../../src/app/api/geographies/compare/route";
import { demoCatalog } from "../../src/db/seed-data";
import * as catalog from "../../src/features/geography/catalog";

let loader: ReturnType<
	typeof spyOn<typeof catalog, "loadComparablePublicCatalog">
>;
beforeEach(() => {
	loader = spyOn(catalog, "loadComparablePublicCatalog").mockResolvedValue({
		...demoCatalog,
		availablePeriods: ["2025"],
		selectedPeriod: null,
	});
});
afterEach(() => loader.mockRestore());

const ids = demoCatalog.geographies
	.slice(1, 3)
	.map((geo) => geo.id)
	.join(",");

test("comparison API returns two profiles and provenance-aware context rows", async () => {
	const response = await GET(
		new Request(`http://localhost/api/geographies/compare?ids=${ids}`),
	);
	expect(response.status).toBe(200);
	const body = await response.json();
	expect(body.data.profiles).toHaveLength(2);
	expect(body.data.comparison.rows).toHaveLength(3);
	expect(body.data.profiles[0].observations[0].source.license).toBeTruthy();
});

test("comparison does not use demo records when the catalog is unavailable", async () => {
	loader.mockResolvedValue({
		mode: "unavailable",
		publicationStatus: "unavailable",
		source: null,
		geographies: [],
		observations: [],
		availablePeriods: [],
		selectedPeriod: null,
	});
	expect(
		(
			await GET(
				new Request(`http://localhost/api/geographies/compare?ids=${ids}`),
			)
		).status,
	).toBe(503);
});

test("comparison API rejects invalid counts, duplicate IDs, malformed IDs and unknown places", async () => {
	for (const value of ["", ids.split(",")[0], `${ids},${ids}`, "bad,ids"]) {
		expect(
			(
				await GET(
					new Request(`http://localhost/api/geographies/compare?ids=${value}`),
				)
			).status,
		).toBe(400);
	}
	expect(
		(
			await GET(
				new Request(
					`http://localhost/api/geographies/compare?ids=${ids.split(",")[0]},99999999-9999-4999-8999-999999999999`,
				),
			)
		).status,
	).toBe(404);
});
