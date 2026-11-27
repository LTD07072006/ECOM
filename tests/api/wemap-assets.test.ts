import { expect, test } from "bun:test";
import { GET } from "../../src/app/api/site-visit/wemap/[...asset]/route";

function getAsset(...asset: string[]) {
	return GET(new Request("http://localhost/api/site-visit/wemap/asset"), {
		params: Promise.resolve({ asset }),
	});
}

test("WeMap style and tile metadata use same-origin URLs and keep the key server-side", async () => {
	const oldToken = process.env.WEMAP_MAP_TOKEN;
	const oldFetch = globalThis.fetch;
	process.env.WEMAP_MAP_TOKEN = "fixture-map-key";
	try {
		globalThis.fetch = Object.assign(
			async (input: Parameters<typeof fetch>[0]) => {
				const url = new URL(String(input));
				expect(url.origin).toBe("https://apis.wemap.asia");
				expect(url.searchParams.get("key")).toBe("fixture-map-key");
				expect(url.searchParams.has("access_token")).toBe(false);
				return Response.json(
					url.pathname.endsWith("style.json")
						? {
								version: 8,
								layers: [{ id: "land", type: "background" }],
								sources: {
									openmaptiles: {
										url: "https://apis.wemap.asia/v2/data/vietnam.json?key=fixture-map-key",
									},
								},
							}
						: {
								tiles: ["https://apis.wemap.asia/tile?key=fixture-map-key"],
								maxzoom: 14,
							},
				);
			},
			{ preconnect: oldFetch.preconnect },
		);
		const style = await getAsset("style.json");
		expect(style.status).toBe(200);
		const body = await style.text();
		expect(body).not.toContain("fixture-map-key");
		expect(JSON.parse(body).sources.openmaptiles.url).toBe(
			"/api/site-visit/wemap/data/vietnam.json",
		);
		const tilejson = await getAsset("data", "vietnam.json");
		expect(await tilejson.json()).toMatchObject({
			tiles: ["/api/site-visit/wemap/data/vietnam/{z}/{x}/{y}.pbf"],
		});
	} finally {
		globalThis.fetch = oldFetch;
		if (oldToken === undefined) delete process.env.WEMAP_MAP_TOKEN;
		else process.env.WEMAP_MAP_TOKEN = oldToken;
	}
});

test("WeMap proxy rejects paths outside the map asset list", async () => {
	for (const asset of [
		["https://other.example/style.json"],
		["data", "vietnam", "2", "999", "1.pbf"],
		["v2", "route-api", "route"],
	]) {
		expect((await getAsset(...asset)).status).toBe(404);
	}
});
