import { describe, expect, test } from "bun:test";
import {
	buildLogisticsOverview,
	describeLogisticsStatus,
	type LogisticsOverviewLeg,
	normalizeLogisticsRouteResponse,
} from "../../src/features/map/logistics-overview";

const destination = (
	code: string,
	kind: "seaport" | "airport" = "seaport",
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

describe("logistics overview view model", () => {
	test("explains route statuses without implying unavailable data is zero", () => {
		expect(describeLogisticsStatus("live")).toEqual({
			label: "live",
			meaning: "A route calculated from the current routing provider.",
		});
		expect(describeLogisticsStatus("baseline")).toEqual({
			label: "baseline",
			meaning: "A dated or fallback estimate, not a current traffic route.",
		});
		expect(describeLogisticsStatus("unavailable")).toEqual({
			label: "unavailable",
			meaning: "No usable route measurement is available.",
		});
	});
	test("normalizes unavailable API responses without exposing zero measurements", () => {
		expect(
			normalizeLogisticsRouteResponse("D-1", {
				mode: "unavailable",
				distanceMeters: 0,
				durationSeconds: 0,
				provider: "none",
				fallback: false,
			}),
		).toMatchObject({
			destinationCode: "D-1",
			status: "unavailable",
			distanceMeters: null,
			durationSeconds: null,
		});
	});

	test("preserves API error category on unavailable legs", () => {
		expect(
			normalizeLogisticsRouteResponse("D-1", {
				mode: "unavailable",
				distanceMeters: 0,
				durationSeconds: 0,
				provider: "none",
				fallback: false,
				errorCategory: "quota",
			}),
		).toMatchObject({ errorCategory: "quota" });
	});

	test("normalizes malformed live measurements as unavailable", () => {
		expect(
			normalizeLogisticsRouteResponse("D-1", {
				mode: "live",
				distanceMeters: 0,
				durationSeconds: Number.NaN,
				provider: "wemap",
				fallback: false,
			}),
		).toMatchObject({
			status: "unavailable",
			distanceMeters: null,
			durationSeconds: null,
			errorCategory: "invalid_response",
		});
	});
	test("keeps destination order and derives marker plus route data", () => {
		const model = buildLogisticsOverview(
			{ longitude: 105.8, latitude: 21 },
			[destination("P-1"), destination("A-1", "airport")],
			[
				{
					destinationCode: "P-1",
					status: "live",
					distanceMeters: 1000,
					durationSeconds: 60,
					provider: "wemap",
					fallback: false,
					geometry: {
						type: "LineString",
						coordinates: [
							[105.8, 21],
							[106, 21],
						],
					},
				},
				{
					destinationCode: "A-1",
					status: "unavailable",
					distanceMeters: null,
					durationSeconds: null,
					provider: "none",
					fallback: false,
				},
			] satisfies LogisticsOverviewLeg[],
		);

		expect(model.markers.features).toHaveLength(3);
		expect(model.routes).toHaveLength(1);
		expect(model.routes[0]?.destinationCode).toBe("P-1");
		expect(model.summary).toEqual({
			total: 2,
			live: 1,
			baseline: 0,
			unavailable: 1,
		});
	});

	test("never creates a route feature for unavailable legs", () => {
		const model = buildLogisticsOverview(
			{ longitude: 105.8, latitude: 21 },
			[destination("P-1")],
			[
				{
					destinationCode: "P-1",
					status: "unavailable",
					distanceMeters: null,
					durationSeconds: null,
					provider: "none",
					fallback: false,
				},
			],
		);
		expect(model.routeFeatures.features).toHaveLength(0);
	});

	test("keeps route status on rendered features for map selection", () => {
		const model = buildLogisticsOverview(
			{ longitude: 105.8, latitude: 21 },
			[destination("P-1"), destination("A-1", "airport")],
			[
				{
					destinationCode: "P-1",
					status: "baseline",
					distanceMeters: 12000,
					durationSeconds: 1800,
					provider: "dated-baseline",
					fallback: true,
					geometry: {
						type: "LineString",
						coordinates: [
							[105.8, 21],
							[106, 21],
						],
					},
				},
			] satisfies LogisticsOverviewLeg[],
		);
		expect(model.routeFeatures.features[0]?.properties).toEqual({
			destinationCode: "P-1",
			status: "baseline",
		});
	});
});
