import type { Observation, Profile } from "../geography/types";

export const regionIndicators = ["POP_AVG", "LABOR_FORCE"] as const;
export type RegionMetric = { value: number; observation: Observation } | { value: null; reason: "empty" | "missing" | "incompatible" };

export function regionMetric(profiles: Profile[], indicator: string): RegionMetric {
  if (!profiles.length) return { value: null, reason: "empty" };
  if (new Set(profiles.map((p) => p.id)).size !== profiles.length || profiles.some((p) => p.level !== "province") || new Set(profiles.map((p) => p.geographyVersion)).size !== 1) return { value: null, reason: "incompatible" };
  const rows = profiles.map((profile) => profile.observations.filter((item) => item.indicator === indicator));
  if (rows.some((items) => items.length !== 1 || items[0].value === null || !Number.isFinite(items[0].value) || items[0].quality === "unavailable")) return { value: null, reason: "missing" };
  const items = rows.map((row) => row[0]);
  const first = items[0];
  if (!first.dataset?.id || items.some((o) => o.source.id !== first.source.id || o.dataset?.id !== first.dataset?.id || o.datasetVersion !== first.datasetVersion || o.periodStart !== first.periodStart || o.periodEnd !== first.periodEnd || o.unit !== first.unit || o.scope !== first.scope || o.definition !== first.definition)) return { value: null, reason: "incompatible" };
  return { value: items.reduce((sum, item) => sum + item.value!, 0), observation: first };
}

export function compatibleRegionMetrics(a: RegionMetric, b: RegionMetric): boolean {
  if (a.value === null || b.value === null) return false;
  const x = a.observation, y = b.observation;
  return x.source.id === y.source.id && !!x.dataset?.id && x.dataset.id === y.dataset?.id && x.datasetVersion === y.datasetVersion && x.periodStart === y.periodStart && x.periodEnd === y.periodEnd && x.unit === y.unit && x.scope === y.scope && x.definition === y.definition;
}
