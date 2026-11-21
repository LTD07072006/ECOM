import { z } from "zod";
import { releaseIdentity, releaseRole } from "../../../../features/releases/authorization";
import { applyReleaseAction, releaseOverview } from "../../../../features/releases/operations";
import { boundedQuery, observeApi } from "../../../../lib/api-operations";
import { error, json } from "../../../../lib/http";

export const dynamic = "force-dynamic";

const actionSchema = z.strictObject({
  batchId: z.uuid(),
  action: z.enum(["approve", "publish", "retire"]),
  note: z.string().trim().min(10).max(500),
});

export function GET(request: Request) {
  return observeApi("internal", request, async () => {
    const role = releaseRole(request);
    if (!role) return error("A valid release access token is required.", 401);
    if (!boundedQuery(request)) return error("Unexpected release parameters.", 400);
    return json({ role, actor: releaseIdentity(request)!.actor, data: await releaseOverview() });
  });
}

export function POST(request: Request) {
  return observeApi("internal", request, async () => {
    const role = releaseRole(request);
    if (!role) return error("A valid release access token is required.", 401);
    if (!boundedQuery(request)) return error("Unexpected release parameters.", 400);
    if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
      return error("A JSON request is required.", 415);
    }
    const reader = request.body?.getReader();
    if (!reader) return error("A release action and a review note are required.", 400);
    const decoder = new TextDecoder();
    let body = "";
    let size = 0;
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 4096) {
          await reader.cancel();
          return error("The release action is too large.", 413);
        }
        body += decoder.decode(value, { stream: true });
      }
      body += decoder.decode();
    } finally {
      reader.releaseLock();
    }
    let payload: unknown;
    try { payload = JSON.parse(body); } catch { return error("Invalid JSON.", 400); }
    const parsed = actionSchema.safeParse(payload);
    if (!parsed.success) return error("Provide a release action and a note of 10 to 500 characters.", 400);
    const { action, batchId, note } = parsed.data;
    if ((action === "approve" && role !== "reviewer") || (action !== "approve" && role !== "steward")) {
      return error("This release role cannot perform the requested action.", 403);
    }
    const result = await applyReleaseAction(batchId, action, role, note, releaseIdentity(request)!.actor);
    return result.message ? error(result.message, result.status) : json({ data: { batchId, action } });
  });
}
