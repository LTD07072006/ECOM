import type { Catalog, Geography, Profile } from "./types";

export function summarizeGeometryCoverage(geographies: Geography[]) {
  const boundaryReady = geographies.filter((geo) => geo.geometryStatus === "boundary_available" || geo.geometryStatus === "boundary_verified").length;
  const pointOnly = geographies.filter((geo) => geo.geometryStatus === "point_only").length;
  return {
    total: geographies.length,
    pointOnly,
    boundaryReady,
    publicBoundaryAvailable: boundaryReady > 0,
  };
}

export function normalizeSearch(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().trim().replace(/\s+/g, " ");
}

export function getPublicCatalog(catalog: Catalog): Catalog {
  if (catalog.publicationStatus !== "published" || catalog.source?.access !== "public" || catalog.source.status !== "active") {
    return { ...catalog, geographies: [], observations: [] };
  }
  return { ...catalog, observations: catalog.observations.filter((o) => o.source.access === "public" && o.source.status === "active") };
}

export function searchGeographies(catalog: Catalog, query: string, level?: Geography["level"]): Geography[] {
  const normalized = normalizeSearch(query);
  return getPublicCatalog(catalog).geographies
    .filter((geo) => (!level || geo.level === level) && normalizeSearch(`${geo.name} ${geo.displayName} ${geo.normalizedName} ${geo.code}`).includes(normalized))
    .sort((left, right) => Number(right.code.toLowerCase() === normalized) - Number(left.code.toLowerCase() === normalized))
    .slice(0, 50);
}

export function getProfile(catalog: Catalog, id: string): Profile | null {
  const publicCatalog = getPublicCatalog(catalog);
  const geography = publicCatalog.geographies.find((geo) => geo.id === id);
  if (!geography) return null;
  return { ...geography, administrativeDataset: publicCatalog.dataset, observations: publicCatalog.observations.filter((o) => o.geoId === id) };
}

export function compareProfiles(profiles: Profile[]) {
  const failure = (reason: string) => ({
    compatible: false,
    reason,
    rows: [],
  });

  if (profiles.length < 2 || profiles.length > 3) return failure("Select between two and three places to compare.");
  if (new Set(profiles.map((profile) => profile.id)).size !== profiles.length) return failure("A place can only appear once in a comparison.");
  if (new Set(profiles.map((profile) => profile.level)).size !== 1) return failure("Places must use the same geography level.");
  if (new Set(profiles.map((profile) => profile.geographyVersion)).size !== 1) return failure("Places use different geography versions.");

  const indicatorOrder = [...new Set(profiles.flatMap((profile) => profile.observations.map((observation) => observation.indicator)))];
  const observationsByProfile = profiles.map((profile) => new Map(profile.observations.map((observation) => [observation.indicator, observation])));
  if (profiles.some((_, index) => observationsByProfile[index].size !== profiles[index].observations.length)) {
    return failure("A place contains duplicate indicator observations.");
  }

  const rows = indicatorOrder.map((indicator) => {
    const observations = observationsByProfile.map((map) => map.get(indicator));
    const reference = observations[0];
    const metadataMatches = Boolean(reference) && observations.every((observation) => Boolean(observation)
      && observation!.periodStart === reference!.periodStart
      && observation!.periodEnd === reference!.periodEnd
      && observation!.unit === reference!.unit
      && observation!.definition === reference!.definition
      && observation!.scope === reference!.scope
      && observation!.datasetVersion === reference!.datasetVersion);
    return {
      indicator,
      label: reference?.label ?? indicator,
      unit: reference?.unit ?? "",
      metadataMatches,
      values: observations.map((observation) => metadataMatches && observation?.quality !== "unavailable" ? observation?.value ?? null : null),
    };
  });
  const compatible = rows.length > 0 && rows.every((row) => row.metadataMatches);
  return {
    compatible,
    reason: compatible ? null : "Different dataset snapshots, periods, scopes, units, definitions, or missing indicators. Direct comparison is not available.",
    rows: compatible ? rows : rows.map((row) => ({ ...row, values: row.values.map(() => null) })),
  };
}
