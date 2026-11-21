import { z } from "zod";
import { countInquiryReportRows, inquiryAnalytics } from "../../../../../features/inquiries/repository";
import { createInquiryReportSnapshot, getInquiryReportSnapshot, listInquiryReportSnapshots, visibleSnapshot } from "../../../../../features/inquiries/snapshots";
import { canonicalSnapshotInput, validateSnapshotMetrics } from "../../../../../features/inquiries/snapshots";
import { snapshotMethodNotAllowed, withStewardSnapshot } from "../../../../../features/inquiries/snapshot-http";
import { error, json, readBoundedJson } from "../../../../../lib/http";
import { releaseIdentity } from "../../../../../features/releases/authorization";

export const dynamic = "force-dynamic";

const snapshotSchema = z.object({
  periodStart: z.coerce.date(),
  periodEnd: z.coerce.date(),
  timeZone: z.string().min(1).max(64).default("UTC"),
  correctsSnapshotId: z.string().uuid().optional(),
  preview: z.boolean().default(false),
  filters: z.object({
    status: z.enum(["new", "contacted", "qualified", "closed"]).optional(),
    country: z.string().max(100).optional(),
    sector: z.string().max(160).optional(),
    referenceCode: z.string().max(32).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    geographyIds: z.array(z.string().uuid()).optional(),
  }),
});

export function GET(request: Request) {
  return withStewardSnapshot(request, async () => json({ data: (await listInquiryReportSnapshots()).map(visibleSnapshot) }));
}

export function PATCH(request: Request) {
  return snapshotMethodNotAllowed(request, "GET, POST", "Report snapshots are immutable. Create a correction snapshot.");
}

export function DELETE(request: Request) {
  return snapshotMethodNotAllowed(request, "GET, POST", "Report snapshots can only be deleted by retention cleanup.");
}

export function POST(request: Request) {
  return withStewardSnapshot(request, async () => {
    const body = await readBoundedJson(request, 16_000);
    if (!body.ok) return error(body.message, body.status);
    const parsed = snapshotSchema.safeParse(body.value);
    if (!parsed.success || parsed.data.periodEnd <= parsed.data.periodStart) return error("Invalid report snapshot.", 400);
    try {
      new Intl.DateTimeFormat("en", { timeZone: parsed.data.timeZone });
    } catch {
      return error("Invalid report timezone.", 400);
    }
    const canonical = canonicalSnapshotInput(parsed.data);
    const filters = { ...canonical.filters, from: canonical.periodStart, to: canonical.periodEnd };
    if (parsed.data.preview) return json({ data: { total: await countInquiryReportRows(filters) } });
    const metrics = await inquiryAnalytics(filters);
    if (!validateSnapshotMetrics(metrics).ok) return error("Report metrics failed consistency checks.", 500);
    if (parsed.data.correctsSnapshotId && !await getInquiryReportSnapshot(parsed.data.correctsSnapshotId)) return error("Correction source snapshot not found.", 400);
    const snapshot = await createInquiryReportSnapshot({
      ...canonical,
      metrics,
      correctsSnapshotId: parsed.data.correctsSnapshotId,
      createdBy: releaseIdentity(request)!.actor,
    });
    return json({ data: visibleSnapshot(snapshot) }, { status: 201 });
  });
}
