import { releaseRole } from "../../../../../../features/releases/authorization";
import { auditInquiryReportSnapshot, getInquiryReportSnapshot, snapshotMetricsCsv } from "../../../../../../features/inquiries/snapshots";
import { error } from "../../../../../../lib/http";

export async function GET(request: Request) {
  if (releaseRole(request) !== "steward") return error("A valid steward access token is required.", 401);
  const snapshotId = new URL(request.url).searchParams.get("id");
  if (!snapshotId) return error("A snapshot ID is required.", 400);
  const snapshot = await getInquiryReportSnapshot(snapshotId);
  if (!snapshot) return error("Report snapshot not found.", 404);
  await auditInquiryReportSnapshot(snapshot.snapshot_id, "steward", "exported");
  const csv = snapshotMetricsCsv({ snapshotId: snapshot.snapshot_id, periodStart: snapshot.period_start.toISOString(), periodEnd: snapshot.period_end.toISOString(), timeZone: snapshot.time_zone, formulaVersion: snapshot.formula_version, filters: snapshot.filters as Record<string, unknown>, metrics: snapshot.metrics });
  return new Response(csv, { status: 200, headers: { "Cache-Control": "no-store", "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename=snapshot-${snapshot.snapshot_id}.csv` } });
}
