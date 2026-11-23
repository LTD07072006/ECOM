import { expect, test } from "bun:test";
import {
	estimateFiveYears,
	estimateSensitivity,
} from "../../src/features/decision/capex-opex";

const assumptions = {
	areaM2: 100,
	workers: 2,
	annualMWh: 3,
	annualRevenue: [1000, 2000, 3000, 4000, 5000],
	margin: 0.2,
	rentPerM2Year: 10,
	monthlyWage: 100,
	electricityPerKWh: 2,
	upfront: 500,
	baselineCit: 0.2,
};

test("annual cash costs reconcile and shocks affect the selected inputs", () => {
	const result = estimateFiveYears(assumptions);
	expect(result?.yearlyBreakdown).toHaveLength(5);
	expect(
		result?.yearlyBreakdown.reduce((sum, year) => sum + year.totalNet, 0),
	).toBeCloseTo(result?.net ?? NaN);
	expect(estimateSensitivity(assumptions, {}, 20, -10)?.delta).toBeCloseTo(
		-2000,
	);
	expect(estimateSensitivity(assumptions, {}, 25, 0)).toBeNull();
});

test("uses five years of costs, converts MWh, and applies only the selected scenario", () => {
	const result = estimateFiveYears(assumptions, {
		citRates: [0, 0, 0, 0, 0.05],
		eligibleAnnualLandRent: 100,
		landExemptYears: 3,
	});
	expect(result).toMatchObject({
		rent: 5000,
		labor: 12000,
		power: 30000,
		citSavings: 550,
		citPaid: 50,
		landSavings: 300,
		net: 47250,
	});
});

test("rejects missing assumptions and land relief larger than annual rent", () => {
	expect(
		estimateFiveYears({ ...assumptions, annualRevenue: [1000] }),
	).toBeNull();
	expect(
		estimateFiveYears(assumptions, {
			eligibleAnnualLandRent: 1001,
			landExemptYears: 3,
		}),
	).toBeNull();
});

test("defaults to baseline CIT and charges no income tax on losses", () => {
	expect(estimateFiveYears(assumptions)).toMatchObject({
		citPaid: 600,
		citSavings: 0,
		landSavings: 0,
		net: 48100,
	});
	expect(estimateFiveYears({ ...assumptions, margin: -0.2 })).toMatchObject({
		citPaid: 0,
		net: 47500,
	});
});

test("rejects incomplete schedules, fractional headcount and nonfinite inputs", () => {
	expect(estimateFiveYears(assumptions, { citRates: [0] })).toBeNull();
	expect(
		estimateFiveYears(assumptions, { citRates: [0, 0, 0, 0, 0.3] }),
	).toBeNull();
	expect(estimateFiveYears({ ...assumptions, workers: 0.5 })).toBeNull();
	expect(
		estimateFiveYears({ ...assumptions, rentPerM2Year: Number.NaN }),
	).toBeNull();
});
