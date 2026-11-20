import { expect, test } from "bun:test";
import postgres from "postgres";
import { env } from "../../src/lib/env";

const databaseTest = process.env.RUN_DB_TESTS === "1" ? test : test.skip;

databaseTest("local database exposes PostGIS", async () => {
  const sql = postgres(env.DATABASE_URL, { max: 1 });
  try {
    const rows = await sql<{ version: string }[]>`select postgis_full_version() as version`;
    expect(rows[0]?.version).toContain("POSTGIS=");
  } finally {
    await sql.end();
  }
});
