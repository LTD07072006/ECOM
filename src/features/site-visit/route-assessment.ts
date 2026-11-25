import type { LineString } from "geojson";

export type WemapRouteLike = {
	distance: number;
	duration: number;
	geometry: LineString;
	provider?: string;
};

export type RouteAssessment = {
	origin: [number, number];
	destinationCode: string;
	destinationName: string;
	destinationCoordinates: [number, number];
	distanceMeters: number;
	durationSeconds: number;
	geometry: LineString;
	mode: "live" | "baseline" | "unavailable";
	fallback: boolean;
	provider: string;
	calculatedOn: string;
	observedOn?: string;
	sourceUrl?: string;
	disclaimer: string;
};

const advisoryDisclaimer =
	"advisory route estimate only; not a traffic, truck-access, or investment guarantee.";

export function normalizeWemapRoute(
	route: WemapRouteLike,
	destination: { code: string; name: string; coordinates?: [number, number] },
): RouteAssessment {
	if (!Number.isFinite(route.distance) || route.distance <= 0)
		throw new Error("Invalid route distance");
	if (!Number.isFinite(route.duration) || route.duration <= 0)
		throw new Error("Invalid route duration");
	if (
		route.geometry.type !== "LineString" ||
		route.geometry.coordinates.length < 2
	)
		throw new Error("Invalid route geometry");
	return {
		origin: route.geometry.coordinates[0] as [number, number],
		destinationCode: destination.code,
		destinationName: destination.name,
		destinationCoordinates:
			destination.coordinates ??
			(route.geometry.coordinates.at(-1) as [number, number]),
		distanceMeters: route.distance,
		durationSeconds: route.duration,
		geometry: route.geometry,
		mode: "live",
		fallback: false,
		provider: route.provider || "wemap",
		calculatedOn: new Date().toISOString(),
		disclaimer: advisoryDisclaimer,
	};
}

export type RouteDestination = {
	code: string;
	name: string;
	coordinates: [number, number];
};

export type BaselineRoute = {
	distanceMeters: number;
	durationSeconds: number;
	observedOn: string;
	sourceUrl: string;
};

export async function resolveRouteAssessment({
	origin,
	destination,
	requestRoute,
	baseline,
}: {
	origin: [number, number];
	destination: RouteDestination;
	requestRoute: (
		origin: [number, number],
		destination: [number, number],
	) => Promise<WemapRouteLike>;
	baseline: BaselineRoute | null;
}): Promise<RouteAssessment & { observedOn?: string; sourceUrl?: string }> {
	try {
		return normalizeWemapRoute(
			await requestRoute(origin, destination.coordinates),
			destination,
		);
	} catch {
		if (!baseline) {
			return {
				origin,
				destinationCode: destination.code,
				destinationName: destination.name,
				destinationCoordinates: destination.coordinates,
				distanceMeters: 0,
				durationSeconds: 0,
				geometry: {
					type: "LineString",
					coordinates: [origin, destination.coordinates],
				},
				mode: "unavailable",
				fallback: false,
				provider: "none",
				calculatedOn: new Date().toISOString(),
				disclaimer: advisoryDisclaimer,
			};
		}
		return {
			origin,
			destinationCode: destination.code,
			destinationName: destination.name,
			destinationCoordinates: destination.coordinates,
			distanceMeters: baseline.distanceMeters,
			durationSeconds: baseline.durationSeconds,
			geometry: {
				type: "LineString",
				coordinates: [origin, destination.coordinates],
			},
			mode: "baseline",
			fallback: true,
			provider: "dated-baseline",
			calculatedOn: new Date().toISOString(),
			observedOn: baseline.observedOn,
			sourceUrl: baseline.sourceUrl,
			disclaimer: advisoryDisclaimer,
		};
	}
}
