import { expect, test } from "bun:test";
import { GET, POST } from "../../src/app/api/site-visit/route/route";

test("site visit route rejects unexpected query parameters", async () => {
	const response = await GET(
		new Request(
			"http://localhost/api/site-visit/route?lng=105&lat=21&destination=VNHPH-LH&token=secret",
		),
	);
	expect(response.status).toBe(400);
	const body = await response.text();
	expect(body).not.toContain("UpPfQSwTwXlPekxsVHKzlcPoGSWGLlsyZ");
	expect(body).not.toContain("secret");
});

test("site visit route rejects destinations outside the published catalogue", async () => {
	const response = await GET(
		new Request(
			"http://localhost/api/site-visit/route?lng=105&lat=21&destination=https%3A%2F%2Fexample.test%2Froute",
		),
	);
	expect(response.status).toBe(400);
	expect(await response.json()).toEqual({ error: "Invalid route parameters." });
});

test("site visit route rejects catalogue entries that are not logistics destinations", async () => {
	const response = await GET(
		new Request(
			"http://localhost/api/site-visit/route?lng=105&lat=21&destination=airport-code",
		),
	);
	// A known non-logistics POI must not become a routing target.
	expect([400, 404]).toContain(response.status);
});

test("site visit itinerary endpoint does not echo provider credentials", async () => {
	const response = await POST(
		new Request("http://localhost/api/site-visit/route", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				origin: [105.5, 21],
				destination: [106, 21],
				destinationId: "secret-stop",
				destinationName: "Secret stop",
			}),
		}),
	);
	const body = await response.text();
	expect(body).not.toContain("UpPfQSwTwXlPekxsVHKzlcPoGSWGLlsyZ");
});

test("site visit itinerary rejects arbitrary coordinates and destination ids", async () => {
	const response = await POST(
		new Request("http://localhost/api/site-visit/route", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				origin: [105.5, 21],
				destination: [106, 21],
				destinationId: "arbitrary-stop",
				destinationName: "Arbitrary stop",
			}),
		}),
	);
	expect(response.status).toBe(400);
});
