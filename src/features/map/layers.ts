import type { FeatureCollection, Point } from "geojson";
import type { DatasetMetadata } from "../geography/types";

export const indicatorGroups: Record<string, string> = {
  POP_AVG: "Population",
  GRDP_PC: "Economy and retail",
  GRDP_GROWTH: "Economy and retail",
  RETAIL_TOTAL: "Economy and retail",
  FDI_LICENSED: "Investment and business",
  ENTERPRISES_NEW: "Investment and business",
  LABOR_FORCE: "Workforce and talent",
  TRAINED_LABOR_RATE: "Workforce and talent",
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
};

export type InfrastructureLayer = {
  dataset: DatasetMetadata;
  points: FeatureCollection<Point, { name: string; code: string | null; geoId: string; province: string; url: string }>;
};

export type MapLayers = { indicators: StatisticalLayer[]; infrastructure: InfrastructureLayer | null };

export const mapRamp = ["#35621f", "#639239", "#9abb52", "#d8e684"] as const;
export const missingColor = "#667b76";

export function colorScale(layer: StatisticalLayer) {
  const values = Object.values(layer.values).filter((value): value is number => value !== null).sort((a, b) => a - b);
  const min = values[0];
  const max = values.at(-1);
  if (min === undefined || max === undefined) return [];
  if (min === max) return [{ min, max, color: mapRamp[1] }];
  const width = (max - min) / mapRamp.length;
  return mapRamp.map((color, index) => ({ min: min + width * index, max: index === 3 ? max : min + width * (index + 1), color }));
}

export function layerColor(value: number | null, bins: ReturnType<typeof colorScale>) {
  if (value === null) return missingColor;
  return bins.find((bin, index) => value < bin.max || index === bins.length - 1)?.color ?? missingColor;
}

export function sourcesAreComparable(left: StatisticalLayer, right: StatisticalLayer) {
  return left.id !== right.id && left.geographyVersion === right.geographyVersion
    && left.indicator === right.indicator && left.definition === right.definition && left.unit === right.unit
    && left.periodStart === right.periodStart && left.periodEnd === right.periodEnd && left.scope === right.scope
    && Object.keys(left.values).some((id) => left.values[id] != null && right.values[id] != null);
}
