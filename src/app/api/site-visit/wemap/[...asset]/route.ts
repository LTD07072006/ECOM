import { wemapMapToken } from "../../../../../features/site-visit/wemap-config";

const publicPath = "/api/site-visit/wemap";
const datasets = new Set(["vietnam", "natural-earth"]);

function resolveAsset(parts: string[]) {
	const path = parts.join("/");
	if (path === "style.json") return "/v2/styles/osm-bright/style.json";
	if (/^data\/(vietnam|natural-earth)\.json$/.test(path)) return `/v2/${path}`;
	if (/^fonts\/[\w ,.-]{1,180}\/\d{1,5}-\d{1,5}\.pbf$/.test(path))
		return `/v2/${parts.map(encodeURIComponent).join("/")}`;
	const [group, dataset, zoom, column, row] = parts;
	if (
		parts.length !== 5 ||
		group !== "data" ||
		!datasets.has(dataset) ||
		!/^\d{1,2}$/.test(zoom) ||
		!/^\d{1,5}$/.test(column) ||
		!/^\d{1,5}\.pbf$/.test(row)
	)
		return null;
	const z = Number(zoom);
	if (z > 14 || Number(column) >= 2 ** z || Number(row.slice(0, -4)) >= 2 ** z)
		return null;
	return `/v2/${path}`;
}

function rewriteStyle(style: Record<string, unknown>) {
	if (
		style.version !== 8 ||
		!Array.isArray(style.layers) ||
		!style.layers.length
	)
		throw new Error("Invalid WeMap style");
	return {
		version: 8,
		layers: style.layers,
		sprite: `${publicPath}/sprite`,
		glyphs: `${publicPath}/fonts/{fontstack}/{range}.pbf`,
		sources: {
			openmaptiles: { type: "vector", url: `${publicPath}/data/vietnam.json` },
			"natural-earth": {
				type: "vector",
				url: `${publicPath}/data/natural-earth.json`,
			},
		},
	};
}

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ asset: string[] }> },
) {
	const { asset } = await params;
	if (asset.some((part) => part.includes("/")))
		return new Response(null, { status: 404 });
	const path = asset.join("/");
	const sprite = /^sprite(?:@2x)?\.(?:json|png)$/.test(path);
	const upstreamPath = sprite
		? `/osm-bright-gl-style/${path}`
		: resolveAsset(asset);
	if (!upstreamPath || new URL(request.url).search)
		return new Response(null, { status: 404 });
	const token = wemapMapToken();
	if (!token) return new Response(null, { status: 503 });
	const url = new URL(
		upstreamPath,
		sprite ? "https://openmaptiles.github.io" : "https://apis.wemap.asia",
	);
	if (!sprite) url.searchParams.set("key", token);
	try {
		const upstream = await fetch(url, {
			cache: "no-store",
			redirect: "error",
			signal: AbortSignal.any([request.signal, AbortSignal.timeout(6_000)]),
		});
		if (!upstream.ok) return new Response(null, { status: 502 });
		const headers = {
			"Cache-Control": "public, max-age=300",
			"X-Content-Type-Options": "nosniff",
		};
		if (path === "style.json")
			return Response.json(rewriteStyle(await upstream.json()), { headers });
		if (/^data\/.+\.json$/.test(path)) {
			const { bounds, minzoom, maxzoom, vector_layers } = await upstream.json();
			const dataset = asset[1].slice(0, -5);
			return Response.json(
				{
					tilejson: "2.2.0",
					bounds,
					minzoom,
					maxzoom,
					vector_layers,
					tiles: [`${publicPath}/data/${dataset}/{z}/{x}/{y}.pbf`],
				},
				{ headers },
			);
		}
		return new Response(upstream.body, {
			headers: {
				...headers,
				"Content-Type": path.endsWith(".png")
					? "image/png"
					: path.endsWith(".json")
						? "application/json"
						: "application/x-protobuf",
			},
		});
	} catch {
		return new Response(null, { status: 502 });
	}
}
