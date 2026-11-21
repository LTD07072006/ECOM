import { releaseRole } from "../../../../../../features/releases/authorization";
import { getInquiryReportSnapshot, snapshotGeographyNames } from "../../../../../../features/inquiries/snapshots";
import { error, json } from "../../../../../../lib/http";

export async function GET(request: Request, context: { params: Promise<{ snapshotId: string }> }) {
  if (releaseRole(request) !== "steward") return error("A valid steward access token is required.", 401);
  const { snapshotId } = await context.params;
  const snapshot = await getInquiryReportSnapshot(snapshotId);
  if (!snapshot) return error("Report snapshot not found.", 404);
  return json({ data: { ...snapshot, geography_names: await snapshotGeographyNames(snapshot.filters.geographyIds) } });
}

export async function PATCH(_request: Request, _context: { params: Promise<{ snapshotId: string }> }) {
  return error("Report snapshots are immutable; create a correction snapshot instead.", 405);
}

export async function DELETE() {
  return error("Report snapshots are immutable; retention cleanup is the only deletion path.", 405);
}
