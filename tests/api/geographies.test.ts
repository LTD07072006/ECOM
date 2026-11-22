import { afterEach, beforeEach, expect, spyOn, test } from "bun:test";
import { GET as listGeographies } from "../../src/app/api/geographies/route";
import { GET as getGeography } from "../../src/app/api/geographies/[geoId]/route";
import { GET as batchGeographies } from "../../src/app/api/geographies/batch/route";
import { GET as mapProvinces } from "../../src/app/api/map/provinces/route";
import { GET as mapLayers } from "../../src/app/api/map/layers/route";
import { GET as health } from "../../src/app/api/health/route";
import * as catalog from "../../src/features/geography/catalog";
import * as dbRepo from "../../src/features/geography/database-repository";
import * as layerRepo from "../../src/features/map/layer-repository";
import { searchGeographies } from "../../src/features/geography/domain";
import { demoCatalog } from "../../src/db/seed-data";

let loader: ReturnType<typeof spyOn<typeof catalog, "loadPublicCatalog">>;
let readinessSpy: ReturnType<
	typeof spyOn<typeof catalog, "checkPublicReadiness">
>;
let searcher: ReturnType<
	typeof spyOn<typeof catalog, "searchPublicGeographies">
>;

beforeEach(() => {
	const mocked = { ...demoCatalog, mode: "database" as const };
	loader = spyOn(catalog, "loadPublicCatalog").mockResolvedValue(mocked);
	readinessSpy = spyOn(catalog, "checkPublicReadiness").mockResolvedValue({
		mode: "database",
		publicationStatus: "published",
	});
	searcher = spyOn(catalog, "searchPublicGeographies").mockImplementation(
		async (options) => ({
			mode: "database",
			publicationStatus: "published",
			dataset: mocked.dataset ?? null,
			geographies: searchGeographies(
				mocked,
				options.query ?? "",
				options.level,
				{
					indicator: options.indicator,
					min: options.min,
					max: options.max,
				},
			),
		}),
	);
});

afterEach(() => {
	loader.mockRestore();
	readinessSpy.mockRestore();
	searcher.mockRestore();
});

test("GET /api/geographies searches by query and returns a stable envelope", async () => {
	const response = await listGeographies(
		new Request("http://localhost/api/geographies?q=ha%20noi"),
	);
	expect(response.status).toBe(200);
	const body = await response.json();
	expect(body).toEqual(
		expect.objectContaining({
			data: expect.arrayContaining([
				expect.objectContaining({ displayName: "Hà Nội", level: "province" }),
			]),
			meta: expect.objectContaining({
				query: "ha noi",
				dataStatus: expect.stringMatching(/^(database|demo|unavailable)$/),
			}),
		}),
	);
});

test("GET /api/geographies rejects an empty query", async () => {
	const response = await listGeographies(
		new Request("http://localhost/api/geographies?q="),
	);
	expect(response.status).toBe(400);
	expect(await response.json()).toEqual(
		expect.objectContaining({
			error: "Search query must be at least 2 characters.",
		}),
	);
});

test("GET /api/geographies supports indicator numeric filtering and rejects inverted bounds", async () => {
	const inverted = await listGeographies(
		new Request(
			"http://localhost/api/geographies?indicator=POP_AVG&min=500&max=100",
		),
	);
	expect(inverted.status).toBe(400);
	expect(await inverted.json()).toEqual(
		expect.objectContaining({
			error: "Minimum filter value cannot exceed maximum filter value.",
		}),
	);

	const valid = await listGeographies(
		new Request(
			"http://localhost/api/geographies?level=province&indicator=POP_AVG&min=0",
		),
	);
	expect(valid.status).toBe(200);
	const body = await valid.json();
	expect(body.meta.indicator).toBe("POP_AVG");
	expect(body.meta.min).toBe(0);
	expect(Array.isArray(body.data)).toBe(true);
});

test("GET /api/geographies/batch returns multiple profiles in one request and validates input", async () => {
	const id1 = "10000000-0000-4000-8000-000000000002";
	const id2 = "10000000-0000-4000-8000-000000000003";
	const ok = await batchGeographies(
		new Request(`http://localhost/api/geographies/batch?ids=${id1},${id2}`),
	);
	expect(ok.status).toBe(200);
	const body = await ok.json();
	expect(body.data).toHaveLength(2);
	expect(body.meta.found).toBe(2);

	const dup = await batchGeographies(
		new Request(`http://localhost/api/geographies/batch?ids=${id1},${id1}`),
	);
	expect(dup.status).toBe(400);

	const invalid = await batchGeographies(
		new Request("http://localhost/api/geographies/batch?ids=not-a-uuid"),
	);
	expect(invalid.status).toBe(400);
});

test("GET /api/map/provinces emits ETag + Cache-Control and honors If-None-Match with 304", async () => {
	const tagSpy = spyOn(dbRepo, "loadProvinceMapTag").mockResolvedValue({
		geographyVersionId: "gov-v1",
		datasetId: "ds-v1",
	});
	const mapSpy = spyOn(dbRepo, "loadProvinceMap").mockResolvedValue({
		type: "FeatureCollection",
		features: [
			{
				type: "Feature",
				id: "10000000-0000-4000-8000-000000000002",
				geometry: {
					type: "Polygon",
					coordinates: [
						[
							[105, 21],
							[106, 21],
							[106, 22],
							[105, 22],
							[105, 21],
						],
					],
				},
				properties: {
					id: "10000000-0000-4000-8000-000000000002",
					code: "01",
					name: "Hà Nội",
				},
			},
		],
		dataset: {
			id: "ds-v1",
			code: "VN_PROVINCE_BOUNDARIES",
			version: "2025.07",
			owner: "Authority",
			dataAsOf: "2025-07-01",
			reviewedAt: "2025-07-01T00:00:00.000Z",
			reviewDueAt: "2027-07-01T00:00:00.000Z",
			freshness: "current",
			publicationStatus: "published",
			source: demoCatalog.source ?? {
				id: "src-v1",
				publisher: "Authority",
				title: "Boundaries",
				url: "https://example.test",
				citation: "Authority",
				license: "CC-BY-4.0",
				access: "public",
				status: "active",
				updatedAt: "2025-07-01T00:00:00.000Z",
			},
		},
	});
	try {
		const first = await mapProvinces(
			new Request("http://localhost/api/map/provinces"),
		);
		expect(first.status).toBe(200);
		const etag = first.headers.get("etag");
		expect(etag).toBe('W/"provinces-gov-v1-ds-v1"');
		expect(first.headers.get("cache-control")).toContain("public, max-age=300");

		const cached = await mapProvinces(
			new Request("http://localhost/api/map/provinces", {
				headers: { "if-none-match": etag ?? "" },
			}),
		);
		expect(cached.status).toBe(304);
		expect(mapSpy).toHaveBeenCalledTimes(1);
	} finally {
		tagSpy.mockRestore();
		mapSpy.mockRestore();
	}
});

test("GET /api/map/layers emits ETag + Cache-Control and honors If-None-Match with 304", async () => {
	const tagSpy = spyOn(layerRepo, "loadMapLayersTag").mockResolvedValue(
		'W/"layers-0123456789abcdef"',
	);
	const loadSpy = spyOn(layerRepo, "loadMapLayers").mockResolvedValue({
		indicators: [],
		infrastructure: {
			dataset: {
				id: "ds-infra",
				code: "VN_INFRA",
				version: "2025",
				owner: "Authority",
				dataAsOf: "2025-12-31",
				reviewedAt: "2025-12-31T00:00:00.000Z",
				reviewDueAt: "2026-12-31T00:00:00.000Z",
				freshness: "current",
				publicationStatus: "published",
				source: {
					id: "src-1",
					publisher: "Authority",
					title: "Infra",
					url: "https://example.test",
					citation: "Authority",
					license: "CC-BY-4.0",
					access: "public",
					status: "active",
					updatedAt: "2025-12-31T00:00:00.000Z",
				},
			},
			points: { type: "FeatureCollection", features: [] },
		},
	});
	try {
		const first = await mapLayers(
			new Request("http://localhost/api/map/layers"),
		);
		expect(first.status).toBe(200);
		const etag = first.headers.get("etag");
		expect(etag).toBe('W/"layers-0123456789abcdef"');
		expect(first.headers.get("cache-control")).toContain("public, max-age=300");

		const cached = await mapLayers(
			new Request("http://localhost/api/map/layers", {
				headers: { "if-none-match": etag ?? "" },
			}),
		);
		expect(cached.status).toBe(304);
		expect(loadSpy).toHaveBeenCalledTimes(1);
	} finally {
		tagSpy.mockRestore();
		loadSpy.mockRestore();
	}
});

test("GET /api/geographies/:geoId returns profile provenance and unavailable status", async () => {
	const response = await getGeography(
		new Request(
			"http://localhost/api/geographies/10000000-0000-4000-8000-000000000002",
		),
		{
			params: Promise.resolve({
				geoId: "10000000-0000-4000-8000-000000000002",
			}),
		},
	);
	expect(response.status).toBe(200);
	const body = await response.json();
	expect(body.data.displayName).toBe("Hà Nội");
	expect(body.data.observations[0].value).toBeNull();
	expect(body.data.observations[0].source.citation).toBeTruthy();
});

test("GET /api/geographies/:geoId returns 404 for an unknown place", async () => {
	const response = await getGeography(
		new Request("http://localhost/api/geographies/nope"),
		{ params: Promise.resolve({ geoId: "nope" }) },
	);
	expect(response.status).toBe(404);
});

test("GET /api/health reports the service without claiming database readiness", async () => {
	const response = await health(new Request("http://localhost/api/health"));
	expect(response.status).toBe(200);
	const body = await response.json();
	expect(["ok", "degraded"]).toContain(body.status);
	expect(body.database).toBe(
		body.mode === "database" ? "ready" : "unavailable",
	);
	expect(["database", "demo", "unavailable"]).toContain(body.mode);
});
