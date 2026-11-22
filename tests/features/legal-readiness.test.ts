import { expect, test } from "bun:test";
import {
	buildLegalReadinessExport,
	defaultLegalChecklistBySector,
	legalReadinessToCsv,
	summarizeLegalReadiness,
} from "../../src/features/decision/legal-readiness";
import {
	decisionIndicatorCodes,
	sectorScenarios,
	type SectorId,
} from "../../src/features/decision/model";
import { safeSourceUrl } from "../../src/lib/source-url";

const allSectors: SectorId[] = [
	"retail",
	"manufacturing",
	"logistics",
	"enterprise",
];

test("decisionIndicatorCodes includes every criterion across all 4 sector scenarios", () => {
	for (const sector of allSectors) {
		for (const criterion of sectorScenarios[sector].criteria) {
			expect(decisionIndicatorCodes.has(criterion.code)).toBe(true);
		}
	}
	expect(decisionIndicatorCodes.has("GRDP_PC")).toBe(true);
	expect(decisionIndicatorCodes.has("FDI_LICENSED")).toBe(true);
	expect(decisionIndicatorCodes.has("TRAINED_LABOR_RATE")).toBe(true);
	expect(decisionIndicatorCodes.has("GRDP_GROWTH")).toBe(true);
	expect(decisionIndicatorCodes.has("ENTERPRISES_NEW")).toBe(true);
	expect(decisionIndicatorCodes.has("POP_AVG")).toBe(true);
});

test("each sector checklist provides official HTTPS URLs, effective dates, and non-approval review states", () => {
	for (const sector of allSectors) {
		const items = defaultLegalChecklistBySector[sector];
		expect(items.length).toBeGreaterThanOrEqual(4);
		for (const item of items) {
			expect(item.sector).toBe(sector);
			expect(safeSourceUrl(item.reference.officialUrl)).not.toBeNull();
			expect(item.reference.effectiveFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			expect(item.reference.documentCode.length).toBeGreaterThan(3);
			expect(["to_verify", "needs_specialist_review"]).toContain(
				item.reviewStatus,
			);
		}
	}
	// Preserve Retail E2E checkbox label contract
	expect(defaultLegalChecklistBySector.retail[0]?.checklistItem.en).toBe(
		"Define the retail activity, customer segment and operating model.",
	);
});

test("summarizeLegalReadiness never certifies investment eligibility even when all items are checked", () => {
	const items = defaultLegalChecklistBySector.manufacturing;
	const allIds = items.map((item) => item.id);

	const empty = summarizeLegalReadiness(items, []);
	expect(empty).toMatchObject({
		completedCount: 0,
		totalCount: items.length,
		completionPercent: 0,
		advisoryOutcome: "not_started_to_verify",
		investmentEligibilityCertified: false,
	});

	const partial = summarizeLegalReadiness(items, [allIds[0]]);
	expect(partial.advisoryOutcome).toBe("in_progress_to_verify");
	expect(partial.investmentEligibilityCertified).toBe(false);

	const completeNoCounsel = summarizeLegalReadiness(items, allIds);
	expect(completeNoCounsel).toMatchObject({
		completedCount: items.length,
		completionPercent: 100,
		counselReferenceRecorded: false,
		advisoryOutcome: "prepared_requires_specialist_verification",
		investmentEligibilityCertified: false,
	});

	const completeWithCounsel = summarizeLegalReadiness(
		items,
		allIds,
		"External Counsel Memo #2026-11",
	);
	expect(completeWithCounsel).toMatchObject({
		completedCount: items.length,
		counselReferenceRecorded: true,
		advisoryOutcome: "counsel_reference_recorded_advisory_only",
		investmentEligibilityCertified: false,
	});
});

test("legal readiness export includes provenance and neutralizes spreadsheet formula injection", () => {
	const items = defaultLegalChecklistBySector.logistics;
	const payload = buildLegalReadinessExport({
		sector: "logistics",
		sectorLabel: "Logistics & Warehousing",
		locale: "en",
		items,
		checkedIds: [items[0].id],
		selectedProvinces: [{ id: "geo-1", name: "=HYPERLINK(1)" }],
		counselReference: "@SUM(1,2)",
		generatedAt: new Date("2026-11-23T00:00:00.000Z"),
	});

	expect(payload.advisoryOnly).toBe(true);
	expect(payload.investmentEligibilityCertified).toBe(false);
	expect(payload.items[0]?.completed).toBe(true);
	expect(payload.items[0]?.officialUrl).toStartWith("https://");
	expect(payload.items[0]?.effectiveFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);

	const csv = legalReadinessToCsv(payload);
	expect(csv.startsWith("\uFEFF")).toBe(true);
	expect(csv).toContain("'=HYPERLINK(1)");
	expect(csv).toContain("'@SUM(1,2)");
	expect(csv).toContain("163/2017/NĐ-CP");
	expect(csv).toContain("needs_specialist_review");
});
