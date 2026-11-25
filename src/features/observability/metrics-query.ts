const allowedRoutes = new Set([
	"site_visit_routes",
	"road_routes",
	"search",
	"profile",
	"compare",
	"export",
	"boundaries",
	"layers",
	"health",
]);

export type ObservabilityQuery = { hours: number; route?: string };

export function parseObservabilityQuery(
	params: URLSearchParams,
): ObservabilityQuery {
	const hoursValue = params.get("hours") ?? "24";
	const hours = Number(hoursValue);
	if (!Number.isInteger(hours) || hours < 1 || hours > 24)
		throw new Error("hours must be between 1 and 24");
	const route = params.get("route") ?? undefined;
	if (route && !allowedRoutes.has(route)) throw new Error("unknown route");
	return { hours, ...(route ? { route } : {}) };
}
