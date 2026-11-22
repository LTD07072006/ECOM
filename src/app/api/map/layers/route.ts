import {
	loadMapLayers,
	loadMapLayersTag,
} from "../../../../features/map/layer-repository";
import { error, json } from "../../../../lib/http";
import {
	boundedQuery,
	observeApi,
	reportUnavailable,
} from "../../../../lib/api-operations";

export const dynamic = "force-dynamic";

const LAYERS_CACHE_CONTROL = "public, max-age=300, stale-while-revalidate=3600";

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
	return observeApi("layers", request, () => layers(request));
}

async function layers(request: Request) {
	if (!boundedQuery(request)) return error("Invalid layer parameters.", 400);
	try {
		const etag = await loadMapLayersTag();
		if (etag && matchesEtag(request.headers.get("if-none-match"), etag)) {
			return new Response(null, {
				status: 304,
				headers: {
					ETag: etag,
					"Cache-Control": LAYERS_CACHE_CONTROL,
				},
			});
		}

		const data = await loadMapLayers();
		if (!etag || (data.indicators.length === 0 && !data.infrastructure)) {
			return json({ data });
		}

		return json(
			{ data },
			{
				headers: {
					ETag: etag,
					"Cache-Control": LAYERS_CACHE_CONTROL,
				},
			},
		);
	} catch {
		reportUnavailable("layers");
		return error("Map layers are temporarily unavailable.", 503);
	}
}
