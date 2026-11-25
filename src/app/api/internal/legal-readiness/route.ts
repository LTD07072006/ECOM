import { z } from "zod";
import {
	listLegalReviewRecords,
	reviewLegalRecord,
} from "../../../../features/decision/legal-review-repository";
import { releaseIdentity } from "../../../../features/releases/authorization";
import { boundedQuery, observeApi } from "../../../../lib/api-operations";
import { error, json, readBoundedJson } from "../../../../lib/http";

export const dynamic = "force-dynamic";

const reviewSchema = z.strictObject({
	entity: z.enum(["reference", "requirement"]),
	id: z.uuid(),
	status: z.union([
		z.enum([
			"pending_review",
			"effective",
			"partially_effective",
			"expired",
			"repealed",
		]),
		z.enum([
			"to_verify",
			"needs_specialist_review",
			"verified_by_counsel",
			"retired",
		]),
	]),
	note: z.string().trim().min(10).max(1000),
	reviewDueAt: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional(),
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
				return error("Unexpected legal review parameters.", 400);
			return json({
				data: await listLegalReviewRecords(),
				actor: identity.actor,
				role: identity.role,
			});
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
			if (!parsed.success) return error("Invalid legal review payload.", 400);
			if (
				(parsed.data.entity === "reference" &&
					![
						"pending_review",
						"effective",
						"partially_effective",
						"expired",
						"repealed",
					].includes(parsed.data.status)) ||
				(parsed.data.entity === "requirement" &&
					![
						"to_verify",
						"needs_specialist_review",
						"verified_by_counsel",
						"retired",
					].includes(parsed.data.status))
			)
				return error("Status is not valid for this legal record.", 400);
			const data = await reviewLegalRecord({
				...parsed.data,
				actor: identity.actor,
			});
			return data ? json({ data }) : error("Legal record not found.", 404);
		},
		true,
	);
}
