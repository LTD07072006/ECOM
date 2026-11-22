import { inquiryStatusLookupSchema } from "../../../../features/inquiries/validation";
import { lookupPublicInquiryStatus } from "../../../../features/inquiries/repository";
import { observeApi } from "../../../../lib/api-operations";
import { error, json, readBoundedJson } from "../../../../lib/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
	return observeApi(
		"inquiry_status",
		request,
		async () => {
			const body = await readBoundedJson(request, 8_192);
			if (!body.ok) return error(body.message, body.status);

			const parsed = inquiryStatusLookupSchema.safeParse(body.value);
			if (!parsed.success) {
				return json(
					{ error: "Enter a valid inquiry reference code and email address." },
					{ status: 400 },
				);
			}

			const status = await lookupPublicInquiryStatus(
				parsed.data.referenceCode,
				parsed.data.email,
			);
			if (!status) {
				return error(
					"No matching inquiry was found for this reference code and email.",
					404,
				);
			}

			return json({ data: status });
		},
		true,
	);
}
