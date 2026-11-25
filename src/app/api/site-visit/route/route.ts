import { error, json, readBoundedJson } from "../../../../lib/http";
import { boundedQuery, observeApi } from "../../../../lib/api-operations";
import { haversineKm } from "../../../../features/map/layers";
import { canonicalInfrastructurePois } from "../../../../features/map/proximity";
import {
	resolveRouteAssessment,
	type WemapRouteLike,
} from "../../../../features/site-visit/route-assessment";
import { WEMAP_TOKEN } from "../../../../features/site-visit/wemap-config";
import { cacheHeaders } from "../../../../lib/cache-policy";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
	return observeApi("site_visit_routes", request, () => route(request));
}

export function POST(request: Request) {
	return observeApi("site_visit_routes", request, () =>
		itineraryRoute(request),
	);
}

async function route(request: Request) {
	const query = boundedQuery(request, "lng", "lat", "destination");
	if (
		!query ||
		!query.has("lng") ||
		!query.has("lat") ||
		!query.has("destination")
	)
		return error("Invalid route parameters.", 400);
	const longitude = Number(query.get("lng"));
	const latitude = Number(query.get("lat"));
	const destination = canonicalInfrastructurePois.find(
		(poi) =>
			poi.code === query.get("destination") &&
			["airport", "seaport", "icd", "expressway_node"].includes(poi.kind),
	);
	if (
		!Number.isFinite(longitude) ||
		longitude < -180 ||
		longitude > 180 ||
		!Number.isFinite(latitude) ||
		latitude < -90 ||
		latitude > 90 ||
		!destination
	)
		return error("Invalid route parameters.", 400);
	const baselineDistance =
		haversineKm(
			latitude,
			longitude,
			destination.latitude,
			destination.longitude,
		) * 1000;
	const baseline = {
		distanceMeters: baselineDistance,
		durationSeconds: Math.round((baselineDistance / 1000 / 45) * 3600),
		observedOn: new Date().toISOString().slice(0, 10),
		sourceUrl: destination.referenceUrl,
	};
	const assessment = await resolveRouteAssessment({
		origin: [longitude, latitude],
		destination: {
			code: destination.code,
			name: destination.name,
			coordinates: [destination.longitude, destination.latitude],
		},
		baseline,
		requestRoute: async (origin, target) => {
			const { default: wemap } = await import("wemap-gl-js");
			const provider = wemap.weRoutingProvider({
				version: 2,
				apiKey: WEMAP_TOKEN,
			});
			const routes = await Promise.race([
				provider.getRoute([origin, target], {
					profile: "driving",
					language: "vi",
					apiKey: WEMAP_TOKEN,
				}),
				new Promise<never>((_, reject) =>
					setTimeout(
						() => reject(new Error("Routing request timed out")),
						12_000,
					),
				),
			]);
			const result = routes[0] as WemapRouteLike | undefined;
			if (!result) throw new Error("No route");
			return result;
		},
	});
	const response = json(
		{ data: assessment },
		{ headers: cacheHeaders("live-route") },
	);
	response.headers.set("X-Api-Provider", assessment.provider);
	response.headers.set("X-Api-Fallback", String(assessment.fallback));
	response.headers.set(
		"X-Api-Outcome",
		assessment.mode === "baseline"
			? "fallback"
			: assessment.mode === "unavailable"
				? "error"
				: "success",
	);
	return response;
}

async function itineraryRoute(request: Request) {
	const body = await readBoundedJson(request, 8_192);
	if (!body.ok || typeof body.value !== "object" || body.value === null)
		return error("Invalid route body.", body.ok ? 400 : body.status);
	const value = body.value as Record<string, unknown>;
	const origin = toCoordinate(value.origin);
	const target = toCoordinate(value.destination);
	const destinationId =
		typeof value.destinationId === "string" ? value.destinationId : "";
	const destination = canonicalInfrastructurePois.find(
		(poi) =>
			poi.code === destinationId &&
			["airport", "seaport", "icd", "expressway_node"].includes(poi.kind),
	);
	if (!origin || !target || !destination) {
		return error("Invalid route destination.", 400);
	}
	if (
		Math.abs(target[0] - destination.longitude) > 0.0001 ||
		Math.abs(target[1] - destination.latitude) > 0.0001
	) {
		return error("Invalid route destination.", 400);
	}
	const distanceMeters =
		haversineKm(origin[1], origin[0], target[1], target[0]) * 1000;
	const assessment = await resolveRouteAssessment({
		origin,
		destination: {
			code: destination.code,
			name: destination.name,
			coordinates: [destination.longitude, destination.latitude],
		},
		baseline: {
			distanceMeters,
			durationSeconds: Math.round((distanceMeters / 1000 / 45) * 3600),
			observedOn: new Date().toISOString().slice(0, 10),
			sourceUrl: destination.referenceUrl,
		},
		requestRoute: async (from, to) => {
			const { default: wemap } = await import("wemap-gl-js");
			const provider = wemap.weRoutingProvider({
				version: 2,
				apiKey: WEMAP_TOKEN,
			});
			const routes = await Promise.race([
				provider.getRoute([from, to], {
					profile: "driving",
					language: "vi",
					apiKey: WEMAP_TOKEN,
				}),
				new Promise<never>((_, reject) =>
					setTimeout(
						() => reject(new Error("Routing request timed out")),
						12_000,
					),
				),
			]);
			const result = routes[0] as WemapRouteLike | undefined;
			if (!result) throw new Error("No route");
			return result;
		},
	});
	const response = json({
		data: assessment,
	});
	response.headers.set("X-Api-Provider", assessment.provider);
	response.headers.set("X-Api-Fallback", String(assessment.fallback));
	response.headers.set(
		"X-Api-Outcome",
		assessment.mode === "baseline"
			? "fallback"
			: assessment.mode === "unavailable"
				? "error"
				: "success",
	);
	return response;
}

function toCoordinate(value: unknown): [number, number] | null {
	if (!Array.isArray(value) || value.length !== 2) return null;
	const longitude = Number(value[0]);
	const latitude = Number(value[1]);
	return Number.isFinite(longitude) &&
		longitude >= -180 &&
		longitude <= 180 &&
		Number.isFinite(latitude) &&
		latitude >= -90 &&
		latitude <= 90
		? [longitude, latitude]
		: null;
}
