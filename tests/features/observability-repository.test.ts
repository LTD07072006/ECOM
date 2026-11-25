import { describe, expect, test } from "bun:test";
import {
	toObservabilityBucket,
	toMinuteBucket,
} from "../../src/features/observability/repository";

describe("observability aggregate persistence", () => {
	test("normalizes an event into a minute bucket without request data", () => {
		const bucket = toObservabilityBucket(
			{
				route: "site_visit_routes",
				status: 503,
				durationMs: 1_234,
				outcome: "fallback",
				provider: "wemap",
				fallback: true,
				cache: "bypass",
			},
			new Date("2026-11-25T10:14:45.123Z"),
		);

		expect(bucket).toEqual({
			bucketStart: "2026-11-25T10:14:00.000Z",
			route: "site_visit_routes",
			provider: "wemap",
			status: 503,
			requests: 1,
			errors: 1,
			quota: 0,
			fallbacks: 1,
			cacheHits: 0,
			cacheMisses: 0,
			latencies: [1234],
		});
	});

	test("truncates timestamps to the start of the minute", () => {
		expect(
			toMinuteBucket(new Date("2026-11-25T10:14:59.999Z")).toISOString(),
		).toBe("2026-11-25T10:14:00.000Z");
	});

	test("bounds latency samples when merging a bucket", () => {
		const samples = Array.from({ length: 300 }, (_, index) => index);
		const { mergeLatencySamples } =
			require("../../src/features/observability/repository") as typeof import("../../src/features/observability/repository");
		expect(mergeLatencySamples(samples, [300])).toHaveLength(256);
		expect(mergeLatencySamples(samples, [300])[0]).toBe(45);
	});
});
