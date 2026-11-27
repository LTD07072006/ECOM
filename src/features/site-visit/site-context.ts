import type { FeatureCollection, Point } from "geojson";
import { haversineKm } from "../map/layers";
import {
	canonicalInfrastructurePois,
	type ReferenceInfrastructurePoi,
} from "../map/proximity";

export type SiteContextProperties = {
	code: string;
	name: string;
	kind: ReferenceInfrastructurePoi["kind"];
	province: string;
	url: string;
	longitude: number;
	latitude: number;
};

export const SITE_CONTEXT_KINDS = [
	"airport",
	"seaport",
	"icd",
	"industrial_park",
] as const;
export type SiteContextKind = (typeof SITE_CONTEXT_KINDS)[number];
export const SITE_CONTEXT_RADIUS_KM = 150;

export type SiteContextKindCounts = Record<SiteContextKind, number>;

export function toSiteVisitContext(center: {
	longitude: number;
	latitude: number;
}): FeatureCollection<Point, SiteContextProperties> {
	const features = canonicalInfrastructurePois
		.filter(
			(poi) =>
				Number.isFinite(poi.longitude) &&
				Number.isFinite(poi.latitude) &&
				Number.isFinite(center.longitude) &&
				Number.isFinite(center.latitude) &&
				haversineKm(
					center.latitude,
					center.longitude,
					poi.latitude,
					poi.longitude,
				) <= SITE_CONTEXT_RADIUS_KM,
		)
		.map((poi) => ({
			type: "Feature" as const,
			properties: {
				code: poi.code,
				name: poi.name,
				kind: poi.kind,
				province: poi.provinceName,
				url: poi.referenceUrl,
				longitude: poi.longitude,
				latitude: poi.latitude,
			},
			geometry: {
				type: "Point" as const,
				coordinates: [poi.longitude, poi.latitude],
			},
		}));
	return { type: "FeatureCollection", features };
}

export function filterSiteVisitContext(
	context: FeatureCollection<Point, SiteContextProperties>,
	enabledKinds: readonly SiteContextKind[],
): FeatureCollection<Point, SiteContextProperties> {
	const enabled = new Set(enabledKinds);
	return {
		type: "FeatureCollection",
		features: context.features.filter((feature) =>
			enabled.has(feature.properties.kind as SiteContextKind),
		),
	};
}

export function countSiteVisitContextByKind(
	context: FeatureCollection<Point, SiteContextProperties>,
): SiteContextKindCounts {
	const counts = Object.fromEntries(
		SITE_CONTEXT_KINDS.map((kind) => [kind, 0]),
	) as SiteContextKindCounts;
	for (const feature of context.features) {
		if (feature.properties.kind in counts)
			counts[feature.properties.kind as SiteContextKind] += 1;
	}
	return counts;
}
