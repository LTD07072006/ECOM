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

export function createPinnedCandidate(
	longitude: number,
	latitude: number,
): SiteVisitCandidate {
	return { label: "Pinned location", longitude, latitude };
}

const validDestinationIds = new Set(
	canonicalInfrastructurePois.map((poi) => poi.code),
);

export function readSiteCoordinates(longitude: unknown, latitude: unknown) {
	const lng = readCoordinate(longitude, 180);
	const lat = readCoordinate(latitude, 90);
	return lng === null || lat === null
		? null
		: { longitude: lng, latitude: lat };
}

function readCoordinate(value: unknown, limit: number) {
	if (typeof value === "string" && value.trim()) value = Number(value);
	return typeof value === "number" &&
		Number.isFinite(value) &&
		Math.abs(value) <= limit
		? value
		: null;
}

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
		params.set("stops", serializeStops(state.itineraryStops, 5));
	}
	if (state.compareCandidates?.length) {
		params.set("compare", serializeStops(state.compareCandidates, 3));
	}
	return params.toString();
}

export function parseSiteVisitState(
	search: string | URLSearchParams,
): SiteVisitState {
	const params =
		typeof search === "string" ? new URLSearchParams(search) : search;
	const coordinates = readSiteCoordinates(params.get("lng"), params.get("lat"));
	const label = params.get("label")?.trim() ?? "";
	const candidate = label && coordinates ? { label, ...coordinates } : null;
	const destination = params.get("destination");
	const itineraryStops = parseStops(params.get("stops"), 5);
	const compareCandidates = parseStops(params.get("compare"), 3);
	return {
		candidate,
		destination:
			destination && validDestinationIds.has(destination) ? destination : null,
		...(itineraryStops.length > 0 ? { itineraryStops } : {}),
		...(compareCandidates.length > 0 ? { compareCandidates } : {}),
	};
}

function serializeStops(stops: SiteVisitCandidate[], limit: number) {
	return JSON.stringify(
		stops
			.slice(0, limit)
			.map(({ label, longitude, latitude }) => [label, longitude, latitude]),
	);
}

function parseStops(value: string | null, limit: number): SiteVisitCandidate[] {
	if (!value) return [];
	let entries: unknown;
	try {
		entries = value.startsWith("[")
			? JSON.parse(value)
			: value.split(",", limit).map((part) => part.split("|"));
	} catch {
		return [];
	}
	if (!Array.isArray(entries)) return [];
	return entries.slice(0, limit).flatMap((item) => {
		if (!Array.isArray(item) || item.length !== 3) return [];
		const [name, longitude, latitude] = item;
		const label = typeof name === "string" ? name.trim() : "";
		const coordinates = readSiteCoordinates(longitude, latitude);
		return label && coordinates ? [{ label, ...coordinates }] : [];
	});
}
