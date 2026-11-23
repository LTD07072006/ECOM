import {
	loadProvinceMap,
	loadProvinceMapTag,
} from "../../../../features/geography/database-repository";
import { error, json } from "../../../../lib/http";
import {
	boundedQuery,
	observeApi,
	reportUnavailable,
} from "../../../../lib/api-operations";

export const dynamic = "force-dynamic";

const MAP_CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=3600";

function matchesEtag(header: string | null, etag: string): boolean {
	if (!header) return false;
	return header
		.split(",")
		.map((part) => part.trim())
		.some(
			(candidate) =>
				candidate === "*" ||
				candidate === etag ||
				candidate === etag.replace(/^W\//, ""),
		);
}

export function GET(request: Request) {
	return observeApi("boundaries", request, () => provinces(request));
}

async function provinces(request: Request) {
	if (!boundedQuery(request)) return error("Invalid map parameters.", 400);
	try {
		const tag = await loadProvinceMapTag();
		const etag = tag
			? `W/"provinces-g6-${tag.geographyVersionId}-${tag.datasetId}"`
			: null;
		if (etag && matchesEtag(request.headers.get("if-none-match"), etag)) {
			return new Response(null, {
				status: 304,
				headers: {
					ETag: etag,
					"Cache-Control": MAP_CACHE_CONTROL,
				},
			});
		}

		const { dataset, ...features } = await loadProvinceMap();
		if (!dataset || !features.features.length) {
			reportUnavailable("boundaries");
			return json({ data: features, meta: { dataset } });
		}

		const responseEtag = etag ?? `W/"provinces-g6-${dataset.id}"`;
		return json(
			{ data: features, meta: { dataset } },
			{
				headers: {
					ETag: responseEtag,
					"Cache-Control": MAP_CACHE_CONTROL,
				},
			},
		);
	} catch {
		reportUnavailable("boundaries");
		return error("Province boundaries are temporarily unavailable.", 503);
	}
}
