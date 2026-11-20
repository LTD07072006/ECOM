import { afterEach, beforeEach, expect, spyOn, test } from "bun:test";
import { GET as listGeographies } from "../../src/app/api/geographies/route";
import { GET as getGeography } from "../../src/app/api/geographies/[geoId]/route";
import { GET as health } from "../../src/app/api/health/route";
import * as catalog from "../../src/features/geography/catalog";
import { demoCatalog } from "../../src/db/seed-data";

let loader: ReturnType<typeof spyOn<typeof catalog, "loadPublicCatalog">>;
beforeEach(() => { loader = spyOn(catalog, "loadPublicCatalog").mockResolvedValue({ ...demoCatalog, mode: "database" }); });
afterEach(() => loader.mockRestore());

test("GET /api/geographies searches by query and returns a stable envelope", async () => {
  const response = await listGeographies(new Request("http://localhost/api/geographies?q=ha%20noi"));
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toEqual(expect.objectContaining({
    data: expect.arrayContaining([expect.objectContaining({ displayName: "Hà Nội", level: "province" })]),
    meta: expect.objectContaining({ query: "ha noi", dataStatus: expect.stringMatching(/^(database|demo|unavailable)$/) }),
  }));
});

test("GET /api/geographies rejects an empty query", async () => {
  const response = await listGeographies(new Request("http://localhost/api/geographies?q="));
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual(expect.objectContaining({ error: "Search query must be at least 2 characters." }));
});

test("GET /api/geographies/:geoId returns profile provenance and unavailable status", async () => {
  const response = await getGeography(new Request("http://localhost/api/geographies/10000000-0000-4000-8000-000000000002"), { params: Promise.resolve({ geoId: "10000000-0000-4000-8000-000000000002" }) });
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.data.displayName).toBe("Hà Nội");
  expect(body.data.observations[0].value).toBeNull();
  expect(body.data.observations[0].source.citation).toBeTruthy();
});

test("GET /api/geographies/:geoId returns 404 for an unknown place", async () => {
  const response = await getGeography(new Request("http://localhost/api/geographies/nope"), { params: Promise.resolve({ geoId: "nope" }) });
  expect(response.status).toBe(404);
});

test("GET /api/health reports the service without claiming database readiness", async () => {
  const response = await health();
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(["ok", "degraded"]).toContain(body.status);
  expect(body.database).toBe(body.mode === "database" ? "ready" : "unavailable");
  expect(["database", "demo", "unavailable"]).toContain(body.mode);
});
