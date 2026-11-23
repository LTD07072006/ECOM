import type { SectorId } from "./model";

export type ScreeningSector = SectorId | "electronics";
export type WageRegion = "I" | "II" | "III" | "IV";
export type InfrastructurePriority =
	| "deep_port"
	| "international_airport"
	| "expressway";
export type ScreeningInput = {
	sector: ScreeningSector;
	areaM2: number | null;
	infrastructure: InfrastructurePriority | "any";
	region: WageRegion | "any";
};
export type ScreeningCandidate = {
	id: string;
	provinceId: string;
	sectors: readonly ScreeningSector[] | null;
	availableAreaM2: number | null;
	infrastructure: readonly InfrastructurePriority[] | null;
	wageRegion: WageRegion | null;
};

export function screenLocations<T extends ScreeningCandidate>(
	input: ScreeningInput,
	candidates: readonly T[],
) {
	type Criterion = "sector" | "area" | "infrastructure" | "region";
	const evaluated = candidates
		.flatMap((candidate) => {
			const checks: [Criterion, boolean | null][] = [
				["sector", candidate.sectors?.includes(input.sector) ?? null],
			];
			if (input.areaM2 !== null)
				checks.push([
					"area",
					candidate.availableAreaM2 === null
						? null
						: candidate.availableAreaM2 >= input.areaM2,
				]);
			if (input.infrastructure !== "any")
				checks.push([
					"infrastructure",
					candidate.infrastructure?.includes(input.infrastructure) ?? null,
				]);
			if (input.region !== "any")
				checks.push([
					"region",
					candidate.wageRegion === null
						? null
						: candidate.wageRegion === input.region,
				]);
			if (checks.some(([, value]) => value === false)) return [];
			const reasons = checks
				.filter(([, value]) => value === true)
				.map(([criterion]) => criterion);
			return [
				{
					...candidate,
					reasons,
					score: reasons.length,
					missing: checks
						.filter(([, value]) => value === null)
						.map(([criterion]) => criterion),
				},
			];
		})
		.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id, "en"));
	return {
		matches: evaluated.filter((item) => !item.missing.length).slice(0, 5),
		needsVerification: evaluated
			.filter((item) => item.missing.length)
			.slice(0, 5),
	};
}
