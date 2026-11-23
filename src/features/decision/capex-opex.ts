export type FiveYearAssumptions = {
	areaM2: number;
	workers: number;
	annualMWh: number;
	annualRevenue: readonly number[];
	margin: number;
	rentPerM2Year: number;
	monthlyWage: number;
	electricityPerKWh: number;
	upfront: number;
	baselineCit: number;
};
export type FiveYearRelief = {
	citRates?: readonly number[];
	eligibleAnnualLandRent?: number;
	landExemptYears?: number;
};
const nonnegative = (value: number) => Number.isFinite(value) && value >= 0;

export function estimateFiveYears(
	input: FiveYearAssumptions,
	relief: FiveYearRelief = {},
) {
	const {
		areaM2,
		workers,
		annualMWh,
		annualRevenue,
		margin,
		rentPerM2Year,
		monthlyWage,
		electricityPerKWh,
		upfront,
		baselineCit,
	} = input;
	if (
		![
			areaM2,
			workers,
			annualMWh,
			rentPerM2Year,
			monthlyWage,
			electricityPerKWh,
			upfront,
			...annualRevenue,
		].every(nonnegative) ||
		annualRevenue.length !== 5 ||
		!Number.isSafeInteger(workers) ||
		!Number.isFinite(margin) ||
		margin > 1 ||
		!nonnegative(baselineCit) ||
		baselineCit > 1
	)
		return null;
	const annualRent = areaM2 * rentPerM2Year;
	const eligible = relief.eligibleAnnualLandRent ?? 0;
	const years = relief.landExemptYears ?? 0;
	const rates = relief.citRates ?? annualRevenue.map(() => baselineCit);
	if (
		!nonnegative(eligible) ||
		eligible > annualRent ||
		!Number.isInteger(years) ||
		years < 0 ||
		years > 5 ||
		rates.length !== 5 ||
		!rates.every((rate) => nonnegative(rate) && rate <= baselineCit)
	)
		return null;
	const profit = annualRevenue.map((revenue) => Math.max(0, revenue * margin));
	const baselineTax = profit.reduce(
		(sum, value) => sum + value * baselineCit,
		0,
	);
	const citPaid = profit.reduce(
		(sum, value, year) => sum + value * rates[year],
		0,
	);
	const rent = annualRent * 5;
	const labor = workers * monthlyWage * 60;
	const power = annualMWh * 1000 * electricityPerKWh * 5;
	const landSavings = eligible * years;
	const result = {
		upfront,
		rent,
		labor,
		power,
		citPaid,
		citSavings: baselineTax - citPaid,
		landSavings,
		net: upfront + rent + labor + power + citPaid - landSavings,
	};
	if (!Object.values(result).every(Number.isFinite)) return null;
	return {
		...result,
		yearlyBreakdown: profit.map((value, index) => {
			const capex = index === 0 ? upfront : 0;
			const rent = annualRent - (index < years ? eligible : 0);
			const wage = labor / 5;
			const electricity = power / 5;
			const cit = value * rates[index];
			return {
				year: index + 1,
				capex,
				rent,
				wage,
				electricity,
				cit,
				totalNet: capex + rent + wage + electricity + cit,
			};
		}),
	};
}

export function estimateSensitivity(
	input: FiveYearAssumptions,
	relief: FiveYearRelief,
	rentShock: number,
	elecShock: number,
) {
	if (
		![rentShock, elecShock].every(
			(value) =>
				Number.isFinite(value) && Math.abs(value) <= 20 && value % 5 === 0,
		)
	)
		return null;
	const baseline = estimateFiveYears(input, relief);
	if (!baseline) return null;
	const rentPerM2Year = input.rentPerM2Year * (1 + rentShock / 100);
	const estimate = estimateFiveYears(
		{
			...input,
			rentPerM2Year,
			electricityPerKWh: input.electricityPerKWh * (1 + elecShock / 100),
		},
		{
			...relief,
			eligibleAnnualLandRent: Math.min(
				relief.eligibleAnnualLandRent ?? 0,
				input.areaM2 * rentPerM2Year,
			),
		},
	);
	if (!estimate) return null;
	const delta = estimate.net - baseline.net;
	return {
		estimate,
		delta,
		percent: baseline.net > 0 ? (delta / baseline.net) * 100 : null,
	};
}
