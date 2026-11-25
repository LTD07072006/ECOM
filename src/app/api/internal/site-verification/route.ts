import { z } from "zod";
import {
	createVerificationEvidenceRecord,
	listVerificationEvidence,
	reviewVerificationEvidence,
} from "../../../../features/decision/site-verification-repository";
import { releaseIdentity } from "../../../../features/releases/authorization";
import { boundedQuery, observeApi } from "../../../../lib/api-operations";
import { error, json, readBoundedJson } from "../../../../lib/http";
import { safeSourceUrl } from "../../../../lib/source-url";

export const dynamic = "force-dynamic";

const createSchema = z.strictObject({
	parkId: z.string().trim().min(3).max(80),
	field: z.enum([
		"area",
		"region",
		"power",
		"wastewater",
		"sector",
		"infrastructure",
	]),
	value: z.unknown(),
	sourceUrl: z.string().trim().max(300),
	verifiedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	expiresOn: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional(),
});
const reviewSchema = z.strictObject({
	evidenceId: z.uuid(),
	action: z.enum(["approve", "reject", "revalidate"]),
	note: z.string().trim().min(10).max(1000),
});

export function GET(request: Request) {
	return observeApi(
		"internal",
		request,
		async () => {
			const identity = releaseIdentity(request);
			if (!identity)
				return error("A valid review access token is required.", 401);
			if (!boundedQuery(request))
				return error("Unexpected review parameters.", 400);
			return json({
				data: await listVerificationEvidence(),
				actor: identity.actor,
				role: identity.role,
			});
		},
		true,
	);
}

export function POST(request: Request) {
	return observeApi(
		"internal",
		request,
		async () => {
			const identity = releaseIdentity(request);
			if (!identity || identity.role !== "steward")
				return error("A valid steward access token is required.", 401);
			const body = await readBoundedJson(request, 16_384);
			if (!body.ok) return error(body.message, body.status);
			const parsed = createSchema.safeParse(body.value);
			if (
				!parsed.success ||
				!safeSourceUrl(parsed.data.sourceUrl) ||
				(parsed.data.expiresOn &&
					parsed.data.expiresOn < parsed.data.verifiedOn)
			)
				return error("Invalid site verification evidence payload.", 400);
			const data = await createVerificationEvidenceRecord({
				...parsed.data,
				actor: identity.actor,
			});
			return json({ data }, { status: 201 });
		},
		true,
	);
}

export function PATCH(request: Request) {
	return observeApi(
		"internal",
		request,
		async () => {
			const identity = releaseIdentity(request);
			if (!identity || identity.role !== "reviewer")
				return error("A valid reviewer access token is required.", 401);
			const body = await readBoundedJson(request, 8_192);
			if (!body.ok) return error(body.message, body.status);
			const parsed = reviewSchema.safeParse(body.value);
			if (!parsed.success)
				return error("Invalid site verification review payload.", 400);
			const data = await reviewVerificationEvidence({
				...parsed.data,
				actor: identity.actor,
			});
			return data
				? json({ data })
				: error("Evidence review transition is not available.", 409);
		},
		true,
	);
}
