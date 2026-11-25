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

const contextRadiusKm = 150;

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
				) <= contextRadiusKm,
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
