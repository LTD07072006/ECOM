import { z } from "zod";
import { releaseIdentity, releaseRole } from "../../../../../features/releases/authorization";
import { getInquiry, updateInquiry } from "../../../../../features/inquiries/repository";
import { closeReasons, inquiryStatuses } from "../../../../../features/inquiries/validation";
import { observeApi } from "../../../../../lib/api-operations";
import { error, json } from "../../../../../lib/http";

export const dynamic = "force-dynamic";

const updateSchema = z.strictObject({
  status: z.enum(inquiryStatuses).optional(),
  closeReason: z.enum(closeReasons).optional(),
  note: z.string().trim().min(1).max(5000).optional(),
}).refine((value) => value.status || value.note, "An inquiry update is required.");

export async function GET(request: Request, context: { params: Promise<{ referenceCode: string }> }) {
  return observeApi("internal", request, async () => {
    if (releaseRole(request) !== "steward") return error("A valid steward access token is required.", 401);
    const { referenceCode } = await context.params;
    const result = await getInquiry(referenceCode);
    return result ? json({ data: result }) : error("Inquiry not found.", 404);
  });
}

export async function PATCH(request: Request, context: { params: Promise<{ referenceCode: string }> }) {
  return observeApi("internal", request, async () => {
    if (releaseRole(request) !== "steward") return error("A valid steward access token is required.", 401);
    if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return error("A JSON request is required.", 415);
    let body: unknown;
    try { body = await request.json(); } catch { return error("Invalid JSON.", 400); }
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) return error("Provide a valid status, close reason, or note.", 400);
    const { referenceCode } = await context.params;
    try {
      await updateInquiry(referenceCode, parsed.data, releaseIdentity(request)!.actor);
      return json({ updated: true, referenceCode });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Unable to update inquiry.";
      return error(message === "Inquiry not found." ? message : "Unable to update inquiry.", message === "Inquiry not found." ? 404 : 409);
    }
  });
}
