const origin = "106.7942,20.8285";
const maxSnapMeters = 500;
const routes = {
	HPH: {
		destination: "106.725,20.8194",
		distanceMeters: 17572.9,
		durationSeconds: 984.6,
	},
	"VNHPH-LH": {
		destination: "106.8897,20.8086",
		distanceMeters: 20556.2,
		durationSeconds: 1153.9,
	},
} as const;

export type RoadEstimate = {
	mode: "baseline" | "live";
	distanceMeters: number;
	durationSeconds: number;
	sourceUrl: string;
	observedOn: string;
};

export async function resolveRoadRoute(
	site: string,
	facility: string,
	{ token, request = fetch }: { token?: string; request?: typeof fetch },
): Promise<RoadEstimate | null> {
	if (site !== "HP-IZ-DEEPC" || !Object.hasOwn(routes, facility)) return null;
	const { destination, distanceMeters, durationSeconds } =
		routes[facility as keyof typeof routes];
	const points = `${origin};${destination}`;
	const baseline: RoadEstimate = {
		mode: "baseline",
		distanceMeters,
		durationSeconds,
		sourceUrl: `https://routing.openstreetmap.de/routed-car/route/v1/driving/${points}?overview=false`,
		observedOn: "2026-11-24",
	};
	const accessToken = token?.trim();
	if (!accessToken) return baseline;
	try {
		const url = new URL(
			`https://api.mapbox.com/directions/v5/mapbox/driving/${points}`,
		);
		url.searchParams.set("access_token", accessToken);
		url.searchParams.set("overview", "false");
		url.searchParams.set("radiuses", `${maxSnapMeters};${maxSnapMeters}`);
		const response = await request(url, {
			cache: "no-store",
			redirect: "error",
			signal: AbortSignal.timeout(3500),
		});
		if (!response.ok) return baseline;
		const body = await response.json();
		const route = body?.routes?.[0];
		const waypoints: unknown = body?.waypoints;
		if (
			body?.code !== "Ok" ||
			!Array.isArray(waypoints) ||
			waypoints.length !== 2 ||
			!waypoints.every(
				(point) =>
					Number.isFinite(point?.distance) &&
					point.distance >= 0 &&
					point.distance <= maxSnapMeters,
			) ||
			!Number.isFinite(route?.distance) ||
			route.distance <= 0 ||
			!Number.isFinite(route?.duration) ||
			route.duration <= 0
		)
			return baseline;
		return {
			mode: "live",
			distanceMeters: route.distance,
			durationSeconds: route.duration,
			sourceUrl: "https://docs.mapbox.com/api/navigation/directions/",
			observedOn: new Date().toISOString().slice(0, 10),
		};
	} catch {
		return baseline;
	}
}
