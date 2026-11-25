import { resolveRoadRoute } from "../../../../features/map/road-connectivity";
import { boundedQuery, observeApi } from "../../../../lib/api-operations";
import { error, json } from "../../../../lib/http";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
	return observeApi("road_routes", request, async () => {
		const params = boundedQuery(request, "site", "facility");
		const site = params?.get("site");
		const facility = params?.get("facility");
		if (!site || !facility) return error("Invalid road route parameters.", 400);
		return json({
			data: await resolveRoadRoute(site, facility, {
				token: process.env.ECOM_MAPBOX_ROUTING_TOKEN,
			}),
		});
	});
}
