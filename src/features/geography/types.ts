import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";

export type GeometryStatus = "not_available" | "point_only" | "boundary_available" | "boundary_verified" | "restricted";

export type Geography = {
  id: string;
  code: string;
  name: string;
  displayName: string;
  normalizedName: string;
  level: "country" | "province" | "commune";
  parentId: string | null;
  parentName: string | null;
  geographyVersion: string;
  longitude: number | null;
  latitude: number | null;
  geometryStatus: GeometryStatus;
};

export type Source = {
  id: string;
  publisher: string;
  title: string;
  url: string | null;
  citation: string;
  license: string;
  access: string;
  status: string;
  updatedAt: string;
};

export type DatasetMetadata = {
  code: string;
  version: string;
  owner: string;
  dataAsOf: string;
  reviewedAt: string;
  reviewDueAt: string;
  freshness: "current" | "review_due";
  publicationStatus: "published";
  source: Source;
};

export type Observation = {
  id: string;
  geoId: string;
  indicator: string;
  label: string;
  definition: string;
  value: number | null;
  unit: string;
  period: string;
  periodStart: string;
  periodEnd: string;
  scope: string;
  quality: "verified" | "supported" | "unavailable";
  missingReason: string | null;
  method: string;
  limitations: string;
  datasetVersion: string;
  dataset?: DatasetMetadata;
  source: Source;
};

export type Catalog = {
  mode: "demo" | "database" | "unavailable";
  publicationStatus: string;
  source: Source | null;
  dataset?: DatasetMetadata;
  geographies: Geography[];
  observations: Observation[];
};

export type Profile = Geography & { observations: Observation[]; administrativeDataset?: DatasetMetadata };

export type ProvinceMapData = FeatureCollection<Polygon | MultiPolygon, { id: string; code: string; name: string }> & {
  dataset: DatasetMetadata | null;
};
