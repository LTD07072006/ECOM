import { describe, expect, test } from "bun:test";
import { cacheHeaders } from "../../src/lib/cache-policy";

describe("cache policy", () => {
	test("caches published context briefly and revalidates stale data", () => {
		expect(cacheHeaders("published-context")).toEqual({
			"Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
		});
	});

	test("does not cache live route results", () => {
		expect(cacheHeaders("live-route")).toEqual({
			"Cache-Control": "private, no-store",
		});
	});
});
