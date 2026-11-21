import { releaseRole } from "../../../../../../features/releases/authorization";
import { auditInquiryReportSnapshot, getInquiryReportSnapshot } from "../../../../../../features/inquiries/snapshots";
import { buildSnapshotComparison } from "../../../../../../features/inquiries/snapshots";
import { error, json } from "../../../../../../lib/http";

export async function GET(request: Request) {
  if (releaseRole(request) !== "steward") return error("A valid steward access token is required.", 401);
  const url = new URL(request.url);
  const leftId = url.searchParams.get("left");
  const rightId = url.searchParams.get("right");
  if (!leftId || !rightId) return error("Two snapshot IDs are required.", 400);
  const [left, right] = await Promise.all([getInquiryReportSnapshot(leftId), getInquiryReportSnapshot(rightId)]);
  if (!left || !right) return error("Report snapshot not found.", 404);
  const comparison = buildSnapshotComparison(
    { snapshotId: left.snapshot_id, periodStart: left.period_start.toISOString(), periodEnd: left.period_end.toISOString(), timeZone: left.time_zone, formulaVersion: left.formula_version, filters: left.filters as Record<string, unknown>, metrics: left.metrics },
    { snapshotId: right.snapshot_id, periodStart: right.period_start.toISOString(), periodEnd: right.period_end.toISOString(), timeZone: right.time_zone, formulaVersion: right.formula_version, filters: right.filters as Record<string, unknown>, metrics: right.metrics },
  );
  if (!comparison.compatible) return json({ error: "Snapshots are not compatible.", diagnostics: comparison.diagnostics, data: comparison }, { status: 409 });
  await Promise.all([auditInquiryReportSnapshot(left.snapshot_id, "steward", "compared"), auditInquiryReportSnapshot(right.snapshot_id, "steward", "compared")]);
  return json({ data: comparison });
}
