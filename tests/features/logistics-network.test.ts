import { describe, expect, test } from "bun:test";
import {
	createLogisticsNetwork,
	getLogisticsDestinations,
	selectLogisticsDestinations,
	resolveNetworkStatus,
	type LogisticsDestination,
	type LogisticsLegResult,
} from "../../src/features/map/logistics-network";

const destination = (
	code: string,
	kind: LogisticsDestination["kind"] = "seaport",
) => ({
	code,
	name: code,
	kind,
	longitude: 106,
	latitude: 21,
	provinceCode: "31",
	provinceName: "Hai Phong",
	referenceUrl: "https://example.test/source",
});

const select = (...items: ReturnType<typeof destination>[]) =>
	selectLogisticsDestinations(
		items,
		items.map((item) => item.code),
	);

const origin = { longitude: 105.8, latitude: 21 };

describe("logistics network day one domain", () => {
	test("accepts at most twenty catalogue destinations and snapshots them", () => {
		const catalogue = Array.from({ length: 21 }, (_, index) =>
			destination(`D-${index}`),
		);
		const selected = selectLogisticsDestinations(
			catalogue,
			catalogue.map((item) => item.code),
		);
		const network = createLogisticsNetwork(origin, selected);
		expect(network.destinations).toHaveLength(20);
		expect(network.destinations[0]).toEqual(catalogue[0]);
		expect(network.destinations).not.toBe(selected);
	});

	test("requires destinations to come from the catalogue selector", () => {
		expect(() =>
			createLogisticsNetwork(origin, [destination("FAKE")] as never),
		).toThrow("catalogue");
	});

	test("rejects duplicate destinations and invalid coordinates", () => {
		expect(() =>
			createLogisticsNetwork(
				origin,
				select(destination("D-1"), destination("D-1")),
			),
		).toThrow("duplicate");
		expect(() =>
			createLogisticsNetwork({ longitude: 300, latitude: 21 }, []),
		).toThrow("origin");
	});

	test("preserves partial failures without turning them into zero-distance success", () => {
		const results: LogisticsLegResult[] = [
			{
				destinationCode: "D-1",
				status: "live",
				distanceMeters: 1000,
				durationSeconds: 60,
			},
			{
				destinationCode: "D-2",
				status: "unavailable",
				distanceMeters: null,
				durationSeconds: null,
				errorCategory: "provider_error",
			},
		];
		const network = createLogisticsNetwork(
			origin,
			select(destination("D-1"), destination("D-2")),
			results,
		);
		expect(network.status).toBe("partial");
		expect(network.summary).toEqual({ live: 1, baseline: 0, unavailable: 1 });
		expect(network.legs[1]?.distanceMeters).toBeNull();
	});

	test("preserves route metadata on network legs", () => {
		const network = createLogisticsNetwork(origin, select(destination("D-1")), [
			{
				destinationCode: "D-1",
				status: "baseline",
				distanceMeters: 2_000,
				durationSeconds: 120,
				provider: "dated-baseline",
				fallback: true,
				observedOn: "2026-11-01",
				sourceUrl: "https://example.test/baseline",
			},
		]);
		expect(network.legs[0]).toMatchObject({
			provider: "dated-baseline",
			fallback: true,
			observedOn: "2026-11-01",
		});
	});

	test("rejects malformed destinations and route results", () => {
		expect(() =>
			createLogisticsNetwork(
				origin,
				select({ ...destination("D-1"), longitude: 999 }),
			),
		).toThrow("destination");
		expect(() =>
			createLogisticsNetwork(origin, select(destination("D-1")), [
				{
					destinationCode: "D-404",
					status: "live",
					distanceMeters: 1,
					durationSeconds: 1,
				},
			]),
		).toThrow("result");
		expect(() =>
			createLogisticsNetwork(origin, select(destination("D-1")), [
				{
					destinationCode: "D-1",
					status: "live",
					distanceMeters: null,
					durationSeconds: null,
				},
			]),
		).toThrow("measurement");
	});

	test("rejects a branded destination outside the approved logistics kinds", () => {
		const selected = selectLogisticsDestinations(
			[destination("PARK", "industrial_park")],
			["PARK"],
		);
		expect(selected).toHaveLength(0);
	});

	test("requires unavailable legs to omit measurements", () => {
		expect(() =>
			createLogisticsNetwork(origin, select(destination("D-1")), [
				{
					destinationCode: "D-1",
					status: "unavailable",
					distanceMeters: 0,
					durationSeconds: 0,
				},
			]),
		).toThrow("Unavailable");
	});

	test("rejects duplicate results and results outside the snapshot", () => {
		expect(() =>
			createLogisticsNetwork(origin, select(destination("D-1")), [
				{
					destinationCode: "D-1",
					status: "live",
					distanceMeters: 1,
					durationSeconds: 1,
				},
				{
					destinationCode: "D-1",
					status: "live",
					distanceMeters: 2,
					durationSeconds: 2,
				},
			]),
		).toThrow("duplicate result");
		const catalogue = Array.from({ length: 21 }, (_, index) =>
			destination(`D-${index}`),
		);
		expect(() =>
			createLogisticsNetwork(
				origin,
				selectLogisticsDestinations(
					catalogue,
					catalogue.map((item) => item.code),
				),
				[
					{
						destinationCode: "D-20",
						status: "live",
						distanceMeters: 1,
						durationSeconds: 1,
					},
				],
			),
		).toThrow("snapshot");
	});

	test("resolves pending, complete and approved destination states", () => {
		expect(resolveNetworkStatus([])).toBe("queued");
		expect(resolveNetworkStatus([{ status: "pending" }])).toBe("running");
		expect(resolveNetworkStatus([{ status: "live" }])).toBe("completed");
		expect(
			getLogisticsDestinations([
				destination("port"),
				destination("park", "industrial_park"),
			]).map((item) => item.code),
		).toEqual(["port"]);
		expect(
			selectLogisticsDestinations(
				[destination("D-1")],
				["D-1", "not-in-catalogue"],
			).map((item) => item.code),
		).toEqual(["D-1"]);
	});
});
