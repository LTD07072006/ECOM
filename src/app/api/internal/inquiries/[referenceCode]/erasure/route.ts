import {
	eraseInquiryByRequest,
	InquiryError,
} from "../../../../../../features/inquiries/repository";
import {
	inquiryErasureSchema,
	inquiryReferencePattern,
} from "../../../../../../features/inquiries/validation";
import { releaseIdentity } from "../../../../../../features/releases/authorization";
import { boundedQuery, observeApi } from "../../../../../../lib/api-operations";
import { error, json, readBoundedJson } from "../../../../../../lib/http";

export const dynamic = "force-dynamic";

export async function POST(
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
			const body = await readBoundedJson(request, 2_048);
			if (!body.ok) return error(body.message, body.status);
			const parsed = inquiryErasureSchema.safeParse(body.value);
			if (!parsed.success)
				return error(
					"Provide a valid erasure reason and ticket reference.",
					400,
				);
			try {
				const { alreadyAnonymized } = await eraseInquiryByRequest(
					referenceCode,
					parsed.data,
					identity.actor,
				);
				return json({ erased: true, referenceCode, alreadyAnonymized });
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
