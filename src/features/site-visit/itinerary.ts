export type ItineraryLeg = {
	fromId: string;
	toId: string;
	distanceMeters: number;
	durationSeconds: number;
	status: "live" | "baseline" | "unavailable";
};

export function limitItinerary(stops: readonly string[]): string[] {
	return [...new Set(stops)].slice(0, 5);
}

export function itinerarySummary(legs: readonly ItineraryLeg[]) {
	return legs.reduce(
		(summary, leg) => ({
			distanceMeters:
				summary.distanceMeters +
				(leg.status === "unavailable" ? 0 : leg.distanceMeters),
			durationSeconds:
				summary.durationSeconds +
				(leg.status === "unavailable" ? 0 : leg.durationSeconds),
			unavailableLegs:
				summary.unavailableLegs + (leg.status === "unavailable" ? 1 : 0),
		}),
		{ distanceMeters: 0, durationSeconds: 0, unavailableLegs: 0 },
	);
}

export function serializeItinerary(stops: readonly string[]): string {
	return new URLSearchParams({
		stops: limitItinerary(stops).join(","),
	}).toString();
}

export function parseItinerary(search: string): string[] {
	return limitItinerary(
		new URLSearchParams(search).get("stops")?.split(",").filter(Boolean) ?? [],
	);
}
