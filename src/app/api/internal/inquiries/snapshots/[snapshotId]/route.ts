import { snapshotMethodNotAllowed, withStewardSnapshot } from "../../../../../../features/inquiries/snapshot-http";
import { getInquiryReportSnapshot, snapshotGeographyNames, visibleSnapshot } from "../../../../../../features/inquiries/snapshots";
import { uuidPattern } from "../../../../../../lib/api-operations";
import { error, json } from "../../../../../../lib/http";

export const dynamic = "force-dynamic";

export function GET(request: Request, context: { params: Promise<{ snapshotId: string }> }) {
  return withStewardSnapshot(request, async () => {
    const { snapshotId } = await context.params;
    if (!uuidPattern.test(snapshotId)) return error("Invalid report snapshot ID.", 400);
    const snapshot = await getInquiryReportSnapshot(snapshotId);
    if (!snapshot) return error("Report snapshot not found.", 404);
    return json({ data: { ...visibleSnapshot(snapshot), geography_names: await snapshotGeographyNames(snapshot.filters.geographyIds) } });
  });
}

export function PATCH(request: Request) {
  return snapshotMethodNotAllowed(request, "GET", "Report snapshots are immutable. Create a correction snapshot.");
}

export function DELETE(request: Request) {
  return snapshotMethodNotAllowed(request, "GET", "Report snapshots can only be deleted by retention cleanup.");
}
