import type { SectorId } from "./model";
import type { WageRegion } from "./site-screening";

export type ScenarioParams = {
	geos?: readonly string[];
	sector?: SectorId;
	region?: WageRegion;
	rent?: number;
	elec?: number;
	area?: number;
	rentShock?: number;
	elecShock?: number;
};
const limits = {
	rent: [0, 1e10],
	elec: [0, 1e7],
	area: [0, 1e9],
	rentShock: [-20, 20],
	elecShock: [-20, 20],
} as const;
const geoPattern = /^(?:\d{2}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12})$/i;

export function parseScenarioParams(params: URLSearchParams): ScenarioParams {
	const result: ScenarioParams = {};
	const single = (key: string) =>
		params.getAll(key).length === 1 ? params.get(key) : null;
	const geos = single("geos")?.toLowerCase().split(",");
	if (
		geos &&
		geos.length >= 2 &&
		geos.length <= 3 &&
		new Set(geos).size === geos.length &&
		geos.every((geo) => geoPattern.test(geo))
	)
		result.geos = geos;
	const sector = single("sector");
	if (
		sector === "retail" ||
		sector === "manufacturing" ||
		sector === "logistics" ||
		sector === "enterprise"
	)
		result.sector = sector;
	const region = single("region");
	if (region === "I" || region === "II" || region === "III" || region === "IV")
		result.region = region;
	for (const key of Object.keys(limits) as (keyof typeof limits)[]) {
		const raw = single(key);
		if (!raw || !/^-?\d+(?:\.\d+)?$/.test(raw)) continue;
		const value = Number(raw);
		const [min, max] = limits[key];
		if (
			value >= min &&
			value <= max &&
			(!key.endsWith("Shock") || value % 5 === 0)
		)
			result[key] = value;
	}
	return result;
}

export function serializeScenarioParams(state: ScenarioParams) {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(state))
		if (value !== undefined)
			params.set(key, Array.isArray(value) ? value.join(",") : String(value));
	return new URLSearchParams(
		Object.entries(parseScenarioParams(params)).map(([key, value]) => [
			key,
			Array.isArray(value) ? value.join(",") : String(value),
		]),
	);
}
