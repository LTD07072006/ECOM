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
	return Object.values(result).every(Number.isFinite) ? result : null;
}
