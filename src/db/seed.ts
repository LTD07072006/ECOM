import "dotenv/config";
import postgres from "postgres";
import { env } from "../lib/env";
import { demoCatalog, ids } from "./seed-data";

const sql = postgres(env.DATABASE_URL, { max: 1 });
const seedSource = demoCatalog.source;

if (!seedSource) throw new Error("Demo seed requires a source record.");

async function seed() {
  await sql.begin(async (tx) => {
    await tx`
      insert into market_entry.source_registry
        (source_id, publisher, title, url, source_type, license, access_right, citation_text, status)
      values
        (${ids.source}, ${seedSource.publisher}, ${seedSource.title}, ${seedSource.url}, 'manual', ${seedSource.license}, ${seedSource.access}, ${seedSource.citation}, 'active')
      on conflict (source_id) do nothing
    `;
      await tx`
        insert into market_entry.dataset_versions
        (dataset_version_id, source_id, dataset_code, version_label, published_at, publication_status)
      values
        (${ids.dataset}, ${ids.source}, 'DEMO_CONTEXT', 'demo-v1', now(), 'draft')
      on conflict (dataset_version_id) do nothing
    `;
    await tx`
      insert into market_entry.geography_versions
        (geography_version_id, authority_source_id, code, name, effective_from, status)
      values
        (${ids.geography}, ${ids.source}, ${demoCatalog.geographies[0].geographyVersion}, 'Demonstration geography version', '2026-01-01', 'active')
      on conflict (geography_version_id) do nothing
    `;
    for (const indicator of [
      [ids.population, "POP_TOTAL", "Population", "people", "integer"],
      [ids.area, "AREA_TOTAL", "Area", "km²", "decimal"],
      [ids.density, "POP_DENSITY", "Population density", "people/km²", "decimal"],
    ] as const) {
      await tx`
        insert into market_entry.indicator_definitions
          (indicator_id, code, label, description, domain, value_type, unit, period_type, polarity, is_proxy, score_eligible, status)
        values
          (${indicator[0]}, ${indicator[1]}, ${indicator[2]}, ${demoCatalog.observations.find((o) => o.indicator === indicator[1])!.definition}, 'geography_context', ${indicator[4]}, ${indicator[3]}, 'year', 'context_only', true, false, 'active')
        on conflict (indicator_id) do nothing
      `;
    }
    for (const geo of demoCatalog.geographies) {
      await tx`
        insert into market_entry.geo_units
          (geo_id, geography_version_id, admin_code, name, display_name, normalized_name, level, parent_geo_id, valid_from, latitude, longitude, geometry_status)
        values
          (${geo.id}, ${ids.geography}, ${geo.code}, ${geo.name}, ${geo.displayName}, ${geo.normalizedName}, ${geo.level}, ${geo.parentId}, '2026-01-01', ${geo.latitude}, ${geo.longitude}, ${geo.geometryStatus})
        on conflict (geo_id) do nothing
      `;
    }
    for (const observation of demoCatalog.observations) {
      await tx`
        insert into market_entry.observations
          (observation_id, geo_id, indicator_id, period_start, period_end, period_label, value_type, unit, scope, source_id, dataset_version_id, quality_status, missing_reason, method_note, limitations)
        values
          (${observation.id}, ${observation.geoId}, ${observation.indicator === 'POP_TOTAL' ? ids.population : observation.indicator === 'AREA_TOTAL' ? ids.area : ids.density}, ${observation.periodStart}, ${observation.periodEnd}, ${observation.period}, ${observation.indicator === 'POP_TOTAL' ? 'integer' : 'decimal'}, ${observation.unit}, ${observation.scope}, ${ids.source}, ${ids.dataset}, 'unavailable', ${observation.missingReason}, ${observation.method}, ${observation.limitations})
        on conflict (observation_id) do nothing
      `;
    }
  });
  console.log(`Seeded ${demoCatalog.geographies.length} geographies and ${demoCatalog.observations.length} observations.`);
}

seed().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => sql.end());
