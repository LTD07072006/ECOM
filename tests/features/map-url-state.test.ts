import { expect, test } from "bun:test";
import {
	BOUNDARIES_LAYER,
	compareQuery,
	mapStateQuery,
	parseLayerId,
	readCompareIds,
	readMapState,
	readRegionIds,
	regionQueryParams,
} from "../../src/features/map/url-state";

const layerId = JSON.stringify([
	"0f7d2f6e-1111-4a2b-8c3d-000000000001",
	"GRDP_PC",
	"2025-01-01",
	"2025-12-31",
	"current_prices_per_resident",
	"million VND/person",
]);
const provinceId = "0a604040-a3e0-4706-b42d-7e9cc8a32108";

test("round-trips the shared map view through the query string", () => {
	const query = mapStateQuery({
		layer: layerId,
		province: provinceId,
		filter: { min: 100, max: 500 },
		airports: true,
	});
	const state = readMapState(`?${query}`);
	expect(state).toEqual({
		layer: layerId,
		province: provinceId,
		filter: { min: 100, max: 500 },
		airports: true,
	});
});

test("omits empty state and keeps numbers unformatted", () => {
	expect(
		mapStateQuery({
			layer: "",
			province: "",
			filter: { min: null, max: null },
			airports: false,
		}),
	).toBe("");
	const query = mapStateQuery({
		layer: "",
		province: "",
		filter: { min: -1.5, max: 0 },
		airports: false,
	});
	expect(query).toBe("min=-1.5&max=0");
});

test("rejects layer identifiers that are not six-part tuples of short strings", () => {
	expect(parseLayerId(layerId)).toBe(layerId);
	expect(parseLayerId(BOUNDARIES_LAYER)).toBe(BOUNDARIES_LAYER);
	expect(parseLayerId("boundaries-other")).toBe("");
	expect(parseLayerId(null)).toBe("");
	expect(parseLayerId("not-json")).toBe("");
	expect(parseLayerId(JSON.stringify(["a", "b"]))).toBe("");
	expect(parseLayerId(JSON.stringify(["a", "b", "c", "d", "e", 6]))).toBe("");
	expect(
		parseLayerId(JSON.stringify(["a", "b", "c", "d", "e", "f".repeat(200)])),
	).toBe("");
	expect(
		parseLayerId(JSON.stringify(["a", "b", "c", "d", "e", "f"])).length,
	).toBeGreaterThan(0);

	const boundariesQuery = mapStateQuery({
		layer: BOUNDARIES_LAYER,
		province: "",
		filter: { min: null, max: null },
		airports: false,
	});
	expect(boundariesQuery).toBe("layer=boundaries");
	expect(readMapState(`?${boundariesQuery}`).layer).toBe(BOUNDARIES_LAYER);
});

test("ignores malformed province ids and non-numeric bounds", () => {
	const state = readMapState(`?province=not-a-uuid&min=abc&max=10`);
	expect(state.province).toBe("");
	expect(state.filter).toEqual({ min: null, max: 10 });
	expect(readMapState("").layer).toBe("");
});

test("round-trips comparison and non-overlapping region ids via URL state", () => {
	const id1 = "0a604040-a3e0-4706-b42d-7e9cc8a32101";
	const id2 = "0a604040-a3e0-4706-b42d-7e9cc8a32102";
	const id3 = "0a604040-a3e0-4706-b42d-7e9cc8a32103";

	expect(readCompareIds(`?${compareQuery([id1, id2])}`)).toEqual([id1, id2]);
	expect(readCompareIds(`?compare=${id1}`)).toEqual([]);
	expect(readCompareIds(`?compare=${id1},${id1},bad`)).toEqual([]);

	const params = regionQueryParams([
		[id1, id2],
		[id2, id3],
	]);
	expect(params).toEqual({ regionA: `${id1},${id2}`, regionB: id3 });
	expect(
		readRegionIds(`?regionA=${id1},${id2}&regionB=${id2},${id3},bad`),
	).toEqual([[id1, id2], [id3]]);
});
