import { z } from "zod";
import {
	getInquiry,
	InquiryError,
	recordInquiryAccess,
	updateInquiry,
} from "../../../../../features/inquiries/repository";
import {
	closeReasons,
	inquiryReferencePattern,
	inquiryStatuses,
} from "../../../../../features/inquiries/validation";
import { releaseIdentity } from "../../../../../features/releases/authorization";
import { boundedQuery, observeApi } from "../../../../../lib/api-operations";
import { error, json, readBoundedJson } from "../../../../../lib/http";

export const dynamic = "force-dynamic";

const updateSchema = z
	.strictObject({
		status: z.enum(inquiryStatuses).optional(),
		closeReason: z.enum(closeReasons).optional(),
		note: z.string().trim().min(1).max(5000).optional(),
	})
	.refine(
		(value) => value.status || value.note,
		"An inquiry update is required.",
	);

export async function GET(
	request: Request,
	context: { params: Promise<{ referenceCode: string }> },
) {
	return observeApi(
		"internal",
		request,
		async () => {
			const identity = releaseIdentity(request);
			if (!identity || identity.role !== "steward")
				return error("A valid steward access token is required.", 401);
			if (!boundedQuery(request))
				return error("Unexpected inquiry parameters.", 400);
			const { referenceCode } = await context.params;
			if (!inquiryReferencePattern.test(referenceCode))
				return error("Inquiry not found.", 404);
			const result = await getInquiry(referenceCode);
			if (!result) return error("Inquiry not found.", 404);
			await recordInquiryAccess({
				actor: identity.actor,
				action: "viewed_detail",
				inquiryId: result.inquiry.inquiry_id,
			});
			return json({ data: result });
		},
		true,
	);
}

export async function PATCH(
	request: Request,
	context: { params: Promise<{ referenceCode: string }> },
) {
	return observeApi(
		"internal",
		request,
		async () => {
			const identity = releaseIdentity(request);
			if (!identity || identity.role !== "steward")
				return error("A valid steward access token is required.", 401);
			if (!boundedQuery(request))
				return error("Unexpected inquiry parameters.", 400);
			const { referenceCode } = await context.params;
			if (!inquiryReferencePattern.test(referenceCode))
				return error("Inquiry not found.", 404);
			const body = await readBoundedJson(request, 32_000);
			if (!body.ok) return error(body.message, body.status);
			const parsed = updateSchema.safeParse(body.value);
			if (!parsed.success)
				return error("Provide a valid status, close reason, or note.", 400);
			try {
				await updateInquiry(referenceCode, parsed.data, identity.actor);
				return json({ updated: true, referenceCode });
			} catch (cause) {
				if (cause instanceof InquiryError) {
					return error(cause.message, cause.status);
				}
				throw cause;
			}
		},
		true,
	);
}
