import { parseFilterBound, type LayerFilter } from "./filters";

export type MapViewState = {
  layer: string;
  province: string;
  filter: LayerFilter;
  airports: boolean;
};

const provincePattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const maxLayerIdLength = 400;
const maxLayerPartLength = 120;

/**
 * Layer identifiers are JSON tuples produced by the map repository. Reject anything that is not a
 * six-part tuple of short strings so a shared link cannot inject arbitrary text into the layer select.
 */
export function parseLayerId(value: string | null): string {
  if (!value || value.length > maxLayerIdLength) return "";
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || parsed.length !== 6) return "";
    if (!parsed.every((part) => typeof part === "string" && part.length > 0 && part.length <= maxLayerPartLength)) return "";
    return value;
  } catch {
    return "";
  }
}

export function readMapState(search: string): MapViewState {
  const params = new URLSearchParams(search);
  const province = params.get("province") ?? "";
  return {
    layer: parseLayerId(params.get("layer")),
    province: provincePattern.test(province) ? province.toLowerCase() : "",
    filter: { min: parseFilterBound(params.get("min") ?? ""), max: parseFilterBound(params.get("max") ?? "") },
    airports: params.get("airports") === "1",
  };
}

export function mapStateQuery(state: MapViewState): string {
  const params = new URLSearchParams();
  if (state.layer) params.set("layer", state.layer);
  if (state.province) params.set("province", state.province);
  if (state.filter.min !== null) params.set("min", String(state.filter.min));
  if (state.filter.max !== null) params.set("max", String(state.filter.max));
  if (state.airports) params.set("airports", "1");
  return params.toString();
}
