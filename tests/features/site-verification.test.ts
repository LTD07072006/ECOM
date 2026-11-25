import { expect, test } from "bun:test";
import {
	createVerificationEvidence,
	pilotParksForDistrict,
	transitionVerificationStatus,
	verificationFields,
	verificationStatus,
} from "../../src/features/decision/site-verification";

test("pilot records are scoped to the province and do not promote research leads to values", () => {
	const parks = pilotParksForDistrict("31", ["HP-IZ-DEEPC", "BN-IZ-VSIP"]);
	expect(parks.map((park) => park.id)).toEqual(["HP-IZ-DEEPC"]);
	expect(parks[0].fields).toEqual({
		area: null,
		region: null,
		power: null,
		wastewater: null,
	});
});

test("checklist includes unmet screening evidence and missing park measurements once", () => {
	const [park] = pilotParksForDistrict("75", ["DNA-IZ-LONGTHANH"]);
	expect(verificationFields(["area", "infrastructure"], park)).toEqual([
		"area",
		"infrastructure",
		"region",
		"power",
		"wastewater",
	]);
	expect(verificationFields(["region"])).toEqual(["region"]);
});

test("verification evidence expires without becoming an investment certification", () => {
	const evidence = createVerificationEvidence({
		field: "power",
		value: 12,
		sourceUrl: "https://example.test/power",
		verifiedOn: "2026-01-01",
		reviewer: "steward-1",
		expiresOn: "2026-06-30",
	});
	expect(verificationStatus(evidence, "2026-03-01")).toBe("verified");
	expect(verificationStatus(evidence, "2026-07-01")).toBe("expired");
	expect(evidence).toMatchObject({ status: "verified", reviewer: "steward-1" });
});

test("review transitions are role-independent domain decisions with explicit rejection", () => {
	expect(transitionVerificationStatus("pending_review", "approve")).toBe(
		"verified",
	);
	expect(transitionVerificationStatus("pending_review", "reject")).toBe(
		"unverified",
	);
	expect(transitionVerificationStatus("verified", "revalidate")).toBe(
		"pending_review",
	);
	expect(transitionVerificationStatus("expired", "revalidate")).toBe(
		"pending_review",
	);
});
