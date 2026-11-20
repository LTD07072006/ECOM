import { loadDatabaseCatalog } from "./database-repository";
import type { Catalog } from "./types";
import { reportUnavailable } from "../../lib/api-operations";

export async function loadPublicCatalog(): Promise<Catalog> {
  try {
    const catalog = await loadDatabaseCatalog();
    if (catalog.publicationStatus !== "published") reportUnavailable("catalog");
    return catalog;
  } catch {
    reportUnavailable("database");
    reportUnavailable("catalog");
    return { mode: "unavailable", publicationStatus: "unavailable", source: null, geographies: [], observations: [] };
  }
}
