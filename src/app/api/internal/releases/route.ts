import { z } from "zod";
import { releaseIdentity } from "../../../../features/releases/authorization";
import {
	applyReleaseAction,
	releaseOverview,
} from "../../../../features/releases/operations";
import { boundedQuery, observeApi } from "../../../../lib/api-operations";
import { error, json, readBoundedJson } from "../../../../lib/http";

export const dynamic = "force-dynamic";

const actionSchema = z.strictObject({
	batchId: z.uuid(),
	action: z.enum(["approve", "publish", "retire"]),
	note: z.string().trim().min(10).max(500),
});

export function GET(request: Request) {
	return observeApi(
		"internal",
		request,
		async () => {
			const identity = releaseIdentity(request);
			if (!identity)
				return error("A valid release access token is required.", 401);
			if (!boundedQuery(request))
				return error("Unexpected release parameters.", 400);
			return json({
				role: identity.role,
				actor: identity.actor,
				data: await releaseOverview(),
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
			if (!identity)
				return error("A valid release access token is required.", 401);
			const { role, actor } = identity;
			if (!boundedQuery(request))
				return error("Unexpected release parameters.", 400);
			const body = await readBoundedJson(request, 4096);
			if (!body.ok) return error(body.message, body.status);
			const parsed = actionSchema.safeParse(body.value);
			if (!parsed.success)
				return error(
					"Provide a release action and a note of 10 to 500 characters.",
					400,
				);
			const { action, batchId, note } = parsed.data;
			if (
				(action === "approve" && role !== "reviewer") ||
				(action !== "approve" && role !== "steward")
			) {
				return error(
					"This release role cannot perform the requested action.",
					403,
				);
			}
			const result = await applyReleaseAction(
				batchId,
				action,
				role,
				note,
				actor,
			);
			return result.message
				? error(result.message, result.status)
				: json({ data: { batchId, action } });
		},
		true,
	);
}
