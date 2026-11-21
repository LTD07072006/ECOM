import { inquirySubmissionSchema } from "../../../features/inquiries/validation";
import { createInquiry } from "../../../features/inquiries/repository";
import { observeApi } from "../../../lib/api-operations";
import { error, json } from "../../../lib/http";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return observeApi("inquiries", async () => {
    const contentType = request.headers.get("content-type") ?? "";
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (!contentType.toLowerCase().startsWith("application/json") || contentLength > 64_000) {
      return error("A JSON request under 64 KB is required.", 400);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return error("Invalid JSON request.", 400);
    }
    const parsed = inquirySubmissionSchema.safeParse(body);
    if (!parsed.success) {
      const fields = [...new Set(parsed.error.issues.map((issue) => String(issue.path[0] ?? "request")))];
      return json({ error: "Please correct the inquiry form.", fields }, { status: 400 });
    }

    const result = await createInquiry(parsed.data);
    return json({
      submitted: true,
      referenceCode: result.referenceCode,
      message: "Your request has been received.",
    }, { status: 201 });
  });
}
