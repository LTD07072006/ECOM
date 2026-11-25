import { afterEach, expect, spyOn, test } from "bun:test";
import { GET as getIncentives } from "../../src/app/api/decision/incentives/route";
import { GET as getProximity } from "../../src/app/api/map/proximity/route";
import { demoCatalog } from "../../src/db/seed-data";
import {
	canonicalInvestmentIncentives,
	describeProvinceIncentiveZones,
	matchIncentivesForSectorAndProvinces,
} from "../../src/features/decision/investment-incentives";
import * as incentiveRepo from "../../src/features/decision/investment-incentives-repository";
import * as catalog from "../../src/features/geography/catalog";
import {
	canonicalInfrastructurePois,
	computeProximityForProvinces,
} from "../../src/features/map/proximity";
import * as proximityRepo from "../../src/features/map/proximity-repository";

let proxSpy: ReturnType<
	typeof spyOn<typeof proximityRepo, "findProvincesWithinInfrastructureRadius">
>;
let incSpy: ReturnType<
	typeof spyOn<typeof incentiveRepo, "loadInvestmentIncentives">
>;
let catSpy: ReturnType<typeof spyOn<typeof catalog, "loadPublicCatalog">>;

afterEach(() => {
	proxSpy?.mockRestore();
	incSpy?.mockRestore();
	catSpy?.mockRestore();
});

test("computeProximityForProvinces filters provinces within radius of seaports and airports", () => {
	const sampleProvinces = [
		{
			id: "p-hanoi",
			code: "01",
			displayName: "Hà Nội",
			latitude: 21.0285,
			longitude: 105.8542,
		},
		{
			id: "p-haiphong",
			code: "31",
			displayName: "Hải Phòng",
			latitude: 20.8449,
			longitude: 106.6881,
		},
		{
			id: "p-dienbien",
			code: "11",
			displayName: "Điện Biên",
			latitude: 21.386,
			longitude: 103.0169,
		},
	];

	const nearSeaport50Km = computeProximityForProvinces(
		sampleProvinces,
		canonicalInfrastructurePois,
		"seaport",
		50,
	);
	expect(nearSeaport50Km.matchedProvinceIds).toContain("p-haiphong");
	expect(nearSeaport50Km.matchedProvinceIds).not.toContain("p-dienbien");
	const haiphongMatch = nearSeaport50Km.provinces.find(
		(item) => item.geoId === "p-haiphong",
	);
	expect(haiphongMatch?.withinRadius).toBe(true);
	expect(haiphongMatch?.nearestPoiCode).toBe("VNHPH-LH");
	expect(haiphongMatch?.distanceKm).toBeLessThan(30);

	const nearAirport30Km = computeProximityForProvinces(
		sampleProvinces,
		canonicalInfrastructurePois,
		"airport",
		30,
	);
	expect(nearAirport30Km.matchedProvinceIds).toEqual([
		"p-dienbien",
		"p-haiphong",
		"p-hanoi",
	]);
});

test("GET /api/map/proximity validates parameters and returns PostGIS proximity envelope", async () => {
	const computed = computeProximityForProvinces(
		demoCatalog.geographies.filter((g) => g.level === "province"),
		canonicalInfrastructurePois,
		"seaport",
		120,
	);
	proxSpy = spyOn(
		proximityRepo,
		"findProvincesWithinInfrastructureRadius",
	).mockResolvedValue(computed);

	const ok = await getProximity(
		new Request("http://localhost/api/map/proximity?kind=seaport&maxKm=120"),
	);
	expect(ok.status).toBe(200);
	const body = await ok.json();
	expect(body.meta).toMatchObject({
		kind: "seaport",
		maxKm: 120,
		engine: "postgis_st_dwithin",
	});
	expect(Array.isArray(body.data.matchedProvinceIds)).toBe(true);
	expect(Array.isArray(body.data.provinces)).toBe(true);

	expect(
		(
			await getProximity(
				new Request("http://localhost/api/map/proximity?kind=invalid&maxKm=50"),
			)
		).status,
	).toBe(400);
	expect(
		(
			await getProximity(
				new Request("http://localhost/api/map/proximity?kind=seaport&maxKm=0"),
			)
		).status,
	).toBe(400);
});

test("investment incentives resolve sector and province zone tiers while staying strictly advisory", () => {
	const haiphongZone = describeProvinceIncentiveZones({
		id: "geo-hp",
		code: "31",
		displayName: "Hải Phòng",
	});
	expect(haiphongZone.primaryZoneTier).toBe("economic_zone_hightech");
	expect(haiphongZone.applicableTiers).toContain("economic_zone_hightech");

	const caobangZone = describeProvinceIncentiveZones({
		id: "geo-cb",
		code: "04",
		displayName: "Cao Bằng",
	});
	expect(caobangZone.primaryZoneTier).toBe("special_difficult_area");

	const matchedMfg = matchIncentivesForSectorAndProvinces(
		canonicalInvestmentIncentives,
		"manufacturing",
		[{ id: "geo-hp", code: "31", displayName: "Hải Phòng" }],
	);
	expect(matchedMfg.advisoryOnly).toBe(true);
	expect(matchedMfg.entitlementCertified).toBe(false);
	expect(matchedMfg.incentives.map((item) => item.code)).toEqual([
		"INC_EZ_HIGHTECH_CIT",
		"INC_IP_LAND_RENT",
		"INC_MFG_IMPORT_DUTY",
	]);
});

test("GET /api/decision/incentives returns sector and province incentives and rejects invalid inputs", async () => {
	incSpy = spyOn(incentiveRepo, "loadInvestmentIncentives").mockResolvedValue([
		...canonicalInvestmentIncentives,
	]);
	catSpy = spyOn(catalog, "loadPublicCatalog").mockResolvedValue(demoCatalog);

	const hanoiId = demoCatalog.geographies[1].id;
	const res = await getIncentives(
		new Request(
			`http://localhost/api/decision/incentives?sector=enterprise&geoIds=${hanoiId}`,
		),
	);
	expect(res.status).toBe(200);
	const body = await res.json();
	expect(body.data.advisoryOnly).toBe(true);
	expect(body.data.entitlementCertified).toBe(false);
	expect(
		body.data.incentives.some(
			(item: { code: string }) => item.code === "INC_ENTERPRISE_SOFTWARE_RD",
		),
	).toBe(true);

	expect(
		(
			await getIncentives(
				new Request("http://localhost/api/decision/incentives?sector=bad"),
			)
		).status,
	).toBe(400);
	expect(
		(
			await getIncentives(
				new Request(
					"http://localhost/api/decision/incentives?geoIds=not-a-uuid",
				),
			)
		).status,
	).toBe(400);
});
