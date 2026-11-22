import { databasePool } from "../src/db/pool";
import {
	countInquiryReportRows,
	inquiryAnalytics,
	listInquiries,
} from "../src/features/inquiries/repository";

const rowCount = Number(process.env.BENCH_ROWS ?? "10000");
const rounds = Number(process.env.BENCH_ROUNDS ?? "15");

function percentile(values: number[], p: number) {
	const sorted = [...values].sort((a, b) => a - b);
	return (
		sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? 0
	);
}

async function run() {
	const database = new URL(process.env.DATABASE_URL ?? "");
	if (
		database.hostname !== "127.0.0.1" ||
		!/^\/ecom_bench_[a-z0-9_]+$/.test(database.pathname)
	) {
		throw new Error(
			"Benchmark requires a disposable local database named ecom_bench_* on 127.0.0.1.",
		);
	}
	const sql = databasePool();
	try {
		await sql`truncate market_entry.inquiry_audit, market_entry.inquiry_notifications, market_entry.investor_inquiries cascade`;
		const startedSeed = performance.now();
		await sql`
      insert into market_entry.investor_inquiries (
        reference_code, email, message, country, sector, status, close_reason, provenance, created_at, updated_at, retention_at
      )
      select
        'INQ-2026-' || lpad(to_hex(i), 8, '0'),
        'bench-' || i || '@example.test',
        'Synthetic load benchmark inquiry',
        case (i % 5) when 0 then 'Japan' when 1 then 'Korea' when 2 then 'Singapore' when 3 then 'Vietnam' else 'Germany' end,
        case (i % 4) when 0 then 'Retail' when 1 then 'Manufacturing' when 2 then 'Logistics' else 'Enterprise' end,
        case (i % 4) when 0 then 'new' when 1 then 'contacted' when 2 then 'qualified' else 'closed' end,
        case when (i % 4) = 3 then 'resolved' else null end,
        '{}'::jsonb,
        now() - ((i % 90) || ' days')::interval,
        now() - ((i % 45) || ' days')::interval,
        now() + interval '1 year'
      from generate_series(1, ${rowCount}) as i
    `;
		const seedMs = Math.round(performance.now() - startedSeed);

		const analyticsTimes: number[] = [];
		const listTimes: number[] = [];
		const countTimes: number[] = [];
		const from = new Date(Date.now() - 60 * 86_400_000);
		const to = new Date();

		for (let i = 0; i < rounds; i += 1) {
			let t0 = performance.now();
			await inquiryAnalytics({ from, to });
			analyticsTimes.push(performance.now() - t0);

			t0 = performance.now();
			await listInquiries({ from, to, page: 1, pageSize: 50 });
			listTimes.push(performance.now() - t0);

			t0 = performance.now();
			await countInquiryReportRows({ from, to });
			countTimes.push(performance.now() - t0);
		}

		const rssMb = Math.round(process.memoryUsage().rss / (1024 * 1024));
		console.info(
			JSON.stringify(
				{
					event: "inquiry_benchmark",
					rows: rowCount,
					rounds,
					seedMs,
					peakRssMb: rssMb,
					analyticsMs: {
						p50: Math.round(percentile(analyticsTimes, 0.5)),
						p95: Math.round(percentile(analyticsTimes, 0.95)),
					},
					listPageMs: {
						p50: Math.round(percentile(listTimes, 0.5)),
						p95: Math.round(percentile(listTimes, 0.95)),
					},
					countMs: {
						p50: Math.round(percentile(countTimes, 0.5)),
						p95: Math.round(percentile(countTimes, 0.95)),
					},
				},
				null,
				2,
			),
		);
	} finally {
		await sql.end();
	}
}

await run();
