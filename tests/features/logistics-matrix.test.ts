import { describe, expect, test } from "bun:test";
import {
	filterLogisticsMatrix,
	toLogisticsMatrixRows,
	type LogisticsMatrixLeg,
} from "../../src/features/map/logistics-matrix";

const destinations = [
	{
		code: "P-1",
		name: "Port One",
		kind: "seaport" as const,
		longitude: 106,
		latitude: 21,
		provinceCode: "31",
		provinceName: "Hai Phong",
		referenceUrl: "https://example.test/port",
	},
	{
		code: "A-1",
		name: "Airport One",
		kind: "airport" as const,
		longitude: 105,
		latitude: 21,
		provinceCode: "31",
		provinceName: "Hai Phong",
		referenceUrl: "https://example.test/airport",
	},
];

const legs: LogisticsMatrixLeg[] = [
	{
		destinationCode: "P-1",
		status: "baseline",
		distanceMeters: 2_000,
		durationSeconds: 120,
		provider: "dated-baseline",
		fallback: true,
		observedOn: "2026-11-01",
		sourceUrl: "https://example.test/baseline",
	},
	{
		destinationCode: "A-1",
		status: "unavailable",
		distanceMeters: null,
		durationSeconds: null,
		provider: "none",
		fallback: false,
		errorCategory: "timeout",
	},
];

describe("logistics route matrix", () => {
	test("creates rows in destination order and keeps full leg metadata", () => {
		const rows = toLogisticsMatrixRows(destinations, legs);
		expect(rows.map((row) => row.destinationCode)).toEqual(["P-1", "A-1"]);
		expect(rows[0]).toMatchObject({
			name: "Port One",
			kind: "seaport",
			status: "baseline",
			fallback: true,
		});
		expect(rows[1]).toMatchObject({
			name: "Airport One",
			status: "unavailable",
			errorCategory: "timeout",
		});
	});

	test("filters by destination kind and route status", () => {
		expect(
			filterLogisticsMatrix(toLogisticsMatrixRows(destinations, legs), {
				kind: "airport",
			}).map((row) => row.destinationCode),
		).toEqual(["A-1"]);
		expect(
			filterLogisticsMatrix(toLogisticsMatrixRows(destinations, legs), {
				status: "baseline",
			}).map((row) => row.destinationCode),
		).toEqual(["P-1"]);
	});

	test("does not invent rows for unknown leg results", () => {
		const rows = toLogisticsMatrixRows(destinations, [
			...legs,
			{
				destinationCode: "UNKNOWN",
				status: "live",
				distanceMeters: 1,
				durationSeconds: 1,
				provider: "x",
				fallback: false,
			},
		]);
		expect(rows).toHaveLength(2);
	});

	test("shows a pending row when a selected destination has no leg yet", () => {
		const firstLeg = legs[0];
		expect(firstLeg).toBeDefined();
		const rows = toLogisticsMatrixRows(
			destinations,
			firstLeg ? [firstLeg] : [],
		);
		expect(rows).toHaveLength(2);
		expect(rows[1]).toMatchObject({
			destinationCode: "A-1",
			status: "pending",
		});
	});
});
