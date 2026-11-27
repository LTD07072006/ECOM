import { json } from "../../../../lib/http";
import { toSiteVisitContext } from "../../../../features/site-visit/site-context";
import { readSiteCoordinates } from "../../../../features/site-visit/site-visit-state";
import { cacheHeaders } from "../../../../lib/cache-policy";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
	const url = new URL(request.url);
	const coordinates = readSiteCoordinates(
		url.searchParams.get("lng"),
		url.searchParams.get("lat"),
	);
	if (!coordinates) {
		return json({ error: "Invalid coordinates." }, { status: 400 });
	}
	return json(
		{ data: toSiteVisitContext(coordinates) },
		{ headers: cacheHeaders("published-context") },
	);
}
