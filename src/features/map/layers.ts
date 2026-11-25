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

export type IndicatorFamily =
	| "population"
	| "economy"
	| "investment"
	| "workforce";

export const familyOrder: readonly IndicatorFamily[] = [
	"population",
	"economy",
	"investment",
	"workforce",
];

// MapLibre GL canvas paint expressions and SVG data visualizations require literal color strings matching CSS tokens.
export const familyRamps: Record<
	IndicatorFamily,
	readonly [string, string, string, string, string]
> = {
	population: ["#F4D8CD", "#E8AE97", "#D57B5E", "#B5432F", "#7E2A1C"],
	economy: ["#F7EBC8", "#EDD38C", "#E0AE3A", "#B8861D", "#7D590E"],
	investment: ["#DCE3F0", "#A9BBE0", "#6884B8", "#26406B", "#162642"],
	workforce: ["#D9EBE4", "#9FC9BA", "#66A28D", "#3E7C67", "#234B3D"],
};

export const familyLeadColors: Record<IndicatorFamily, string> = {
	population: "#B5432F",
	economy: "#E0AE3A",
	investment: "#26406B",
	workforce: "#3E7C67",
};

export const mapCanvasColors = {
	ground: "#F2F3F0",
	surface: "#FAFAF7",
	ink: "#1C1C1A",
	selectedStroke: "#E0AE3A",
	baseFill: "#D9D9D3",
	regionFill: "#26406B",
} as const;

export const chartColors = {
	primary: "#26406B",
	internal: "#3E7C67",
	accent: "#B5432F",
	ink: "#1C1C1A",
	muted: "#4A4A46",
} as const;

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
	airport: "#26406B",
	seaport: "#3E7C67",
	industrial_park: "#B5432F",
	icd: "#E0AE3A",
	expressway_node: "#1C1C1A",
};

export type InfrastructurePointProperties = {
	name: string;
	code: string | null;
	kind: InfrastructureKind;
	geoId: string;
	province: string;
	url: string;
	airportClassification?: "international" | "domestic" | null;
	airportOperationalStatus?:
		| "operational"
		| "planned"
		| "not_operational"
		| null;
	portType?: "deep_sea" | "coastal" | "river" | "container_terminal" | null;
	portOperationalStatus?: "operational" | "planned" | "not_operational" | null;
	classificationSourceUrl?: string | null;
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

export const mapRamp = familyRamps.population;
export const missingColor = "#D9D9D3";

export function layerFamily(indicator: string): IndicatorFamily {
	const group = indicatorGroups[indicator];
	if (
		group === "population" ||
		group === "economy" ||
		group === "investment" ||
		group === "workforce"
	) {
		return group;
	}
	return "population";
}

function pickRampColor(
	ramp: readonly string[],
	index: number,
	binCount: number,
): string {
	if (binCount <= 1) return ramp[Math.floor(ramp.length / 2)];
	const scaled = Math.round((index * (ramp.length - 1)) / (binCount - 1));
	return ramp[scaled] ?? ramp[ramp.length - 1];
}

export function colorScale(layer: StatisticalLayer) {
	const ramp = familyRamps[layerFamily(layer.indicator)];
	const values = Object.values(layer.values)
		.filter(
			(value): value is number => value !== null && Number.isFinite(value),
		)
		.sort((a, b) => a - b);
	if (values.length === 0) return [];

	const groups: Array<{ value: number; count: number }> = [];
	for (const value of values) {
		const last = groups[groups.length - 1];
		if (last && last.value === value) {
			last.count += 1;
		} else {
			groups.push({ value, count: 1 });
		}
	}

	if (groups.length === 1) {
		const only = groups[0].value;
		return [{ min: only, max: only, color: ramp[2] }];
	}

	const binCount = Math.min(ramp.length, groups.length);
	const bins: Array<{ min: number; max: number; color: string }> = [];
	let start = 0;
	let consumed = 0;

	for (let binIndex = 0; binIndex < binCount; binIndex += 1) {
		const remainingBins = binCount - binIndex;
		if (remainingBins === 1) {
			bins.push({
				min: groups[start].value,
				max: groups[groups.length - 1].value,
				color: pickRampColor(ramp, binIndex, binCount),
			});
			break;
		}
		const target = (values.length - consumed) / remainingBins;
		const maxEnd = groups.length - (remainingBins - 1);
		let end = start + 1;
		let bucketCount = groups[start].count;
		while (end < maxEnd) {
			const nextCount = bucketCount + groups[end].count;
			if (Math.abs(nextCount - target) <= Math.abs(bucketCount - target)) {
				bucketCount = nextCount;
				end += 1;
			} else {
				break;
			}
		}
		bins.push({
			min: groups[start].value,
			max: groups[end - 1].value,
			color: pickRampColor(ramp, binIndex, binCount),
		});
		consumed += bucketCount;
		start = end;
	}

	return bins;
}

export function layerColor(
	value: number | null,
	bins: ReturnType<typeof colorScale>,
) {
	if (value === null) return missingColor;
	return (
		bins.find((bin, index) => value <= bin.max || index === bins.length - 1)
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
