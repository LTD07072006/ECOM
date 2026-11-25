import { describe, expect, test } from "bun:test";
import { getTelemetryStore } from "../../src/lib/observability";

describe("API observability", () => {
	test("records a safe aggregate event for an observed response", () => {
		const store = getTelemetryStore();
		store.clear();
		store.record({
			route: "site_visit_routes",
			status: 429,
			durationMs: 12,
			outcome: "quota",
			provider: "none",
			fallback: false,
			cache: "bypass",
		});
		expect(store.summary()).toMatchObject({ requests: 1, quota: 1 });
		expect(store.events()[0]).not.toHaveProperty("url");
	});
});
