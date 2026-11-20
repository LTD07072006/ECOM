import { loadDatabaseCatalog } from "./database-repository";
import type { Catalog } from "./types";

export async function loadPublicCatalog(): Promise<Catalog> {
  try {
    return await loadDatabaseCatalog();
  } catch {
    return { mode: "unavailable", publicationStatus: "unavailable", source: null, geographies: [], observations: [] };
  }
}
