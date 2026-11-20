import "dotenv/config";
import postgres from "postgres";
import { env } from "../lib/env";
import { loadDatabaseCatalog, loadProvinceMap } from "../features/geography/database-repository";

const sql = postgres(env.DATABASE_URL, { max: 1 });

try {
  const [[postgis], catalog, map] = await Promise.all([
    sql<{ version: string }[]>`select postgis_full_version() as version`,
    loadDatabaseCatalog(),
    loadProvinceMap(),
  ]);
  console.log(JSON.stringify({
    database: "ready",
    postgis: postgis.version,
    publicationStatus: catalog.publicationStatus,
    geographyVersion: catalog.geographies[0]?.geographyVersion ?? null,
    geographies: catalog.geographies.length,
    boundaries: map.features.length,
    observations: catalog.observations.length,
  }));
} catch (error) {
  console.error("Database check failed. Start Docker Compose and run migrations first.", error);
  process.exitCode = 1;
} finally {
  await sql.end();
}
