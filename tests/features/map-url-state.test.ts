import { expect, test } from "bun:test";
import { mapStateQuery, parseLayerId, readMapState } from "../../src/features/map/url-state";

const layerId = JSON.stringify(["0f7d2f6e-1111-4a2b-8c3d-000000000001", "GRDP_PC", "2025-01-01", "2025-12-31", "current_prices_per_resident", "million VND/person"]);
const provinceId = "0a604040-a3e0-4706-b42d-7e9cc8a32108";

test("round-trips the shared map view through the query string", () => {
  const query = mapStateQuery({ layer: layerId, province: provinceId, filter: { min: 100, max: 500 }, airports: true });
  const state = readMapState(`?${query}`);
  expect(state).toEqual({ layer: layerId, province: provinceId, filter: { min: 100, max: 500 }, airports: true });
});

test("omits empty state and keeps numbers unformatted", () => {
  expect(mapStateQuery({ layer: "", province: "", filter: { min: null, max: null }, airports: false })).toBe("");
  const query = mapStateQuery({ layer: "", province: "", filter: { min: -1.5, max: 0 }, airports: false });
  expect(query).toBe("min=-1.5&max=0");
});

test("rejects layer identifiers that are not six-part tuples of short strings", () => {
  expect(parseLayerId(layerId)).toBe(layerId);
  expect(parseLayerId(null)).toBe("");
  expect(parseLayerId("not-json")).toBe("");
  expect(parseLayerId(JSON.stringify(["a", "b"]))).toBe("");
  expect(parseLayerId(JSON.stringify(["a", "b", "c", "d", "e", 6]))).toBe("");
  expect(parseLayerId(JSON.stringify(["a", "b", "c", "d", "e", "f".repeat(200)]))).toBe("");
  expect(parseLayerId(JSON.stringify(["a", "b", "c", "d", "e", "f"])).length).toBeGreaterThan(0);
});

test("ignores malformed province ids and non-numeric bounds", () => {
  const state = readMapState(`?province=not-a-uuid&min=abc&max=10`);
  expect(state.province).toBe("");
  expect(state.filter).toEqual({ min: null, max: 10 });
  expect(readMapState("").layer).toBe("");
});
