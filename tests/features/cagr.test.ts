import { expect, test } from "bun:test";
import { calculateCagr } from "../../src/features/profile/trend";
import type { ObservationPoint } from "../../src/features/geography/types";

function point(year: number, value: number | null): ObservationPoint {
	return {
		period: String(year),
		periodStart: `${year}-01-01`,
		periodEnd: `${year}-12-31`,
		value,
		quality: "verified",
		datasetVersion: "test",
	};
}

test("compounds over elapsed consecutive annual periods", () => {
	expect(
		calculateCagr([point(2020, 100), point(2021, 110), point(2022, 121)]),
	).toBeCloseTo(10);
});

test("rejects unavailable points, nonannual periods and duplicate years", () => {
	const first = point(2020, 100);
	const last = point(2021, 110);
	expect(
		calculateCagr([first, { ...last, quality: "unavailable" }]),
	).toBeNull();
	expect(
		calculateCagr([first, { ...last, periodStart: "2021-04-01" }]),
	).toBeNull();
	expect(calculateCagr([first, last, last])).toBeNull();
	expect(calculateCagr([point(2021, 80), first])).toBeCloseTo(-20);
});

test("does not bridge missing periods or use nonpositive values", () => {
	for (const history of [
		[point(2020, 100)],
		[point(2020, 0), point(2021, 110)],
		[point(2020, 100), point(2021, null), point(2022, 121)],
		[point(2020, 100), point(2022, 121)],
	])
		expect(calculateCagr(history)).toBeNull();
});
