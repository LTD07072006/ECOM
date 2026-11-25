import type { SectorId } from "./model";

export type ScreeningSector = SectorId | "electronics";
export type WageRegion = "I" | "II" | "III" | "IV";
export type InfrastructurePriority =
	| "deep_port"
	| "international_airport"
	| "expressway";

type InfrastructureEvidence = {
	kind:
		| "airport"
		| "seaport"
		| "expressway_node"
		| "border_gate"
		| "industrial_park"
		| "icd";
	airportClassification?: "international" | "domestic" | null;
	airportStatus?: "operational" | "planned" | "not_operational" | null;
	airportOperationalStatus?:
		| "operational"
		| "planned"
		| "not_operational"
		| null;
	portType?: "deep_sea" | "coastal" | "river" | "container_terminal" | null;
	portStatus?: "operational" | "planned" | "not_operational" | null;
	portOperationalStatus?: "operational" | "planned" | "not_operational" | null;
	operationalStatus?: "operational" | "planned" | "not_operational" | null;
};

export function infrastructurePrioritiesFromFacilities(
	facilities: readonly InfrastructureEvidence[],
): InfrastructurePriority[] | null {
	let hasUnknownClassification = false;
	const priorities = new Set<InfrastructurePriority>();
	for (const facility of facilities) {
		if (facility.kind === "airport") {
			const status =
				facility.airportOperationalStatus ?? facility.airportStatus;
			if (
				facility.airportClassification === null ||
				status === null ||
				status === undefined
			)
				hasUnknownClassification = true;
			else if (
				facility.airportClassification === "international" &&
				status === "operational"
			)
				priorities.add("international_airport");
		}
		if (facility.kind === "seaport") {
			const status =
				facility.portOperationalStatus ??
				facility.portStatus ??
				facility.operationalStatus;
			if (facility.portType === null || status === null || status === undefined)
				hasUnknownClassification = true;
			else if (facility.portType === "deep_sea" && status === "operational")
				priorities.add("deep_port");
		}
		if (facility.kind === "expressway_node") priorities.add("expressway");
	}
	return hasUnknownClassification && priorities.size === 0
		? null
		: [...priorities];
}
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
			checks.push([
				"area",
				candidate.availableAreaM2 === null
					? null
					: input.areaM2 === null || candidate.availableAreaM2 >= input.areaM2,
			]);
			checks.push([
				"infrastructure",
				candidate.infrastructure === null
					? null
					: input.infrastructure === "any" ||
						candidate.infrastructure.includes(input.infrastructure),
			]);
			checks.push([
				"region",
				candidate.wageRegion === null
					? null
					: input.region === "any" || candidate.wageRegion === input.region,
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
