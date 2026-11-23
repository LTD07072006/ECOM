import { describe, expect, test } from "bun:test";
import { demoCatalog } from "../../src/db/seed-data";
import {
	normalizeSearch,
	searchGeographies,
	searchTerms,
	getProfile,
	getPublicCatalog,
} from "../../src/features/geography/domain";

describe("geography exploration", () => {
	test("normalizes Vietnamese accents and Đ without removing numbers", () => {
		expect(normalizeSearch("  Đà Nẵng 01  ")).toBe("da nang 01");
		expect(normalizeSearch("Sài Gòn")).toBe("sai gon");
	});
	test("expands search exonym aliases without replacing the literal query", () => {
		expect(searchTerms("Saigon")).toEqual(["saigon", "ho chi minh"]);
		expect(searchTerms("Sài Gòn")).toEqual(["sai gon", "ho chi minh"]);
		expect(searchTerms("Hà Nội")).toEqual(["ha noi"]);

		const sampleCatalog = {
			...demoCatalog,
			geographies: [
				{
					...demoCatalog.geographies[1],
					id: "prov-hn",
					code: "01",
					name: "Thành phố Hà Nội",
					displayName: "Hà Nội",
					normalizedName: normalizeSearch("Thành phố Hà Nội"),
					level: "province" as const,
				},
				{
					...demoCatalog.geographies[1],
					id: "prov-hcm",
					code: "79",
					name: "Thành phố Hồ Chí Minh",
					displayName: "Hồ Chí Minh",
					normalizedName: normalizeSearch("Thành phố Hồ Chí Minh"),
					level: "province" as const,
				},
				{
					...demoCatalog.geographies[1],
					id: "commune-sg",
					code: "26740",
					name: "Phường Sài Gòn",
					displayName: "Phường Sài Gòn",
					normalizedName: normalizeSearch("Phường Sài Gòn"),
					level: "commune" as const,
					parentId: "prov-hcm",
					parentName: "Hồ Chí Minh",
				},
			],
		};

		const saigonResults = searchGeographies(sampleCatalog, "Sài Gòn");
		expect(saigonResults[0]?.code).toBe("79");
		expect(saigonResults.some((item) => item.code === "26740")).toBe(true);

		const hanoiResults = searchGeographies(sampleCatalog, "Hanoi");
		expect(hanoiResults[0]?.code).toBe("01");
	});
	test("finds places by accented name, unaccented name, or sample code", () => {
		for (const query of ["Hà Nội", "ha noi", "DEMO-HN"]) {
			expect(searchGeographies(demoCatalog, query)[0]?.displayName).toBe(
				"Hà Nội",
			);
		}
		expect(searchGeographies(demoCatalog, "da nang")[0]?.displayName).toBe(
			"Đà Nẵng",
		);
	});
	test("commune search retains parent context and geography version", () => {
		const result = searchGeographies(demoCatalog, "ben nghe")[0];
		expect(result?.level).toBe("commune");
		expect(result?.parentName).toBe("Hồ Chí Minh City");
		expect(result?.geographyVersion).toContain("demo");
	});
	test("missing observations remain null, not zero, with provenance", () => {
		const profile = getProfile(demoCatalog, demoCatalog.geographies[1].id);
		expect(profile?.observations[0].value).toBeNull();
		expect(profile?.observations[0].quality).toBe("unavailable");
		expect(profile?.observations[0].source.citation).toBeTruthy();
		expect(profile?.observations[0].limitations).toBeTruthy();
		expect(profile?.observations[0].unit).toBe("people");
	});
	test("profile context observations retain indicator-specific units and limitations", () => {
		const profile = getProfile(demoCatalog, demoCatalog.geographies[1].id);
		const observations = profile?.observations ?? [];

		expect(observations.map((observation) => observation.indicator)).toEqual([
			"POP_TOTAL",
			"AREA_TOTAL",
			"POP_DENSITY",
		]);
		expect(observations.map((observation) => observation.unit)).toEqual([
			"people",
			"km²",
			"people/km²",
		]);
		expect(
			observations.every(
				(observation) =>
					observation.quality === "unavailable" &&
					observation.limitations.length > 0,
			),
		).toBe(true);
	});
	test("excludes restricted, revoked, and draft records from every public entry point", () => {
		const baseSource = demoCatalog.source;
		if (!baseSource) throw new Error("Expected demo source");
		for (const change of [{ access: "restricted" }, { status: "revoked" }]) {
			const catalog = { ...demoCatalog, source: { ...baseSource, ...change } };
			expect(getPublicCatalog(catalog).geographies).toHaveLength(0);
			expect(searchGeographies(catalog, "ha noi")).toHaveLength(0);
			expect(getProfile(catalog, demoCatalog.geographies[1].id)).toBeNull();
		}
		const catalog = { ...demoCatalog, publicationStatus: "draft" };
		expect(getPublicCatalog(catalog).geographies).toHaveLength(0);
	});
	test("does not silently combine geography versions when comparing", async () => {
		const { compareProfiles } = await import(
			"../../src/features/geography/domain"
		);
		const profiles = demoCatalog.geographies
			.slice(1, 3)
			.map((geo) => getProfile(demoCatalog, geo.id))
			.filter((p): p is NonNullable<typeof p> => p !== null);
		expect(compareProfiles(profiles).compatible).toBe(true);
		expect(
			compareProfiles([
				{ ...profiles[0], geographyVersion: "other" },
				profiles[1],
			]).compatible,
		).toBe(false);
		expect(compareProfiles(profiles).rows[0].values).toEqual([null, null]);
	});
	test("public profiles use the current release dataset while observations keep their own snapshot", () => {
		const profile = getProfile(demoCatalog, demoCatalog.geographies[1].id);
		if (!profile) throw new Error("Expected demo profile");
		expect(profile.administrativeDataset).toBeUndefined();
		expect(profile.observations[0].datasetVersion).toBe("demo-v1");
	});
});
