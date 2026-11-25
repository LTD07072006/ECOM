import { describe, expect, test } from "bun:test";
import { parseObservabilityQuery } from "../../src/features/observability/metrics-query";

describe("observability metrics query", () => {
	test("accepts a bounded time window and safe route filters", () => {
		const result = parseObservabilityQuery(
			new URLSearchParams("hours=6&route=site_visit_routes"),
		);
		expect(result).toEqual({ hours: 6, route: "site_visit_routes" });
	});

	test("rejects excessive windows and unknown route labels", () => {
		expect(() =>
			parseObservabilityQuery(new URLSearchParams("hours=25")),
		).toThrow();
		expect(() =>
			parseObservabilityQuery(new URLSearchParams("route=raw-query")),
		).toThrow();
	});
});
