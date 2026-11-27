import type { InfrastructureKind } from "./layers";

export const LOGISTICS_DESTINATION_KINDS: readonly InfrastructureKind[] = [
	"airport",
	"seaport",
	"icd",
	"expressway_node",
];

export type LogisticsDestination = {
	code: string;
	name: string;
	kind: InfrastructureKind;
	longitude: number;
	latitude: number;
	provinceCode: string;
	provinceName: string;
	referenceUrl: string;
};

export const catalogueDestinationBrand: unique symbol = Symbol(
	"catalogue-logistics-destination",
);
export type CatalogueLogisticsDestination = LogisticsDestination & {
	readonly [catalogueDestinationBrand]: true;
};

export type LogisticsLegStatus =
	| "pending"
	| "live"
	| "baseline"
	| "unavailable";

export type LogisticsLegResult = {
	destinationCode: string;
	status: LogisticsLegStatus;
	distanceMeters?: number | null;
	durationSeconds?: number | null;
	provider?: string;
	fallback?: boolean;
	geometry?: unknown;
	observedOn?: string;
	sourceUrl?: string;
	errorCategory?: "provider_error" | "timeout" | "quota" | "invalid_response";
};

export type LogisticsNetwork = {
	origin: { longitude: number; latitude: number };
	destinations: LogisticsDestination[];
	legs: LogisticsLegResult[];
	status: "queued" | "running" | "partial" | "completed";
	summary: { live: number; baseline: number; unavailable: number };
};

function assertCoordinate(
	value: number,
	name: string,
	min: number,
	max: number,
) {
	if (!Number.isFinite(value) || value < min || value > max)
		throw new Error(`Invalid origin ${name}`);
}

function assertDestination(destination: LogisticsDestination) {
	if (!LOGISTICS_DESTINATION_KINDS.includes(destination.kind))
		throw new Error("Invalid logistics destination kind");
	if (!destination.code.trim() || !destination.name.trim())
		throw new Error("Invalid destination identity");
	if (
		!Number.isFinite(destination.longitude) ||
		destination.longitude < -180 ||
		destination.longitude > 180
	)
		throw new Error("Invalid destination longitude");
	if (
		!Number.isFinite(destination.latitude) ||
		destination.latitude < -90 ||
		destination.latitude > 90
	)
		throw new Error("Invalid destination latitude");
	if (!destination.referenceUrl.trim())
		throw new Error("Invalid destination reference");
}

function assertLegResult(
	result: LogisticsLegResult,
	destinationCodes: Set<string>,
) {
	if (!destinationCodes.has(result.destinationCode))
		throw new Error("Invalid route result destination");
	if (
		(result.status === "live" || result.status === "baseline") &&
		(!Number.isFinite(result.distanceMeters) ||
			(result.distanceMeters ?? 0) <= 0 ||
			!Number.isFinite(result.durationSeconds) ||
			(result.durationSeconds ?? 0) <= 0)
	)
		throw new Error("Invalid route result measurement");
	if (
		result.status === "unavailable" &&
		(result.distanceMeters != null || result.durationSeconds != null)
	)
		throw new Error("Unavailable route must not have measurements");
}

export function getLogisticsDestinations(
	destinations: readonly LogisticsDestination[],
): LogisticsDestination[] {
	return destinations.filter((destination) =>
		LOGISTICS_DESTINATION_KINDS.includes(destination.kind),
	);
}

export function selectLogisticsDestinations(
	catalogue: readonly LogisticsDestination[],
	selectedCodes: readonly string[],
): CatalogueLogisticsDestination[] {
	const selected = new Set(selectedCodes);
	return getLogisticsDestinations(catalogue)
		.filter((destination) => selected.has(destination.code))
		.map((destination) => {
			const snapshot = { ...destination } as CatalogueLogisticsDestination;
			Object.defineProperty(snapshot, catalogueDestinationBrand, {
				value: true,
			});
			return snapshot;
		});
}

export function resolveNetworkStatus(
	legs: readonly Pick<LogisticsLegResult, "status">[],
): LogisticsNetwork["status"] {
	if (legs.length === 0) return "queued";
	if (legs.some((leg) => leg.status === "pending")) return "running";
	if (legs.some((leg) => leg.status === "unavailable")) return "partial";
	return "completed";
}

export function createLogisticsNetwork(
	origin: { longitude: number; latitude: number },
	destinations: readonly CatalogueLogisticsDestination[],
	results: readonly LogisticsLegResult[] = [],
): LogisticsNetwork {
	assertCoordinate(origin.longitude, "longitude", -180, 180);
	assertCoordinate(origin.latitude, "latitude", -90, 90);
	const approved = destinations;
	const codes = new Set<string>();
	for (const destination of approved) {
		if (!(catalogueDestinationBrand in destination))
			throw new Error("Destination must come from catalogue");
		assertDestination(destination);
		if (codes.has(destination.code)) throw new Error("duplicate destination");
		codes.add(destination.code);
	}
	const resultCodes = new Set<string>();
	for (const result of results) {
		assertLegResult(result, codes);
		if (resultCodes.has(result.destinationCode))
			throw new Error("duplicate result");
		resultCodes.add(result.destinationCode);
	}
	const snapshot = approved
		.slice(0, 20)
		.map((destination) => ({ ...destination }));
	const snapshotCodes = new Set(
		snapshot.map((destination) => destination.code),
	);
	for (const result of results) {
		if (!snapshotCodes.has(result.destinationCode))
			throw new Error("Invalid route result outside snapshot");
	}
	const resultByCode = new Map(
		results.map((result) => [result.destinationCode, result]),
	);
	const legs = snapshot.map(
		(destination) =>
			resultByCode.get(destination.code) ?? {
				destinationCode: destination.code,
				status: "pending" as const,
			},
	);
	const summary = {
		live: legs.filter((leg) => leg.status === "live").length,
		baseline: legs.filter((leg) => leg.status === "baseline").length,
		unavailable: legs.filter((leg) => leg.status === "unavailable").length,
	};
	return {
		origin: { ...origin },
		destinations: snapshot,
		legs,
		status: resolveNetworkStatus(legs),
		summary,
	};
}
