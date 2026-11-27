import type { WemapRouteLike } from "../site-visit/route-assessment";
import type {
	CatalogueLogisticsDestination,
	LogisticsLegResult,
} from "./logistics-network";

export type LogisticsRouteProvider = (
	origin: [number, number],
	destination: [number, number],
) => Promise<WemapRouteLike>;

export type LogisticsBaseline = {
	distanceMeters: number;
	durationSeconds: number;
	observedOn: string;
	sourceUrl: string;
};

export type LogisticsRoutingOptions = {
	requestRoute: LogisticsRouteProvider;
	baselineFor?: (
		destination: CatalogueLogisticsDestination,
	) => LogisticsBaseline | null;
	concurrency?: number;
};

export type LogisticsRouteLeg = LogisticsLegResult & {
	provider: string;
	fallback: boolean;
	geometry?: WemapRouteLike["geometry"];
	observedOn?: string;
	sourceUrl?: string;
};

function validMeasurement(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function errorCategory(error: unknown): LogisticsLegResult["errorCategory"] {
	const code = (error as { code?: unknown } | null)?.code;
	if (code === "ETIMEDOUT" || code === "ECONNABORTED") return "timeout";
	if (code === "QUOTA_EXCEEDED" || code === "429") return "quota";
	if (code === "INVALID_RESPONSE") return "invalid_response";
	return "provider_error";
}

async function calculateLeg(
	origin: [number, number],
	destination: CatalogueLogisticsDestination,
	options: LogisticsRoutingOptions,
): Promise<LogisticsRouteLeg> {
	try {
		const route = await options.requestRoute(origin, [
			destination.longitude,
			destination.latitude,
		]);
		if (
			!validMeasurement(route.distance) ||
			!validMeasurement(route.duration) ||
			route.geometry.type !== "LineString" ||
			route.geometry.coordinates.length < 2
		)
			throw Object.assign(new Error("Invalid provider response"), {
				code: "INVALID_RESPONSE",
			});
		return {
			destinationCode: destination.code,
			status: "live",
			distanceMeters: route.distance,
			durationSeconds: route.duration,
			provider: route.provider ?? "wemap",
			fallback: false,
			geometry: route.geometry,
		};
	} catch (error) {
		const baseline = options.baselineFor?.(destination) ?? null;
		if (
			baseline &&
			validMeasurement(baseline.distanceMeters) &&
			validMeasurement(baseline.durationSeconds) &&
			baseline.observedOn.trim() &&
			baseline.sourceUrl.trim()
		) {
			return {
				destinationCode: destination.code,
				status: "baseline",
				distanceMeters: baseline.distanceMeters,
				durationSeconds: baseline.durationSeconds,
				provider: "dated-baseline",
				fallback: true,
				observedOn: baseline.observedOn,
				sourceUrl: baseline.sourceUrl,
			};
		}
		return {
			destinationCode: destination.code,
			status: "unavailable",
			distanceMeters: null,
			durationSeconds: null,
			provider: "none",
			fallback: false,
			errorCategory: errorCategory(error),
		};
	}
}

export async function calculateLogisticsConnections(
	origin: [number, number],
	destinations: readonly CatalogueLogisticsDestination[],
	options: LogisticsRoutingOptions,
): Promise<LogisticsRouteLeg[]> {
	if (
		!validCoordinate(origin[0], -180, 180) ||
		!validCoordinate(origin[1], -90, 90)
	)
		throw new Error("Invalid origin coordinates");
	const requestedConcurrency = options.concurrency ?? 3;
	const concurrency = Math.max(
		1,
		Math.min(
			8,
			Number.isFinite(requestedConcurrency)
				? Math.floor(requestedConcurrency)
				: 3,
		),
	);
	const result: LogisticsRouteLeg[] = [];
	let cursor = 0;
	async function worker() {
		while (cursor < destinations.length) {
			const index = cursor++;
			const destination = destinations[index];
			if (destination)
				result[index] = await calculateLeg(origin, destination, options);
		}
	}
	await Promise.all(
		Array.from({ length: Math.min(concurrency, destinations.length) }, worker),
	);
	return result;
}

function validCoordinate(
	value: unknown,
	min: number,
	max: number,
): value is number {
	return (
		typeof value === "number" &&
		Number.isFinite(value) &&
		value >= min &&
		value <= max
	);
}
