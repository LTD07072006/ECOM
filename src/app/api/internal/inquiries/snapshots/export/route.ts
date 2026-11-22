import { z } from "zod";
import {
	snapshotMethodNotAllowed,
	withStewardSnapshot,
} from "../../../../../../features/inquiries/snapshot-http";
import {
	auditInquiryReportSnapshots,
	getInquiryReportSnapshot,
	snapshotMetricsCsv,
} from "../../../../../../features/inquiries/snapshots";
import {
	csvDownload,
	error,
	readBoundedJson,
} from "../../../../../../lib/http";

export const dynamic = "force-dynamic";
const exportSchema = z.strictObject({ id: z.uuid() });

export function GET(request: Request) {
	return snapshotMethodNotAllowed(
		request,
		"POST",
		"Use POST to export a report snapshot.",
	);
}

export function POST(request: Request) {
	return withStewardSnapshot(request, async (identity) => {
		const body = await readBoundedJson(request, 1024);
		if (!body.ok) return error(body.message, body.status);
		const parsed = exportSchema.safeParse(body.value);
		if (!parsed.success) return error("A valid snapshot ID is required.", 400);
		const snapshot = await getInquiryReportSnapshot(parsed.data.id);
		if (!snapshot) return error("Report snapshot not found.", 404);
		const csv = snapshotMetricsCsv({
			snapshotId: snapshot.snapshot_id,
			periodStart: snapshot.period_start.toISOString(),
			periodEnd: snapshot.period_end.toISOString(),
			timeZone: snapshot.time_zone,
			formulaVersion: snapshot.formula_version,
			filters: snapshot.filters,
			metrics: snapshot.metrics,
		});
		await auditInquiryReportSnapshots(
			[snapshot.snapshot_id],
			identity.actor,
			"exported",
		);
		return csvDownload(csv, `snapshot-${snapshot.snapshot_id}.csv`);
	});
}
