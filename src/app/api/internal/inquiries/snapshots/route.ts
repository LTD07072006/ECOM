import { z } from "zod";
import { releaseRole } from "../../../../../features/releases/authorization";
import { countInquiryReportRows, inquiryReportRows } from "../../../../../features/inquiries/repository";
import { buildInquiryAnalytics } from "../../../../../features/inquiries/reporting";
import { createInquiryReportSnapshot, getInquiryReportSnapshot, listInquiryReportSnapshots } from "../../../../../features/inquiries/snapshots";
import { canonicalSnapshotInput, validateSnapshotMetrics } from "../../../../../features/inquiries/snapshots";
import { error, json } from "../../../../../lib/http";

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

function authorized(request: Request) {
  return releaseRole(request) === "steward";
}

export async function GET(request: Request) {
  if (!authorized(request)) return error("A valid steward access token is required.", 401);
  return json({ data: await listInquiryReportSnapshots() });
}

export async function PATCH() {
  return error("Report snapshots are immutable; create a correction snapshot instead.", 405);
}

export async function DELETE() {
  return error("Report snapshots are immutable; retention cleanup is the only deletion path.", 405);
}

export async function POST(request: Request) {
  if (!authorized(request)) return error("A valid steward access token is required.", 401);
  const parsed = snapshotSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.periodEnd <= parsed.data.periodStart) return error("Invalid report snapshot.", 400);
  try {
    new Intl.DateTimeFormat("en", { timeZone: parsed.data.timeZone });
  } catch {
    return error("Invalid report timezone.", 400);
  }
  const canonical = canonicalSnapshotInput(parsed.data);
  const filters = { ...canonical.filters, from: canonical.periodStart, to: canonical.periodEnd };
  if (parsed.data.preview) return json({ data: { ...canonical, total: await countInquiryReportRows(filters) } },
    { headers: { "Cache-Control": "no-store" } });
  const rows = await inquiryReportRows(filters);
  const metrics = buildInquiryAnalytics(rows);
  if (!validateSnapshotMetrics(metrics).ok) return error("Report metrics failed consistency checks.", 500);
  if (parsed.data.correctsSnapshotId && !await getInquiryReportSnapshot(parsed.data.correctsSnapshotId)) return error("Correction source snapshot not found.", 400);
  const snapshot = await createInquiryReportSnapshot({
    ...canonical,
    metrics,
    correctsSnapshotId: parsed.data.correctsSnapshotId,
    createdBy: "steward",
  });
  return json({ data: snapshot }, { status: 201 });
}
