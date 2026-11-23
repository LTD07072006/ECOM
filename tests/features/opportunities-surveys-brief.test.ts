import { afterEach, expect, spyOn, test } from "bun:test";
import { randomBytes } from "node:crypto";
import {
	GET as getInternalSurveys,
	PATCH as patchInternalSurvey,
	POST as postInternalSurvey,
} from "../../src/app/api/internal/surveys/route";
import { GET as getOpportunities } from "../../src/app/api/opportunities/route";
import { demoCatalog } from "../../src/db/seed-data";
import {
	buildExecutiveBriefMarkdown,
	executiveCostBrief,
} from "../../src/features/decision/executive-brief";
import {
	canonicalInvestmentOpportunities,
	filterOpportunities,
} from "../../src/features/decision/investment-opportunities";
import * as oppRepo from "../../src/features/decision/investment-opportunities-repository";
import { defaultLegalChecklistBySector } from "../../src/features/decision/legal-readiness";
import {
	calculateRetailScore,
	criteria,
} from "../../src/features/decision/model";
import * as surveyRepo from "../../src/features/decision/survey-evidence-repository";
import { getProfile } from "../../src/features/geography/domain";
import { resolveIpaContactsForInquiry } from "../../src/features/inquiries/ipa-directory";

let oppSpy: ReturnType<
	typeof spyOn<typeof oppRepo, "loadInvestmentOpportunities">
>;
let listSurveySpy: ReturnType<
	typeof spyOn<typeof surveyRepo, "listAllSurveyStudies">
>;
let createSurveySpy: ReturnType<
	typeof spyOn<typeof surveyRepo, "createSurveyStudyRecord">
>;
let updateSurveySpy: ReturnType<
	typeof spyOn<typeof surveyRepo, "updateSurveyStudyStatus">
>;

afterEach(() => {
	oppSpy?.mockRestore();
	listSurveySpy?.mockRestore();
	createSurveySpy?.mockRestore();
	updateSurveySpy?.mockRestore();
});

test("filterOpportunities and GET /api/opportunities filter industrial parks by sector and province", async () => {
	const mfgHp = filterOpportunities(canonicalInvestmentOpportunities, {
		sector: "manufacturing",
		provinceCodes: ["31"],
	});
	expect(mfgHp).toHaveLength(1);
	expect(mfgHp[0]?.code).toBe("OPP_DEEPC_HP");
	expect(mfgHp[0]?.availableAreaHa).toBe(310);

	oppSpy = spyOn(oppRepo, "loadInvestmentOpportunities").mockResolvedValue(
		mfgHp,
	);
	const res = await getOpportunities(
		new Request(
			"http://localhost/api/opportunities?sector=manufacturing&provinceCodes=31",
		),
	);
	expect(res.status).toBe(200);
	const body = await res.json();
	expect(body.data).toHaveLength(1);
	expect(body.meta).toEqual({
		sector: "manufacturing",
		provinceCodes: ["31"],
		count: 1,
	});

	expect(
		(
			await getOpportunities(
				new Request("http://localhost/api/opportunities?provinceCodes=BAD"),
			)
		).status,
	).toBe(400);
});

test("resolveIpaContactsForInquiry routes provincial inquiries to local IPAs and appends national FIA fallback", () => {
	const routed = resolveIpaContactsForInquiry({
		provinceCodes: ["31", "24"],
		sector: "manufacturing",
	});
	expect(routed.map((item) => item.code)).toEqual([
		"IPA-HAIPHONG-HEZA",
		"IPA-BACNINH-BIZA",
		"IPA-NATIONAL-FIA",
	]);

	const nationalOnly = resolveIpaContactsForInquiry({
		provinceCodes: ["99"],
	});
	expect(nationalOnly.map((item) => item.code)).toEqual(["IPA-NATIONAL-FIA"]);
});

test("internal survey management API enforces steward auth and supports GET, POST, PATCH", async () => {
	expect(
		(
			await getInternalSurveys(
				new Request("http://localhost/api/internal/surveys"),
			)
		).status,
	).toBe(401);

	const previousOperators = process.env.ECOM_OPERATORS;
	const stewardToken = randomBytes(32).toString("base64url");
	process.env.ECOM_OPERATORS = JSON.stringify([
		{ id: "survey-steward", role: "steward", token: stewardToken },
	]);

	try {
		listSurveySpy = spyOn(surveyRepo, "listAllSurveyStudies").mockResolvedValue(
			[],
		);
		createSurveySpy = spyOn(
			surveyRepo,
			"createSurveyStudyRecord",
		).mockResolvedValue({
			studyId: "30000000-0000-4000-8000-000000000001",
			code: "DEMO-RETAIL-2025",
			publicationStatus: "published",
		});
		updateSurveySpy = spyOn(
			surveyRepo,
			"updateSurveyStudyStatus",
		).mockResolvedValue({
			study_id: "30000000-0000-4000-8000-000000000001",
			code: "DEMO-RETAIL-2025",
			publication_status: "retired",
		});

		const listRes = await getInternalSurveys(
			new Request("http://localhost/api/internal/surveys", {
				headers: { authorization: `Bearer ${stewardToken}` },
			}),
		);
		expect(listRes.status).toBe(200);
		expect(listRes.headers.get("cache-control")).toBe("private, no-store");

		const createRes = await postInternalSurvey(
			new Request("http://localhost/api/internal/surveys", {
				method: "POST",
				headers: {
					authorization: `Bearer ${stewardToken}`,
					"content-type": "application/json",
				},
				body: JSON.stringify({
					code: "DEMO-RETAIL-2025",
					sector: "retail",
					titleVi: "Khảo sát bán lẻ 2025",
					titleEn: "Retail Study 2025",
					segment: "Urban households",
					method: "CATI",
					sampleSize: 600,
					periodStart: "2025-01-01",
					periodEnd: "2025-06-30",
					periodLabel: "H1 2025",
					sourceName: "Demo Institute",
					sourceUrl: "https://nso.gov.vn/",
					isDemo: true,
					publicationStatus: "published",
					questionCode: "Q1_CHANNEL",
					promptVi: "Kênh ưu tiên",
					promptEn: "Preferred channel",
					aggregates: [
						{
							geoId: "10000000-0000-4000-8000-000000000002",
							sampleSize: 600,
							optionLabel: "Modern trade",
							valuePercent: 68,
						},
					],
				}),
			}),
		);
		expect(createRes.status).toBe(201);

		const patchRes = await patchInternalSurvey(
			new Request("http://localhost/api/internal/surveys", {
				method: "PATCH",
				headers: {
					authorization: `Bearer ${stewardToken}`,
					"content-type": "application/json",
				},
				body: JSON.stringify({
					studyId: "30000000-0000-4000-8000-000000000001",
					publicationStatus: "retired",
				}),
			}),
		);
		expect(patchRes.status).toBe(200);
	} finally {
		if (previousOperators === undefined) delete process.env.ECOM_OPERATORS;
		else process.env.ECOM_OPERATORS = previousOperators;
	}
});

test("buildExecutiveBriefMarkdown compiles indicators, incentives, opportunities, legal checklist, and IPA contacts", () => {
	const profiles = demoCatalog.geographies
		.slice(1, 3)
		.map((geo) => getProfile(demoCatalog, geo.id))
		.filter((item): item is NonNullable<typeof item> => item !== null);
	const official = calculateRetailScore(profiles, [60, 40], {
		status: "unavailable",
	});
	const md = buildExecutiveBriefMarkdown({
		locale: "en",
		sector: "retail",
		sectorLabel: "Retail",
		targetSegment: "Urban middle-income households",
		hypotheses: "High modern-trade adoption in Hanoi and Hai Phong",
		criteria,
		weights: [60, 40],
		profiles,
		evidence: { status: "unavailable" },
		officialResult: official,
		legalChecklist: defaultLegalChecklistBySector.retail,
		generatedAt: new Date("2026-11-23T00:00:00.000Z"),
	});
	expect(md).toContain("# EXECUTIVE LOCATION BRIEF — RETAIL");
	expect(md).toContain("Urban middle-income households");
	expect(md).toContain("Advisory Investment Incentives");
	expect(md).toContain("Market-Entry Legal Readiness Checklist");
	expect(md).toContain("Recommended Provincial IPA");
});

test("getProvinceMicroLocations returns detailed industrial parks and residential zones for curated and general provinces", async () => {
	const {
		getProvinceMicroLocations,
		toProvinceMicroLocationGeoJson,
		toProvinceRoadNetworkGeoJson,
		toProvinceZoneFootprintsGeoJson,
	} = await import("../../src/features/map/province-detail-locations");

	const hanoiLocations = getProvinceMicroLocations({
		id: "geo-hn",
		code: "01",
		displayName: "Hà Nội",
		latitude: 21.0285,
		longitude: 105.8542,
	});
	expect(
		hanoiLocations.some((item) => item.category === "industrial_zone"),
	).toBe(true);
	expect(
		hanoiLocations.some((item) => item.category === "residential_zone"),
	).toBe(true);
	expect(hanoiLocations.some((item) => item.category === "logistics_hub")).toBe(
		true,
	);

	const generalLocations = getProvinceMicroLocations({
		id: "geo-ag",
		code: "89",
		displayName: "An Giang",
		latitude: 10.5216,
		longitude: 105.1259,
	});
	expect(
		generalLocations.filter((item) => item.category === "industrial_zone")
			.length,
	).toBeGreaterThanOrEqual(2);
	expect(
		generalLocations.filter((item) => item.category === "residential_zone")
			.length,
	).toBeGreaterThanOrEqual(2);

	const geojson = toProvinceMicroLocationGeoJson(hanoiLocations, "vi");
	expect(geojson.type).toBe("FeatureCollection");
	expect(geojson.features.length).toBe(hanoiLocations.length);
	expect(geojson.features[0]?.geometry.type).toBe("Point");

	const zones = toProvinceZoneFootprintsGeoJson(hanoiLocations, "vi");
	expect(
		zones.features.some((f) => f.properties.featureKind === "zone_boundary"),
	).toBe(true);
	expect(
		zones.features.some((f) => f.properties.featureKind === "building_block"),
	).toBe(true);

	const roads = toProvinceRoadNetworkGeoJson(
		{
			code: "01",
			displayName: "Hà Nội",
			latitude: 21.0285,
			longitude: 105.8542,
		},
		hanoiLocations,
		"vi",
	);
	expect(roads.features.some((f) => f.properties.roadClass === "highway")).toBe(
		true,
	);
	expect(
		roads.features.some((f) => f.properties.roadClass === "internal_street"),
	).toBe(true);
});

test("levelLabel and formalPlaceName distinguish Vietnam's 6 centrally-governed cities from 28 provinces", async () => {
	const { formalPlaceName, isCentrallyGovernedCity, levelLabel } = await import(
		"../../src/lib/i18n/data-labels"
	);

	const hanoi = { level: "province", code: "01", displayName: "Hà Nội" };
	const hue = { level: "province", code: "46", displayName: "Huế" };
	const hcmc = {
		level: "province",
		code: "79",
		displayName: "TP. Hồ Chí Minh",
	};
	const bacNinh = { level: "province", code: "24", displayName: "Bắc Ninh" };
	const ward = {
		level: "commune",
		code: "00001",
		displayName: "Phường Bến Nghé",
	};

	expect(isCentrallyGovernedCity(hanoi)).toBe(true);
	expect(isCentrallyGovernedCity(hue)).toBe(true);
	expect(isCentrallyGovernedCity(hcmc)).toBe(true);
	expect(isCentrallyGovernedCity(bacNinh)).toBe(false);

	expect(levelLabel("vi", "province", hanoi)).toBe(
		"thành phố trực thuộc trung ương",
	);
	expect(levelLabel("en", "province", hanoi)).toBe("centrally-governed city");
	expect(levelLabel("vi", "province", bacNinh)).toBe("tỉnh");
	expect(levelLabel("en", "province", bacNinh)).toBe("province");
	expect(levelLabel("vi", "commune", ward)).toBe("phường");
	expect(levelLabel("en", "commune", ward)).toBe("ward");

	expect(formalPlaceName("vi", hanoi)).toBe("Thành phố Hà Nội");
	expect(formalPlaceName("en", hanoi)).toBe("Hà Nội City");
	expect(formalPlaceName("vi", hcmc)).toBe("Thành phố Hồ Chí Minh");
	expect(formalPlaceName("vi", bacNinh)).toBe("Tỉnh Bắc Ninh");
	expect(formalPlaceName("en", bacNinh)).toBe("Bắc Ninh Province");
});
test("print brief preserves missing estimates and explicit zero deltas", () => {
	const brief = executiveCostBrief(
		[
			{
				province: { code: "24", displayName: "Bắc Ninh" },
				estimate: null,
				sensitivity: null,
			},
			{
				province: { code: "31", displayName: "Hải Phòng" },
				estimate: { net: 100 },
				sensitivity: { delta: 0 },
			},
		],
		-5,
		10,
	);
	expect(brief).toMatchObject({
		advisoryOnly: true,
		rentShock: -5,
		elecShock: 10,
		rows: [
			{ net: null, delta: null },
			{ net: 100, delta: 0 },
		],
	});
});
