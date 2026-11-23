import {
	deliverInquiryNotifications,
	parseRequestLocale,
} from "../../../features/inquiries/notifications";
import { inquiryPrivacyContact } from "../../../features/inquiries/privacy";
import {
	createInquiry,
	InquiryError,
	makeInquiryReference,
} from "../../../features/inquiries/repository";
import { inquirySubmissionSchema } from "../../../features/inquiries/validation";
import { boundedQuery, observeApi } from "../../../lib/api-operations";
import { error, json, readBoundedJson } from "../../../lib/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
	return observeApi("inquiries", request, async () => {
		if (!boundedQuery(request)) {
			return error("Unexpected inquiry parameters.", 400);
		}
		const body = await readBoundedJson(request, 64_000);
		if (!body.ok) return error(body.message, body.status);
		const parsed = inquirySubmissionSchema.safeParse(body.value);
		if (!parsed.success) {
			const fields = [
				...new Set(
					parsed.error.issues
						.map((issue) => String(issue.path[0] ?? "request"))
						.filter((field) => field !== "honeypot"),
				),
			];
			return json(
				fields.length
					? { error: "Please correct the inquiry form.", fields }
					: { error: "Please correct the inquiry form." },
				{ status: 400 },
			);
		}
		if (process.env.NODE_ENV === "production" && !inquiryPrivacyContact()) {
			return error("Inquiry submission is temporarily unavailable.", 503);
		}

		const locale = parseRequestLocale(request);
		let result: Awaited<ReturnType<typeof createInquiry>>;
		try {
			result = await createInquiry(
				parsed.data,
				new Date(),
				makeInquiryReference,
				locale,
			);
		} catch (cause) {
			if (cause instanceof InquiryError) {
				return error(cause.message, cause.status);
			}
			throw cause;
		}
		try {
			await deliverInquiryNotifications(result.inquiryId);
		} catch {
			// Delivery failures stay queued in inquiry_notifications for `bun run mail:flush`.
		}
		return json(
			{
				submitted: true,
				referenceCode: result.referenceCode,
				message: "Your request has been received.",
			},
			{ status: 201 },
		);
	});
}
