import { expect, test } from "bun:test";
import { resolveRoadRoute } from "../../src/features/map/road-connectivity";

const site = "HP-IZ-DEEPC";

test("unconfigured routing returns a sourced dated baseline", async () => {
	expect(await resolveRoadRoute(site, "HPH", {})).toMatchObject({
		mode: "baseline",
		distanceMeters: 17572.9,
		sourceUrl: expect.stringMatching(/^https:/),
		observedOn: "2026-11-24",
	});
});

test("configured directions returns network metrics", async () => {
	const request: typeof fetch = Object.assign(
		async () =>
			Response.json({
				code: "Ok",
				routes: [{ distance: 18000, duration: 1020 }],
				waypoints: [{ distance: 300 }, { distance: 200 }],
			}),
		{ preconnect: fetch.preconnect },
	);
	expect(
		await resolveRoadRoute(site, "HPH", { token: "fixture", request }),
	).toMatchObject({
		mode: "live",
		distanceMeters: 18000,
		durationSeconds: 1020,
	});
});

test("quota errors fall back and unsupported pairs stay null", async () => {
	let calls = 0;
	const request: typeof fetch = Object.assign(
		async () => {
			calls++;
			return new Response(null, { status: 429 });
		},
		{ preconnect: fetch.preconnect },
	);
	expect(
		await resolveRoadRoute(site, "HPH", { token: "fixture", request }),
	).toMatchObject({ mode: "baseline" });
	expect(
		await resolveRoadRoute(site, "SGN", { token: "fixture", request }),
	).toBeNull();
	expect(calls).toBe(1);
});

test("rejects missing or out-of-range snapped road points", async () => {
	for (const waypoints of [undefined, [{ distance: 501 }, { distance: 0 }]]) {
		const request = async () =>
			Response.json({
				code: "Ok",
				routes: [{ distance: 18000, duration: 1020 }],
				waypoints,
			});
		expect(
			await resolveRoadRoute(site, "HPH", {
				token: "fixture",
				request: Object.assign(request, { preconnect: fetch.preconnect }),
			}),
		).toMatchObject({ mode: "baseline" });
	}
});

test("a blank token does not call the provider", async () => {
	let calls = 0;
	const request = Object.assign(
		async () => {
			calls++;
			return new Response(null, { status: 401 });
		},
		{ preconnect: fetch.preconnect },
	);
	await resolveRoadRoute(site, "HPH", { token: "  ", request });
	expect(calls).toBe(0);
});
