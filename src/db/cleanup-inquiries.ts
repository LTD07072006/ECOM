import "dotenv/config";
import { cleanupExpiredInquiries } from "../features/inquiries/repository";
import { cleanupExpiredInquiryReportSnapshots } from "../features/inquiries/snapshots";
import { databasePool } from "./pool";

const apply = process.argv.includes("--apply");
const monitor = process.argv.includes("--monitor");
const sql = databasePool();

try {
	if (monitor) {
		const [health] = await sql<{ status: string; recent: boolean }[]>`
      select status, finished_at >= now() - interval '30 hours' as recent
      from market_entry.inquiry_retention_runs order by started_at desc limit 1
    `;
		const healthy = health?.status === "succeeded" && health.recent;
		console.log(
			JSON.stringify({
				event: "retention_health",
				healthy: Boolean(healthy),
				lastStatus: health?.status ?? null,
			}),
		);
		if (!healthy) process.exitCode = 1;
	} else if (!apply) {
		const result = await cleanupExpiredInquiries(apply);
		const snapshots = await cleanupExpiredInquiryReportSnapshots(apply);
		console.log(
			JSON.stringify({
				expired: result.count,
				snapshotsExpired: snapshots.count,
				applied: result.applied,
			}),
		);
	} else {
		const lock = await sql.reserve();
		let acquired = false;
		try {
			const [row] = await lock<
				{ acquired: boolean }[]
			>`select pg_try_advisory_lock(173121, 2) as acquired`;
			acquired = row.acquired;
			if (!acquired) throw new Error("Retention is already running.");
			await lock`update market_entry.inquiry_retention_runs set status = 'failed', finished_at = now() where status = 'running'`;
			const [run] = await lock<
				{ run_id: string }[]
			>`insert into market_entry.inquiry_retention_runs (status) values ('running') returning run_id`;
			try {
				const result = await cleanupExpiredInquiries(apply);
				const snapshots = await cleanupExpiredInquiryReportSnapshots(apply);
				await lock`update market_entry.inquiry_retention_runs set status = 'succeeded', finished_at = now(),
          inquiries_processed = ${result.count}, snapshots_processed = ${snapshots.count} where run_id = ${run.run_id}`;
				console.log(
					JSON.stringify({
						event: "retention_completed",
						inquiries: result.count,
						snapshots: snapshots.count,
					}),
				);
			} catch (cause) {
				await lock`update market_entry.inquiry_retention_runs set status = 'failed', finished_at = now() where run_id = ${run.run_id}`;
				throw cause;
			}
		} finally {
			if (acquired) await lock`select pg_advisory_unlock(173121, 2)`;
			lock.release();
		}
	}
} catch {
	console.error(JSON.stringify({ event: "retention_failed" }));
	process.exitCode = 1;
} finally {
	await sql.end({ timeout: 5 });
}
