import { inquirySubmissionSchema } from "../../../features/inquiries/validation";
import { createInquiry } from "../../../features/inquiries/repository";
import { inquiryPrivacyContact } from "../../../features/inquiries/privacy";
import { observeApi } from "../../../lib/api-operations";
import { error, json, readBoundedJson } from "../../../lib/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return observeApi("inquiries", request, async () => {
    const body = await readBoundedJson(request, 64_000);
    if (!body.ok) return error(body.message, body.status);
    const parsed = inquirySubmissionSchema.safeParse(body.value);
    if (!parsed.success) {
      const fields = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0] ?? "request")))];
      return json({ error: "Please correct the inquiry form.", fields }, { status: 400 });
    }
    if (process.env.NODE_ENV === "production" && !inquiryPrivacyContact()) {
      return error("Inquiry submission is temporarily unavailable.", 503);
    }

    const result = await createInquiry(parsed.data);
    return json({
      submitted: true,
      referenceCode: result.referenceCode,
      message: "Your request has been received.",
    }, { status: 201 });
  });
}
