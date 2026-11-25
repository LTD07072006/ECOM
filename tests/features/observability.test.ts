import { describe, expect, test } from "bun:test";
import {
	createTelemetryStore,
	summarizeTelemetry,
	type ApiTelemetryEvent,
} from "../../src/lib/observability";

const event = (
	overrides: Partial<ApiTelemetryEvent> = {},
): ApiTelemetryEvent => ({
	route: "site_visit_routes",
	status: 200,
	durationMs: 100,
	outcome: "success",
	provider: "wemap",
	fallback: false,
	cache: "miss",
	...overrides,
});

describe("observability telemetry", () => {
	test("summarizes latency, errors, quota and fallbacks", () => {
		const summary = summarizeTelemetry([
			event({ durationMs: 10 }),
			event({ durationMs: 50, fallback: true, outcome: "fallback" }),
			event({ durationMs: 90, status: 429, outcome: "quota" }),
			event({
				durationMs: 110,
				status: 503,
				outcome: "error",
				provider: "wemap",
			}),
		]);

		expect(summary).toMatchObject({
			requests: 4,
			errors: 1,
			quota: 1,
			fallbacks: 1,
			p50: 50,
			p95: 110,
		});
	});

	test("keeps an in-memory store bounded and exposes safe summaries", () => {
		const store = createTelemetryStore(2);
		store.record(event({ route: "search", durationMs: 1 }));
		store.record(event({ route: "profile", durationMs: 2 }));
		store.record(event({ route: "export", durationMs: 3 }));

		expect(store.events()).toHaveLength(2);
		expect(store.summary().routes.map((row) => row.route)).toEqual([
			"profile",
			"export",
		]);
	});

	test("does not include request contents in the event contract", () => {
		const candidate = event() as Record<string, unknown>;
		expect(candidate).not.toHaveProperty("url");
		expect(candidate).not.toHaveProperty("query");
		expect(candidate).not.toHaveProperty("coordinates");
		expect(candidate).not.toHaveProperty("token");
	});

	test("filters events by the requested time window", () => {
		const store = createTelemetryStore(10);
		const now = Date.now();
		store.record(event({ occurredAt: now - 2 * 60 * 60 * 1000 }));
		store.record(event({ occurredAt: now - 10 * 60 * 60 * 1000 }));

		expect(store.events({ hours: 6, now }).length).toBe(1);
	});

	test("summarizes only the filtered route events", () => {
		const summary = summarizeTelemetry([
			event({ route: "site_visit_routes", durationMs: 10 }),
			event({ route: "search", durationMs: 900 }),
		]);
		expect(summary.routes).toEqual([
			{ route: "site_visit_routes", requests: 1, p50: 10, p95: 10 },
			{ route: "search", requests: 1, p50: 900, p95: 900 },
		]);
	});
});
