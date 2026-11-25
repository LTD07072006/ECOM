import { canonicalInfrastructurePois } from "../map/proximity";

export type SiteVisitCandidate = {
	label: string;
	longitude: number;
	latitude: number;
};

export type SiteVisitState = {
	candidate: SiteVisitCandidate | null;
	destination: string | null;
	itineraryStops?: SiteVisitCandidate[];
	compareCandidates?: SiteVisitCandidate[];
};

const validDestinationIds = new Set(
	canonicalInfrastructurePois.map((poi) => poi.code),
);

export function serializeSiteVisitState(state: SiteVisitState): string {
	const params = new URLSearchParams();
	if (state.candidate) {
		params.set("label", state.candidate.label);
		params.set("lng", String(state.candidate.longitude));
		params.set("lat", String(state.candidate.latitude));
	}
	if (state.destination && validDestinationIds.has(state.destination)) {
		params.set("destination", state.destination);
	}
	if (state.itineraryStops?.length) {
		params.set(
			"stops",
			state.itineraryStops
				.slice(0, 5)
				.map((stop) => `${stop.label}|${stop.longitude}|${stop.latitude}`)
				.join(","),
		);
	}
	if (state.compareCandidates?.length) {
		params.set(
			"compare",
			state.compareCandidates
				.slice(0, 3)
				.map(
					(candidate) =>
						`${candidate.label}|${candidate.longitude}|${candidate.latitude}`,
				)
				.join(","),
		);
	}
	return params.toString();
}

export function parseSiteVisitState(search: string): SiteVisitState {
	const params = new URLSearchParams(search);
	const longitude = Number(params.get("lng"));
	const latitude = Number(params.get("lat"));
	const label = params.get("label")?.trim() ?? "";
	const candidate =
		label &&
		Number.isFinite(longitude) &&
		longitude >= -180 &&
		longitude <= 180 &&
		Number.isFinite(latitude) &&
		latitude >= -90 &&
		latitude <= 90
			? { label, longitude, latitude }
			: null;
	const destination = params.get("destination");
	const itineraryStops = parseStops(params.get("stops"));
	const compareCandidates = parseStops(params.get("compare"));
	return {
		candidate,
		destination:
			destination && validDestinationIds.has(destination) ? destination : null,
		...(itineraryStops.length > 0 ? { itineraryStops } : {}),
		...(compareCandidates.length > 0
			? { compareCandidates: compareCandidates.slice(0, 3) }
			: {}),
	};
}

function parseStops(value: string | null): SiteVisitCandidate[] {
	if (!value) return [];
	return value
		.split(",")
		.slice(0, 5)
		.map((part) => {
			const [label, longitude, latitude] = part.split("|");
			return {
				label: label?.trim() ?? "",
				longitude: Number(longitude),
				latitude: Number(latitude),
			};
		})
		.filter(
			(stop) =>
				Boolean(stop.label) &&
				Number.isFinite(stop.longitude) &&
				stop.longitude >= -180 &&
				stop.longitude <= 180 &&
				Number.isFinite(stop.latitude) &&
				stop.latitude >= -90 &&
				stop.latitude <= 90,
		);
}
