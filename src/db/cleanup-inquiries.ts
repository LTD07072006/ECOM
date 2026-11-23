import "dotenv/config";
import { cleanupExpiredInquiries } from "../features/inquiries/repository";
import { cleanupExpiredInquiryReportSnapshots } from "../features/inquiries/snapshots";
import { errorCode } from "../lib/api-operations";
import { databasePool } from "./pool";

const apply = process.argv.includes("--apply");
const monitor = process.argv.includes("--monitor");
const sql = databasePool();

try {
	if (monitor) {
		const [health] = await sql<
			{ last_status: string | null; healthy: boolean }[]
		>`
      with latest_run as (
        select status
        from market_entry.inquiry_retention_runs
        order by started_at desc
        limit 1
      ),
      latest_succeeded as (
        select started_at, finished_at
        from market_entry.inquiry_retention_runs
        where status = 'succeeded'
        order by finished_at desc nulls last, started_at desc
        limit 1
      )
      select
        (select status from latest_run) as last_status,
        coalesce(
          (
            select finished_at is not null
              and finished_at >= now() - interval '30 hours'
            from latest_succeeded
          ),
          false
        )
          and not exists (
            select 1
            from market_entry.inquiry_retention_runs failed
            cross join latest_succeeded
            where failed.status = 'failed'
              and failed.started_at > latest_succeeded.started_at
          )
          and not exists (
            select 1
            from market_entry.inquiry_retention_runs running
            where running.status = 'running'
              and running.started_at < now() - interval '15 minutes'
          ) as healthy
    `;
		const healthy = Boolean(health?.healthy);
		console.log(
			JSON.stringify({
				event: "retention_health",
				healthy,
				lastStatus: health?.last_status ?? null,
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
} catch (cause) {
	console.error(
		JSON.stringify({ event: "retention_failed", code: errorCode(cause) }),
	);
	process.exitCode = 1;
} finally {
	await sql.end({ timeout: 5 });
}
