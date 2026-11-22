import {
	checkDatabaseReadiness,
	loadComparableDatabaseCatalog,
	loadDatabaseCatalog,
	loadDatabaseCatalogSummary,
	searchDatabaseGeographies,
	type CatalogSummary,
	type ComparableCatalogResult,
	type DatabaseSearchOptions,
	type SearchGeographiesResult,
} from "./database-repository";
import type { Catalog, Geography } from "./types";
import { reportUnavailable } from "../../lib/api-operations";

export async function loadPublicCatalog(
	geoIds?: string[],
	includeObservations = true,
	level?: Geography["level"],
): Promise<Catalog> {
	try {
		const catalog = await loadDatabaseCatalog(
			geoIds,
			includeObservations,
			level,
		);
		if (catalog.publicationStatus !== "published") reportUnavailable("catalog");
		return catalog;
	} catch {
		reportUnavailable("database");
		reportUnavailable("catalog");
		return {
			mode: "unavailable",
			publicationStatus: "unavailable",
			source: null,
			geographies: [],
			observations: [],
		};
	}
}

export async function loadComparablePublicCatalog(
	geoIds: string[],
	period?: string,
): Promise<ComparableCatalogResult> {
	try {
		const catalog = await loadComparableDatabaseCatalog(geoIds, period);
		if (catalog.publicationStatus !== "published") reportUnavailable("catalog");
		return catalog;
	} catch {
		reportUnavailable("database");
		reportUnavailable("catalog");
		return {
			mode: "unavailable",
			publicationStatus: "unavailable",
			source: null,
			geographies: [],
			observations: [],
			availablePeriods: [],
			selectedPeriod: period ?? null,
		};
	}
}

export async function checkPublicReadiness(): Promise<{
	mode: Catalog["mode"];
	publicationStatus: Catalog["publicationStatus"];
}> {
	try {
		const status = await checkDatabaseReadiness();
		if (status.publicationStatus !== "published") reportUnavailable("catalog");
		return status;
	} catch {
		reportUnavailable("database");
		reportUnavailable("catalog");
		return {
			mode: "unavailable",
			publicationStatus: "unavailable",
		};
	}
}

export async function loadPublicCatalogSummary(): Promise<CatalogSummary> {
	try {
		const summary = await loadDatabaseCatalogSummary();
		if (summary.publicationStatus !== "published") reportUnavailable("catalog");
		return summary;
	} catch {
		reportUnavailable("database");
		reportUnavailable("catalog");
		return {
			mode: "unavailable",
			publicationStatus: "unavailable",
			dataset: null,
			coverage: {
				total: 0,
				pointOnly: 0,
				boundaryReady: 0,
				publicBoundaryAvailable: false,
			},
		};
	}
}

export async function searchPublicGeographies(
	options: DatabaseSearchOptions,
): Promise<SearchGeographiesResult> {
	try {
		const result = await searchDatabaseGeographies(options);
		if (result.publicationStatus !== "published") reportUnavailable("catalog");
		return result;
	} catch {
		reportUnavailable("database");
		reportUnavailable("catalog");
		return {
			mode: "unavailable",
			publicationStatus: "unavailable",
			dataset: null,
			geographies: [],
		};
	}
}
