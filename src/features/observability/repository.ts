import type { ApiTelemetryEvent } from "../../lib/observability";
import {
	summarizeTelemetry,
	type TelemetrySummary,
} from "../../lib/observability";
import { databasePool } from "../../db/pool";

export type ObservabilityBucket = {
	bucketStart: string;
	route: string;
	provider: string;
	status: number;
	requests: number;
	errors: number;
	quota: number;
	fallbacks: number;
	cacheHits: number;
	cacheMisses: number;
	latencies: number[];
};

const MAX_LATENCY_SAMPLES = 256;

export function mergeLatencySamples(
	existing: readonly number[],
	added: readonly number[],
): number[] {
	return [...existing, ...added].slice(-MAX_LATENCY_SAMPLES);
}

export function toMinuteBucket(date: Date): Date {
	const bucket = new Date(date);
	bucket.setUTCSeconds(0, 0);
	return bucket;
}

export function toObservabilityBucket(
	event: ApiTelemetryEvent,
	date: Date,
): ObservabilityBucket {
	return {
		bucketStart: toMinuteBucket(date).toISOString(),
		route: event.route,
		provider: event.provider ?? "none",
		status: event.status,
		requests: 1,
		errors: event.status >= 500 || event.outcome === "error" ? 1 : 0,
		quota: event.status === 429 || event.outcome === "quota" ? 1 : 0,
		fallbacks: event.fallback || event.outcome === "fallback" ? 1 : 0,
		cacheHits: event.cache === "hit" ? 1 : 0,
		cacheMisses: event.cache === "miss" ? 1 : 0,
		latencies: [Math.max(0, Math.round(event.durationMs))],
	};
}

export async function persistObservabilityEvent(
	event: ApiTelemetryEvent,
	date = new Date(),
): Promise<void> {
	const bucket = toObservabilityBucket(event, date);
	const sql = databasePool();
	await sql`
		insert into market_entry.api_observability_buckets
			(bucket_start, route, provider, status, requests, errors, quota, fallbacks, cache_hits, cache_misses, latencies)
		values (
			${bucket.bucketStart}, ${bucket.route}, ${bucket.provider}, ${bucket.status},
			${bucket.requests}, ${bucket.errors}, ${bucket.quota}, ${bucket.fallbacks},
			${bucket.cacheHits}, ${bucket.cacheMisses}, ${sql.json(bucket.latencies)}
		)
		on conflict (bucket_start, route, provider, status) do update set
			requests = api_observability_buckets.requests + excluded.requests,
			errors = api_observability_buckets.errors + excluded.errors,
			quota = api_observability_buckets.quota + excluded.quota,
			fallbacks = api_observability_buckets.fallbacks + excluded.fallbacks,
			cache_hits = api_observability_buckets.cache_hits + excluded.cache_hits,
			cache_misses = api_observability_buckets.cache_misses + excluded.cache_misses,
			latencies = (
				select coalesce(jsonb_agg(sample.value order by sample.ordinal), '[]'::jsonb)
				from (
					select value, ordinal
					from jsonb_array_elements(api_observability_buckets.latencies) with ordinality as existing(value, ordinal)
					union all
					select value, ordinal + 1000000
					from jsonb_array_elements(excluded.latencies) with ordinality as added(value, ordinal)
					order by ordinal desc
					limit 256
				) as sample
			),
			updated_at = now()
	`;
}

export async function pruneObservabilityBuckets(days = 30): Promise<void> {
	const sql = databasePool();
	await sql`
		delete from market_entry.api_observability_buckets
		where bucket_start < now() - (${days} * interval '1 day')
	`;
}

export async function queryPersistedObservability({
	hours,
	route,
}: {
	hours: number;
	route?: string;
}): Promise<TelemetrySummary> {
	const sql = databasePool();
	const rows = await sql<
		{
			route: string;
			requests: number;
			errors: number;
			quota: number;
			fallbacks: number;
			latencies: number[];
		}[]
	>`
		select route, sum(requests)::int as requests, sum(errors)::int as errors,
			sum(quota)::int as quota, sum(fallbacks)::int as fallbacks,
			coalesce(jsonb_agg(latency.value), '[]'::jsonb) as latencies
		from market_entry.api_observability_buckets,
			jsonb_array_elements(latencies) as latency(value)
		where bucket_start >= now() - (${hours} * interval '1 hour')
			${route ? sql`and route = ${route}` : sql``}
		group by route
	`;
	const events: ApiTelemetryEvent[] = rows.flatMap((row) =>
		(row.latencies ?? []).map(
			(durationMs) =>
				({
					route: row.route,
					status: row.errors ? 500 : 200,
					durationMs,
					outcome: row.errors ? "error" : "success",
					fallback: row.fallbacks > 0,
					cache: "bypass",
				}) satisfies ApiTelemetryEvent,
		),
	);
	return summarizeTelemetry(events);
}
