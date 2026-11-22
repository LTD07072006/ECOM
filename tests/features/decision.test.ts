import { expect, test } from "bun:test";
import { demoCatalog } from "../../src/db/seed-data";
import { getProfile } from "../../src/features/geography/domain";
import {
	calculateContextualRanking,
	calculateRetailScore,
	calculateSectorScore,
	criteria,
	sectorScenarios,
	validateCustomerEvidence,
	type CriterionDefinition,
	type Evidence,
} from "../../src/features/decision/model";
import {
	buildDecisionScenarioExport,
	decisionScenarioToCsv,
} from "../../src/features/decision/scenario-export";

const profiles = demoCatalog.geographies.slice(1, 3).map((geo, index) => {
	const profile = getProfile(demoCatalog, geo.id);
	if (!profile) throw new Error("Expected demo profile");
	return {
		...profile,
		observations: criteria.map((criterion, criterionIndex) => ({
			...profile.observations[0],
			indicator: criterion.code,
			label: criterion.label,
			unit: criterion.unit,
			value: (index + 1) * (criterionIndex + 1) * 10,
			quality: "verified" as const,
			scoreEligible: true,
		})),
	};
});
const evidence: Evidence = {
	status: "available",
	segment: "Retail customers",
	geographyIds: profiles.map(({ id }) => id),
	sampleSize: 100,
	method: "Survey",
	period: "2025",
	source: "Published research",
};

test("refuses scoring when evidence, eligibility, values or weights are missing", () => {
	const none = calculateRetailScore(profiles, [60, 40], {
		status: "unavailable",
	});
	expect(none.ok).toBe(false);
	if (!none.ok)
		expect(none.reasons.map((reason) => reason.code)).toContain(
			"retail.reasonEvidence",
		);
	const unapproved = profiles.map((profile) => ({
		...profile,
		observations: profile.observations.map((o) => ({
			...o,
			scoreEligible: false,
		})),
	}));
	expect(calculateRetailScore(unapproved, [60, 40], evidence).ok).toBe(false);
	const unapprovedReasons = calculateRetailScore(
		unapproved,
		[60, 40],
		evidence,
	);
	if (!unapprovedReasons.ok) {
		const eligibility = unapprovedReasons.reasons.find(
			(reason) => reason.code === "retail.reasonNotEligible",
		);
		expect(
			eligibility && "criterion" in eligibility ? eligibility.criterion : null,
		).toBe("retail.criterionRetail");
	}
	expect(calculateRetailScore(profiles, [50, 40], evidence).ok).toBe(false);
	const missing = [{ ...profiles[0], observations: [] }, profiles[1]];
	expect(calculateRetailScore(missing, [60, 40], evidence).ok).toBe(false);
});

test("calculates weighted contributions for approved comparable data and complete evidence", () => {
	const result = calculateRetailScore(profiles, [60, 40], evidence);
	expect(result.ok).toBe(true);
	if (result.ok) {
		expect(result.results[0].score).toBe(0);
		expect(result.results[1].score).toBe(100);
		expect(result.results[1].parts.map((part) => part.contribution)).toEqual([
			60, 40,
		]);
	}
	const mixed = [
		profiles[0],
		{
			...profiles[1],
			observations: profiles[1].observations.map((o) => ({
				...o,
				datasetVersion: "other",
			})),
		},
	];
	expect(calculateRetailScore(mixed, [60, 40], evidence).ok).toBe(false);
});

test("supports multi-sector scenarios while preserving strict evidence and eligibility checks", () => {
	expect(Object.keys(sectorScenarios)).toEqual([
		"retail",
		"manufacturing",
		"logistics",
		"enterprise",
	]);
	const mfgCriteria = sectorScenarios.manufacturing.criteria;
	const mfgProfiles = demoCatalog.geographies.slice(1, 3).map((geo, index) => {
		const profile = getProfile(demoCatalog, geo.id);
		if (!profile) throw new Error("Expected demo profile");
		return {
			...profile,
			observations: mfgCriteria.map((criterion, criterionIndex) => ({
				...profile.observations[0],
				indicator: criterion.code,
				label: criterion.label,
				unit: criterion.unit,
				value: (index + 1) * (criterionIndex + 1) * 10,
				quality: "verified" as const,
				scoreEligible: true,
			})),
		};
	});

	const ok = calculateSectorScore(
		mfgCriteria,
		mfgProfiles,
		[25, 25, 25, 25],
		evidence,
	);
	expect(ok.ok).toBe(true);
	if (ok.ok) {
		expect(ok.results[0].score).toBe(0);
		expect(ok.results[1].score).toBe(100);
	}

	const ineligible = mfgProfiles.map((profile) => ({
		...profile,
		observations: profile.observations.map((o) => ({
			...o,
			scoreEligible: false,
		})),
	}));
	expect(
		calculateSectorScore(mfgCriteria, ineligible, [25, 25, 25, 25], evidence)
			.ok,
	).toBe(false);

	// Exploratory contextual ranking (What-if) works on comparable ineligible indicators while explicitly listing them
	const whatIf = calculateContextualRanking(
		mfgCriteria,
		ineligible,
		[25, 25, 25, 25],
	);
	expect(whatIf.ok).toBe(true);
	if (whatIf.ok) {
		expect(whatIf.exploratory).toBe(true);
		expect(whatIf.ineligibleIndicators).toHaveLength(4);
		expect(whatIf.results[0].score).toBe(100);
		expect(whatIf.results[1].score).toBe(0);
	}

	// Provenance validation rejects unsafe source URLs
	const ids = mfgProfiles.map((p) => p.id);
	expect(
		validateCustomerEvidence(
			{ ...evidence, sourceUrl: "javascript:alert(1)" },
			ids,
		).checks.sourceUrlValid,
	).toBe(false);
	expect(
		validateCustomerEvidence(
			{ ...evidence, sourceUrl: "https://nso.gov.vn/study" },
			ids,
		).ok,
	).toBe(true);
});

test("supports higher and lower polarity and matches exact DOCX numeric benchmark A=68.35 / B=69.05 (ECOM-11)", () => {
	const weightedCriteria: CriterionDefinition[] = [
		{
			code: "DEMAND",
			label: "Demand index",
			labelKey: "retail.criterionRetail",
			unit: "index",
			polarity: "higher",
		},
		{
			code: "INCOME",
			label: "Income index",
			labelKey: "retail.criterionGrdpPc",
			unit: "index",
			polarity: "higher",
		},
		{
			code: "WORKFORCE",
			label: "Workforce index",
			labelKey: "retail.criterionLabour",
			unit: "index",
			polarity: "higher",
		},
		{
			code: "COST",
			label: "Operating cost index",
			labelKey: "retail.criterionFdi",
			unit: "index",
			polarity: "lower",
		},
	];
	const baseProfile = getProfile(demoCatalog, demoCatalog.geographies[1].id);
	if (!baseProfile) throw new Error("Expected demo profile");
	const makeProvince = (id: string, name: string, values: number[]) => ({
		...baseProfile,
		id,
		displayName: name,
		level: "province" as const,
		observations: weightedCriteria.map((criterion, index) => ({
			...baseProfile.observations[0],
			geoId: id,
			indicator: criterion.code,
			label: criterion.label,
			unit: criterion.unit,
			value: values[index],
			quality: "verified" as const,
			scoreEligible: true,
		})),
	});
	// Province C sets exact [0, 100] normalization anchor bounds alongside A and B
	const provinceA = makeProvince("prov-a", "Province A", [80, 75, 60, 47]);
	const provinceB = makeProvince("prov-b", "Province B", [60, 85, 70, 38.5]);
	const provinceAnchorMin = makeProvince("prov-c", "Anchor", [0, 0, 0, 100]);
	const provinceAnchorMax = makeProvince(
		"prov-d",
		"Anchor Max",
		[100, 100, 100, 0],
	);

	// Verify lower-is-better directly on a 2-province pair
	const costOnly = calculateSectorScore(
		[weightedCriteria[3]],
		[provinceA, provinceB],
		[100],
		{ ...evidence, geographyIds: ["prov-a", "prov-b"] },
	);
	expect(costOnly.ok).toBe(true);
	if (costOnly.ok) {
		// Lower cost (38.5) gets 100; higher cost (47) gets 0
		expect(costOnly.results[0].score).toBe(0);
		expect(costOnly.results[1].score).toBe(100);
	}

	// Verify exact DOCX numeric calculation (A=68.35, B=69.05) with fixed [0,100] peer normalization
	const withMinA = calculateSectorScore(
		weightedCriteria,
		[provinceA, provinceAnchorMin, provinceAnchorMax],
		[30, 25, 25, 20],
		{ ...evidence, geographyIds: ["prov-a", "prov-c", "prov-d"] },
	);
	const withMinB = calculateSectorScore(
		weightedCriteria,
		[provinceB, provinceAnchorMin, provinceAnchorMax],
		[30, 25, 25, 20],
		{ ...evidence, geographyIds: ["prov-b", "prov-c", "prov-d"] },
	);
	expect(withMinA.ok).toBe(true);
	expect(withMinB.ok).toBe(true);
	if (withMinA.ok && withMinB.ok) {
		expect(Number(withMinA.results[0].score.toFixed(2))).toBe(68.35);
		expect(Number(withMinB.results[0].score.toFixed(2))).toBe(69.05);
	}
});

test("exports decision scenario as provenance-rich JSON and formula-safe CSV (ECOM-11 / ECOM-14)", () => {
	const official = calculateRetailScore(profiles, [60, 40], evidence);
	const exported = buildDecisionScenarioExport({
		sector: "retail",
		sectorLabel: "Retail",
		criteria,
		weights: [60, 40],
		profiles,
		targetSegment: "=1+1 Urban shoppers",
		hypotheses: "@SUM(1,2) Omnichannel hypothesis",
		evidence,
		officialResult: official,
		exportedAt: new Date("2026-11-23T00:00:00.000Z"),
	});
	expect(exported.assessment.officialStatus).toBe("computed");
	expect(exported.observedFacts.provinces).toHaveLength(2);
	const csv = decisionScenarioToCsv(exported);
	expect(csv.startsWith("\uFEFF")).toBe(true);
	expect(csv).toContain("'=1+1 Urban shoppers");
	expect(csv).toContain("'@SUM(1,2) Omnichannel hypothesis");
	expect(csv).toContain("RETAIL_TOTAL");
});
