import { expect, test } from "bun:test";
import { demoCatalog } from "../../src/db/seed-data";
import { getProfile } from "../../src/features/geography/domain";
import { calculateRetailScore, criteria, type Evidence } from "../../src/features/decision/model";

const profiles = demoCatalog.geographies.slice(1, 3).map((geo, index) => {
  const profile = getProfile(demoCatalog, geo.id)!;
  return { ...profile, observations: criteria.map((criterion, criterionIndex) => ({
    ...profile.observations[0], indicator: criterion.code, label: criterion.label, unit: criterion.unit,
    value: (index + 1) * (criterionIndex + 1) * 10, quality: "verified" as const, scoreEligible: true,
  })) };
});
const evidence: Evidence = {
  status: "available", segment: "Retail customers", geographyIds: profiles.map(({ id }) => id),
  sampleSize: 100, method: "Survey", period: "2025", source: "Published research",
};

test("refuses scoring when evidence, eligibility, values or weights are missing", () => {
  const none = calculateRetailScore(profiles, [60, 40], { status: "unavailable" });
  expect(none.ok).toBe(false);
  if (!none.ok) expect(none.reasons.map((reason) => reason.code)).toContain("retail.reasonEvidence");
  const unapproved = profiles.map((profile) => ({ ...profile, observations: profile.observations.map((o) => ({ ...o, scoreEligible: false })) }));
  expect(calculateRetailScore(unapproved, [60, 40], evidence).ok).toBe(false);
  const unapprovedReasons = calculateRetailScore(unapproved, [60, 40], evidence);
  if (!unapprovedReasons.ok) {
    const eligibility = unapprovedReasons.reasons.find((reason) => reason.code === "retail.reasonNotEligible");
    expect(eligibility && "criterion" in eligibility ? eligibility.criterion : null).toBe("retail.criterionRetail");
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
    expect(result.results[1].parts.map((part) => part.contribution)).toEqual([60, 40]);
  }
  const mixed = [profiles[0], { ...profiles[1], observations: profiles[1].observations.map((o) => ({ ...o, datasetVersion: "other" })) }];
  expect(calculateRetailScore(mixed, [60, 40], evidence).ok).toBe(false);
});
