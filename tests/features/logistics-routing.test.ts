import { describe, expect, test } from "bun:test";
import {
	calculateLogisticsConnections,
	type LogisticsRouteProvider,
} from "../../src/features/map/logistics-routing";
import { selectLogisticsDestinations } from "../../src/features/map/logistics-network";

const destination = (code: string, longitude = 106) => ({
	code,
	name: code,
	kind: "seaport" as const,
	longitude,
	latitude: 21,
	provinceCode: "31",
	provinceName: "Hai Phong",
	referenceUrl: "https://example.test/source",
});

const origin = [105.8, 21] as [number, number];
const route = (distance = 1_000) => ({
	distance,
	duration: 60,
	provider: "test-provider",
	geometry: {
		type: "LineString" as const,
		coordinates: [origin, [106, 21]],
	},
});

const selected = (...codes: string[]) =>
	selectLogisticsDestinations(
		codes.map((code, index) => destination(code, 106 + index)),
		codes,
	);

describe("logistics route engine", () => {
	test("returns live legs with provider metadata", async () => {
		const provider: LogisticsRouteProvider = async () => route();
		const legs = await calculateLogisticsConnections(origin, selected("D-1"), {
			requestRoute: provider,
		});

		expect(legs).toHaveLength(1);
		expect(legs[0]).toMatchObject({
			destinationCode: "D-1",
			status: "live",
			distanceMeters: 1_000,
			durationSeconds: 60,
			provider: "test-provider",
			fallback: false,
		});
	});

	test("uses a dated baseline when the provider fails", async () => {
		const legs = await calculateLogisticsConnections(origin, selected("D-1"), {
			requestRoute: async () => {
				throw Object.assign(new Error("timeout"), { code: "ETIMEDOUT" });
			},
			baselineFor: () => ({
				distanceMeters: 2_000,
				durationSeconds: 120,
				observedOn: "2026-11-01",
				sourceUrl: "https://example.test/baseline",
			}),
		});

		expect(legs[0]).toMatchObject({
			status: "baseline",
			distanceMeters: 2_000,
			fallback: true,
			provider: "dated-baseline",
			observedOn: "2026-11-01",
		});
	});

	test("returns unavailable when provider fails and no baseline exists", async () => {
		const legs = await calculateLogisticsConnections(origin, selected("D-1"), {
			requestRoute: async () => {
				throw new Error("provider down");
			},
		});

		expect(legs[0]).toMatchObject({
			status: "unavailable",
			distanceMeters: null,
			durationSeconds: null,
			fallback: false,
			provider: "none",
		});
		expect(legs[0]?.errorCategory).toBe("provider_error");
	});

	test("classifies timeout, quota and malformed provider responses", async () => {
		const cases = [
			{
				error: Object.assign(new Error(), { code: "ETIMEDOUT" }),
				category: "timeout",
			},
			{
				error: Object.assign(new Error(), { code: "QUOTA_EXCEEDED" }),
				category: "quota",
			},
			{
				error: Object.assign(new Error(), { code: "INVALID_RESPONSE" }),
				category: "invalid_response",
			},
		] as const;
		for (const item of cases) {
			const legs = await calculateLogisticsConnections(
				origin,
				selected("D-1"),
				{
					requestRoute: async () => {
						throw item.error;
					},
				},
			);
			expect(legs[0]?.errorCategory).toBe(item.category);
		}
	});

	test("does not use an invalid baseline as a successful fallback", async () => {
		const legs = await calculateLogisticsConnections(origin, selected("D-1"), {
			requestRoute: async () => {
				throw new Error("provider down");
			},
			baselineFor: () => ({
				distanceMeters: 0,
				durationSeconds: 0,
				observedOn: "",
				sourceUrl: "",
			}),
		});
		expect(legs[0]?.status).toBe("unavailable");
	});

	test("treats whitespace-only baseline metadata as invalid", async () => {
		const legs = await calculateLogisticsConnections(origin, selected("D-1"), {
			requestRoute: async () => {
				throw new Error("provider down");
			},
			baselineFor: () => ({
				distanceMeters: 1_000,
				durationSeconds: 60,
				observedOn: "   ",
				sourceUrl: " https://example.test/baseline ",
			}),
		});
		expect(legs[0]?.status).toBe("unavailable");
	});

	test("clamps non-finite concurrency to a usable worker count", async () => {
		const legs = await calculateLogisticsConnections(origin, selected("D-1"), {
			concurrency: Number.NaN,
			requestRoute: async () => route(),
		});
		expect(legs).toHaveLength(1);
		expect(legs[0]?.status).toBe("live");
	});

	test("rejects an invalid origin before making provider calls", async () => {
		let called = false;
		await expect(
			calculateLogisticsConnections([Number.NaN, 21], selected("D-1"), {
				requestRoute: async () => {
					called = true;
					return route();
				},
			}),
		).rejects.toThrow("origin");
		expect(called).toBe(false);
	});

	test("bounds concurrent provider calls and preserves partial results", async () => {
		let active = 0;
		let maximum = 0;
		const legs = await calculateLogisticsConnections(
			origin,
			selected("D-1", "D-2", "D-3"),
			{
				concurrency: 2,
				requestRoute: async (_from, to) => {
					active += 1;
					maximum = Math.max(maximum, active);
					await Promise.resolve();
					active -= 1;
					if (to[0] === 106 && to[1] === 21) return route();
					throw new Error("provider error");
				},
			},
		);

		expect(maximum).toBeLessThanOrEqual(2);
		expect(legs).toHaveLength(3);
		expect(legs.filter((leg) => leg.status === "unavailable")).toHaveLength(2);
	});
});
