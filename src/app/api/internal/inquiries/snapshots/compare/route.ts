import { z } from "zod";
import {
	snapshotMethodNotAllowed,
	withStewardSnapshot,
} from "../../../../../../features/inquiries/snapshot-http";
import {
	auditInquiryReportSnapshots,
	buildSnapshotComparison,
	getInquiryReportSnapshot,
} from "../../../../../../features/inquiries/snapshots";
import { error, json, readBoundedJson } from "../../../../../../lib/http";

export const dynamic = "force-dynamic";
const comparisonSchema = z.strictObject({ left: z.uuid(), right: z.uuid() });

export function GET(request: Request) {
	return snapshotMethodNotAllowed(
		request,
		"POST",
		"Use POST to compare report snapshots.",
	);
}

export function POST(request: Request) {
	return withStewardSnapshot(request, async (identity) => {
		const body = await readBoundedJson(request, 1024);
		if (!body.ok) return error(body.message, body.status);
		const parsed = comparisonSchema.safeParse(body.value);
		if (!parsed.success || parsed.data.left === parsed.data.right)
			return error("Two different snapshot IDs are required.", 400);
		const [left, right] = await Promise.all([
			getInquiryReportSnapshot(parsed.data.left),
			getInquiryReportSnapshot(parsed.data.right),
		]);
		if (!left || !right) return error("Report snapshot not found.", 404);
		const comparison = buildSnapshotComparison(
			{
				snapshotId: left.snapshot_id,
				periodStart: left.period_start.toISOString(),
				periodEnd: left.period_end.toISOString(),
				timeZone: left.time_zone,
				formulaVersion: left.formula_version,
				filters: left.filters,
				metrics: left.metrics,
			},
			{
				snapshotId: right.snapshot_id,
				periodStart: right.period_start.toISOString(),
				periodEnd: right.period_end.toISOString(),
				timeZone: right.time_zone,
				formulaVersion: right.formula_version,
				filters: right.filters,
				metrics: right.metrics,
			},
		);
		if (!comparison.compatible)
			return json(
				{
					error: "Snapshots are not compatible.",
					diagnostics: comparison.diagnostics,
					data: comparison,
				},
				{ status: 409 },
			);
		await auditInquiryReportSnapshots(
			[left.snapshot_id, right.snapshot_id],
			identity.actor,
			"compared",
		);
		return json({ data: comparison });
	});
}
