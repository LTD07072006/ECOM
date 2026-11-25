import { json } from "../../../../lib/http";
import { toSiteVisitContext } from "../../../../features/site-visit/site-context";
import { cacheHeaders } from "../../../../lib/cache-policy";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
	const url = new URL(request.url);
	const longitude = Number(url.searchParams.get("lng"));
	const latitude = Number(url.searchParams.get("lat"));
	if (
		!Number.isFinite(longitude) ||
		longitude < -180 ||
		longitude > 180 ||
		!Number.isFinite(latitude) ||
		latitude < -90 ||
		latitude > 90
	) {
		return json({ error: "Invalid coordinates." }, { status: 400 });
	}
	return json(
		{ data: toSiteVisitContext({ longitude, latitude }) },
		{ headers: cacheHeaders("published-context") },
	);
}
