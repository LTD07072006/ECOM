import { parseFilterBound, type LayerFilter } from "./filters";

export type MapViewState = {
	layer: string;
	province: string;
	filter: LayerFilter;
	airports: boolean;
};

export const BOUNDARIES_LAYER = "boundaries";

const uuidPattern =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const maxLayerIdLength = 400;
const maxLayerPartLength = 120;

/**
 * Layer identifiers are JSON tuples produced by the map repository, plus the explicit
 * "boundaries" sentinel for boundary-only mode. Reject anything else so a shared link
 * cannot inject arbitrary text into the layer select.
 */
export function parseLayerId(value: string | null): string {
	if (!value || value.length > maxLayerIdLength) return "";
	if (value === BOUNDARIES_LAYER) return BOUNDARIES_LAYER;
	try {
		const parsed: unknown = JSON.parse(value);
		if (!Array.isArray(parsed) || parsed.length !== 6) return "";
		if (
			!parsed.every(
				(part) =>
					typeof part === "string" &&
					part.length > 0 &&
					part.length <= maxLayerPartLength,
			)
		)
			return "";
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
		province: uuidPattern.test(province) ? province.toLowerCase() : "",
		filter: {
			min: parseFilterBound(params.get("min") ?? ""),
			max: parseFilterBound(params.get("max") ?? ""),
		},
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

function parseUuidList(raw: string | null, limit: number): string[] {
	if (!raw) return [];
	const seen = new Set<string>();
	const result: string[] = [];
	for (const part of raw.split(",")) {
		const candidate = part.trim().toLowerCase();
		if (!uuidPattern.test(candidate) || seen.has(candidate)) continue;
		seen.add(candidate);
		result.push(candidate);
		if (result.length >= limit) break;
	}
	return result;
}

export function readCompareIds(search: string): string[] {
	const params = new URLSearchParams(search);
	const ids = parseUuidList(params.get("compare"), 3);
	return ids.length >= 2 && ids.length <= 3 ? ids : [];
}

export function compareQuery(ids: readonly string[]): string {
	const valid = parseUuidList(ids.join(","), 3);
	if (valid.length < 2) return "";
	return new URLSearchParams({ compare: valid.join(",") }).toString();
}

export function readRegionIds(search: string): [string[], string[]] {
	const params = new URLSearchParams(search);
	const regionA = parseUuidList(params.get("regionA"), 10);
	const seenA = new Set(regionA);
	const regionB = parseUuidList(params.get("regionB"), 10).filter(
		(id) => !seenA.has(id),
	);
	return [regionA, regionB];
}

export function regionQueryParams(
	regions: readonly [readonly string[], readonly string[]],
): {
	regionA: string | null;
	regionB: string | null;
} {
	const a = parseUuidList(regions[0].join(","), 10);
	const seenA = new Set(a);
	const b = parseUuidList(regions[1].join(","), 10).filter(
		(id) => !seenA.has(id),
	);
	return {
		regionA: a.length > 0 ? a.join(",") : null,
		regionB: b.length > 0 ? b.join(",") : null,
	};
}
