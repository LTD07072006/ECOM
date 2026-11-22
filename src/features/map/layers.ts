import type { FeatureCollection, Point } from "geojson";
import type { DatasetMetadata } from "../geography/types";

export const indicatorGroups: Record<string, string> = {
	POP_AVG: "population",
	GRDP_PC: "economy",
	GRDP_GROWTH: "economy",
	RETAIL_TOTAL: "economy",
	FDI_LICENSED: "investment",
	ENTERPRISES_NEW: "investment",
	LABOR_FORCE: "workforce",
	TRAINED_LABOR_RATE: "workforce",
};

export type StatisticalLayer = {
	id: string;
	indicator: string;
	label: string;
	definition: string;
	geographyVersion: string;
	period: string;
	periodStart: string;
	periodEnd: string;
	unit: string;
	scope: string;
	limitations: string;
	method: string;
	dataset: DatasetMetadata;
	values: Record<string, number | null>;
	valueDetails?: Record<
		string,
		{
			quality: string;
			missingReason: string | null;
			method: string | null;
			limitations: string | null;
		}
	>;
};

export type InfrastructureKind =
	| "airport"
	| "seaport"
	| "industrial_park"
	| "icd"
	| "expressway_node";

export const infrastructureKindOrder: readonly InfrastructureKind[] = [
	"airport",
	"seaport",
	"industrial_park",
	"icd",
	"expressway_node",
];

export const infrastructureKindColors: Record<InfrastructureKind, string> = {
	airport: "#73d8f5",
	seaport: "#f2c14e",
	industrial_park: "#f78154",
	icd: "#b5838d",
	expressway_node: "#90be6d",
};

export type InfrastructurePointProperties = {
	name: string;
	code: string | null;
	kind: InfrastructureKind;
	geoId: string;
	province: string;
	url: string;
};

export type ProvinceInfrastructureItem = InfrastructurePointProperties & {
	longitude: number;
	latitude: number;
};

export type InfrastructureLayer = {
	dataset: DatasetMetadata;
	kinds?: Record<string, number>;
	points: FeatureCollection<Point, InfrastructurePointProperties>;
};

export function filterInfrastructureByKinds(
	layer: InfrastructureLayer | null,
	enabledKinds: readonly InfrastructureKind[],
): InfrastructureLayer | null {
	if (!layer || enabledKinds.length === 0) return null;
	const active = new Set(enabledKinds);
	const features = layer.points.features.filter((feature) =>
		active.has(feature.properties.kind),
	);
	if (features.length === 0) return null;
	return {
		...layer,
		points: {
			type: "FeatureCollection",
			features,
		},
	};
}

export function haversineKm(
	lat1: number,
	lon1: number,
	lat2: number,
	lon2: number,
): number {
	const toRad = (deg: number) => (deg * Math.PI) / 180;
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
	return Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export type MapLayers = {
	indicators: StatisticalLayer[];
	infrastructure: InfrastructureLayer | null;
};

export const mapRamp = ["#35621f", "#639239", "#9abb52", "#d8e684"] as const;
export const missingColor = "#667b76";

export function colorScale(layer: StatisticalLayer) {
	const values = Object.values(layer.values)
		.filter((value): value is number => value !== null)
		.sort((a, b) => a - b);
	const min = values[0];
	const max = values.at(-1);
	if (min === undefined || max === undefined) return [];
	if (min === max) return [{ min, max, color: mapRamp[1] }];
	const width = (max - min) / mapRamp.length;
	return mapRamp.map((color, index) => ({
		min: min + width * index,
		max: index === 3 ? max : min + width * (index + 1),
		color,
	}));
}

export function layerColor(
	value: number | null,
	bins: ReturnType<typeof colorScale>,
) {
	if (value === null) return missingColor;
	return (
		bins.find((bin, index) => value < bin.max || index === bins.length - 1)
			?.color ?? missingColor
	);
}

export function sourcesAreComparable(
	left: StatisticalLayer,
	right: StatisticalLayer,
) {
	return (
		left.id !== right.id &&
		left.geographyVersion === right.geographyVersion &&
		left.indicator === right.indicator &&
		left.definition === right.definition &&
		left.unit === right.unit &&
		left.periodStart === right.periodStart &&
		left.periodEnd === right.periodEnd &&
		left.scope === right.scope &&
		Object.keys(left.values).some(
			(id) => left.values[id] != null && right.values[id] != null,
		)
	);
}
