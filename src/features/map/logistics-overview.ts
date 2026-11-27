import type { FeatureCollection, LineString, Point } from "geojson";
import type {
	LogisticsDestination,
	LogisticsLegResult,
} from "./logistics-network";

export type LogisticsOverviewLeg = LogisticsLegResult & {
	provider: string;
	fallback: boolean;
	geometry?: LineString;
};

export type LogisticsRouteResponse = {
	mode: "live" | "baseline" | "unavailable";
	distanceMeters: number;
	durationSeconds: number;
	provider: string;
	fallback: boolean;
	geometry?: LineString;
	observedOn?: string;
	sourceUrl?: string;
	errorCategory?: LogisticsLegResult["errorCategory"];
};

export function describeLogisticsStatus(
	status: "live" | "baseline" | "unavailable",
): { label: string; meaning: string } {
	if (status === "live")
		return {
			label: "live",
			meaning: "A route calculated from the current routing provider.",
		};
	if (status === "baseline")
		return {
			label: "baseline",
			meaning: "A dated or fallback estimate, not a current traffic route.",
		};
	return {
		label: "unavailable",
		meaning: "No usable route measurement is available.",
	};
}

export function normalizeLogisticsRouteResponse(
	destinationCode: string,
	response: LogisticsRouteResponse,
): LogisticsOverviewLeg {
	const validLive =
		response.mode === "live" &&
		Number.isFinite(response.distanceMeters) &&
		response.distanceMeters > 0 &&
		Number.isFinite(response.durationSeconds) &&
		response.durationSeconds > 0 &&
		response.geometry?.type === "LineString" &&
		response.geometry.coordinates.length >= 2;
	const unavailable =
		response.mode === "unavailable" || (response.mode === "live" && !validLive);
	return {
		destinationCode,
		status: unavailable ? "unavailable" : response.mode,
		distanceMeters: unavailable ? null : response.distanceMeters,
		durationSeconds: unavailable ? null : response.durationSeconds,
		provider: unavailable && !response.provider ? "none" : response.provider,
		fallback: response.fallback,
		geometry: response.geometry,
		observedOn: response.observedOn,
		sourceUrl: response.sourceUrl,
		errorCategory:
			response.errorCategory ??
			(unavailable && response.mode !== "unavailable"
				? "invalid_response"
				: undefined),
	};
}

export type LogisticsOverview = {
	markers: FeatureCollection<
		Point,
		{
			role: "origin" | "destination";
			code?: string;
			name?: string;
			kind?: string;
		}
	>;
	routeFeatures: FeatureCollection<
		LineString,
		{ destinationCode: string; status: "live" | "baseline" }
	>;
	routes: LogisticsOverviewLeg[];
	summary: {
		total: number;
		live: number;
		baseline: number;
		unavailable: number;
	};
};

export function buildLogisticsOverview(
	origin: { longitude: number; latitude: number },
	destinations: readonly LogisticsDestination[],
	legs: readonly LogisticsOverviewLeg[],
): LogisticsOverview {
	const legByCode = new Map(legs.map((leg) => [leg.destinationCode, leg]));
	const routes = destinations
		.map((destination) => legByCode.get(destination.code))
		.filter((leg): leg is LogisticsOverviewLeg => {
			return Boolean(
				leg && (leg.status === "live" || leg.status === "baseline"),
			);
		});
	return {
		markers: {
			type: "FeatureCollection",
			features: [
				{
					type: "Feature",
					properties: { role: "origin" },
					geometry: {
						type: "Point",
						coordinates: [origin.longitude, origin.latitude],
					},
				},
				...destinations.map((destination) => ({
					type: "Feature" as const,
					properties: {
						role: "destination" as const,
						code: destination.code,
						name: destination.name,
						kind: destination.kind,
					},
					geometry: {
						type: "Point" as const,
						coordinates: [destination.longitude, destination.latitude],
					},
				})),
			],
		},
		routeFeatures: {
			type: "FeatureCollection",
			features: routes.flatMap((leg) =>
				leg.geometry && (leg.status === "live" || leg.status === "baseline")
					? [
							{
								type: "Feature" as const,
								properties: {
									destinationCode: leg.destinationCode,
									status: leg.status,
								},
								geometry: leg.geometry,
							},
						]
					: [],
			),
		},
		routes,
		summary: {
			total: destinations.length,
			live: routes.filter((leg) => leg.status === "live").length,
			baseline: routes.filter((leg) => leg.status === "baseline").length,
			unavailable: destinations.filter(
				(destination) =>
					legByCode.get(destination.code)?.status === "unavailable",
			).length,
		},
	};
}
