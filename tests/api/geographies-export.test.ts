import { afterEach, beforeEach, expect, spyOn, test } from "bun:test";
import { GET } from "../../src/app/api/geographies/export/route";
import { profilesToCsv } from "../../src/features/shortlist/export";
import { demoCatalog } from "../../src/db/seed-data";
import { getProfile } from "../../src/features/geography/domain";
import * as catalog from "../../src/features/geography/catalog";

let loader: ReturnType<typeof spyOn<typeof catalog, "loadPublicCatalog">>;
beforeEach(() => {
	loader = spyOn(catalog, "loadPublicCatalog").mockResolvedValue(demoCatalog);
});
afterEach(() => loader.mockRestore());

const ids = demoCatalog.geographies
	.slice(1, 3)
	.map((geo) => geo.id)
	.join(",");

test("JSON export preserves snapshot metadata and unavailable values", async () => {
	const response = await GET(
		new Request(
			`http://localhost/api/geographies/export?ids=${ids}&format=json`,
		),
	);
	expect(response.status).toBe(200);
	expect(response.headers.get("Content-Disposition")).toContain("attachment");
	const body = await response.json();
	expect(body.data).toHaveLength(2);
	expect(body.meta.exportedAt).toBeTruthy();
	expect(body.meta.limitations).toContain("Context only");
	expect(body.data[0].observations[0].value).toBeNull();
	expect(body.data[0].geographyVersion).toBeTruthy();
	expect(body.data[0].observations[0].source.license).toBeTruthy();
});

test("export reports catalog failure rather than a missing geography or demo download", async () => {
	loader.mockResolvedValue({
		mode: "unavailable",
		publicationStatus: "unavailable",
		source: null,
		geographies: [],
		observations: [],
	});
	const response = await GET(
		new Request(
			`http://localhost/api/geographies/export?ids=${ids}&format=json`,
		),
	);
	expect(response.status).toBe(503);
	expect(response.headers.get("Content-Disposition")).toBeNull();
});

test("CSV export contains provenance, unit, period, quality, limitations and safe escaping", async () => {
	const response = await GET(
		new Request(
			`http://localhost/api/geographies/export?ids=${ids}&format=csv`,
		),
	);
	expect(response.status).toBe(200);
	expect(response.headers.get("Content-Type")).toContain("text/csv");
	const text = await response.text();
	for (const header of [
		"geography_version",
		"dataset_version",
		"unit",
		"quality",
		"citation",
		"license",
		"access",
		"updated_at",
		"limitations",
		"period_start",
	]) {
		expect(text).toContain(header);
	}
	const profile = getProfile(demoCatalog, demoCatalog.geographies[1].id);
	if (!profile) throw new Error("Expected demo profile");
	const csv = profilesToCsv([
		{ ...profile, displayName: '=HYPERLINK("bad"),\nunsafe' },
	]);
	expect(csv).toContain('"\'=HYPERLINK(""bad""),\nunsafe"');
});

test("CSV preserves numeric signs while neutralizing formula-like text", () => {
	const profile = getProfile(demoCatalog, demoCatalog.geographies[1].id);
	if (!profile) throw new Error("Expected demo profile");
	const csv = profilesToCsv([
		{ ...profile, observations: [{ ...profile.observations[0], value: -12 }] },
	]);

	expect(csv).toContain('"-12"');
	expect(csv).not.toContain('"\'-12"');
});

test("export rejects invalid formats, missing IDs, duplicates and unknown places", async () => {
	for (const query of [
		"format=json",
		`ids=${ids}&format=pdf`,
		"ids=invalid&format=json",
		`ids=${ids},${ids}&format=json`,
	]) {
		expect(
			(
				await GET(
					new Request(`http://localhost/api/geographies/export?${query}`),
				)
			).status,
		).toBe(400);
	}
	expect(
		(
			await GET(
				new Request(
					"http://localhost/api/geographies/export?ids=99999999-9999-4999-8999-999999999999&format=json",
				),
			)
		).status,
	).toBe(404);
});
