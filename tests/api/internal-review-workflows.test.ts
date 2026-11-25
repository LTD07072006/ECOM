import { afterEach, beforeEach, expect, spyOn, test } from "bun:test";
import { randomBytes, randomUUID } from "node:crypto";
import {
	GET as getLegal,
	PATCH as patchLegal,
} from "../../src/app/api/internal/legal-readiness/route";
import {
	GET as getEvidence,
	PATCH as patchEvidence,
	POST as postEvidence,
} from "../../src/app/api/internal/site-verification/route";
import * as legalRepo from "../../src/features/decision/legal-review-repository";
import * as evidenceRepo from "../../src/features/decision/site-verification-repository";

const token = randomBytes(32).toString("base64url");
const evidenceId = randomUUID();

let originalOperators: string | undefined;
let evidenceListSpy: ReturnType<
	typeof spyOn<typeof evidenceRepo, "listVerificationEvidence">
>;
let createEvidenceSpy: ReturnType<
	typeof spyOn<typeof evidenceRepo, "createVerificationEvidenceRecord">
>;
let reviewEvidenceSpy: ReturnType<
	typeof spyOn<typeof evidenceRepo, "reviewVerificationEvidence">
>;
let legalListSpy: ReturnType<
	typeof spyOn<typeof legalRepo, "listLegalReviewRecords">
>;
let reviewLegalSpy: ReturnType<
	typeof spyOn<typeof legalRepo, "reviewLegalRecord">
>;

beforeEach(() => {
	originalOperators = process.env.ECOM_OPERATORS;
	process.env.ECOM_OPERATORS = JSON.stringify([
		{ id: "reviewer-1", role: "reviewer", token },
		{
			id: "steward-1",
			role: "steward",
			token: randomBytes(32).toString("base64url"),
		},
	]);
	evidenceListSpy = spyOn(
		evidenceRepo,
		"listVerificationEvidence",
	).mockResolvedValue([]);
	createEvidenceSpy = spyOn(
		evidenceRepo,
		"createVerificationEvidenceRecord",
	).mockResolvedValue({ evidenceId, status: "pending_review" });
	reviewEvidenceSpy = spyOn(
		evidenceRepo,
		"reviewVerificationEvidence",
	).mockResolvedValue({ evidenceId, status: "verified" });
	legalListSpy = spyOn(legalRepo, "listLegalReviewRecords").mockResolvedValue({
		references: [],
		requirements: [],
	});
	reviewLegalSpy = spyOn(legalRepo, "reviewLegalRecord").mockResolvedValue({
		id: evidenceId,
		status: "effective",
	});
});

afterEach(() => {
	evidenceListSpy.mockRestore();
	createEvidenceSpy.mockRestore();
	reviewEvidenceSpy.mockRestore();
	legalListSpy.mockRestore();
	reviewLegalSpy.mockRestore();
	if (originalOperators === undefined) delete process.env.ECOM_OPERATORS;
	else process.env.ECOM_OPERATORS = originalOperators;
});

function auth(actor: "reviewer-1" | "steward-1") {
	const configured = JSON.parse(process.env.ECOM_OPERATORS ?? "[]") as Array<{
		id: string;
		token: string;
	}>;
	return `Bearer ${configured.find((entry) => entry.id === actor)?.token}`;
}

test("site verification GET is persisted behind reviewer/steward authentication", async () => {
	const response = await getEvidence(
		new Request("http://localhost/api/internal/site-verification", {
			headers: { authorization: auth("reviewer-1") },
		}),
	);
	expect(response.status).toBe(200);
	expect(evidenceListSpy).toHaveBeenCalled();
});

test("site verification POST validates source and creates pending evidence", async () => {
	const response = await postEvidence(
		new Request("http://localhost/api/internal/site-verification", {
			method: "POST",
			headers: {
				authorization: auth("steward-1"),
				"content-type": "application/json",
			},
			body: JSON.stringify({
				parkId: "HP-IZ-DEEPC",
				field: "power",
				value: 12,
				sourceUrl: "https://example.test/evidence",
				verifiedOn: "2026-11-25",
				expiresOn: "2027-11-25",
			}),
		}),
	);
	expect(response.status).toBe(201);
	expect(createEvidenceSpy).toHaveBeenCalled();
});

test("site verification PATCH lets a reviewer approve but not a steward", async () => {
	const response = await patchEvidence(
		new Request("http://localhost/api/internal/site-verification", {
			method: "PATCH",
			headers: {
				authorization: auth("reviewer-1"),
				"content-type": "application/json",
			},
			body: JSON.stringify({
				evidenceId,
				action: "approve",
				note: "Source reviewed by pilot steward.",
			}),
		}),
	);
	expect(response.status).toBe(200);
	expect(reviewEvidenceSpy).toHaveBeenCalledWith(
		expect.objectContaining({
			evidenceId,
			action: "approve",
			actor: "reviewer-1",
		}),
	);
	const stewardResponse = await patchEvidence(
		new Request("http://localhost/api/internal/site-verification", {
			method: "PATCH",
			headers: {
				authorization: auth("steward-1"),
				"content-type": "application/json",
			},
			body: JSON.stringify({
				evidenceId,
				action: "approve",
				note: "Steward cannot approve this evidence.",
			}),
		}),
	);
	expect(stewardResponse.status).toBe(401);
});

test("legal review GET and PATCH expose persistence and append-only review action", async () => {
	const list = await getLegal(
		new Request("http://localhost/api/internal/legal-readiness", {
			headers: { authorization: auth("reviewer-1") },
		}),
	);
	expect(list.status).toBe(200);
	const update = await patchLegal(
		new Request("http://localhost/api/internal/legal-readiness", {
			method: "PATCH",
			headers: {
				authorization: auth("reviewer-1"),
				"content-type": "application/json",
			},
			body: JSON.stringify({
				entity: "reference",
				id: evidenceId,
				status: "effective",
				note: "Reviewed against official source.",
			}),
		}),
	);
	expect(update.status).toBe(200);
	expect(reviewLegalSpy).toHaveBeenCalledWith(
		expect.objectContaining({ id: evidenceId, actor: "reviewer-1" }),
	);
});
