import { randomBytes } from "node:crypto";
import { expect, test } from "bun:test";
import { databasePool } from "../../src/db/pool";
import { observeApi } from "../../src/lib/api-operations";

const databaseTest = process.env.RUN_INQUIRY_DB_TESTS === "1" ? test : test.skip;

databaseTest("trusted clients have independent PostgreSQL quotas and share the route ceiling", async () => {
  const database = new URL(process.env.DATABASE_URL ?? "");
  if (database.hostname !== "127.0.0.1" || !/^\/ecom_inquiry_it_[a-z0-9_]+$/.test(database.pathname)) {
    throw new Error("Use a disposable local inquiry database.");
  }
  const env: Record<string, string | undefined> = process.env;
  const originalMode = env.NODE_ENV;
  const originalSecret = env.ECOM_TRUSTED_PROXY_TOKEN;
  const token = randomBytes(32).toString("base64url");
  const sql = databasePool();
  const get = (ip: string, proof = token) => observeApi("inquiries", new Request("http://localhost/api/inquiries", {
    headers: { "x-ecom-client-ip": ip, "x-ecom-ingress-token": proof },
  }), async () => new Response(null, { status: 204 }));

  try {
    env.NODE_ENV = "production";
    env.ECOM_TRUSTED_PROXY_TOKEN = token;
    if (Date.now() % 60_000 > 55_000) await Bun.sleep(60_000 - Date.now() % 60_000 + 50);
    await sql`delete from market_entry.api_quotas where route = 'inquiries'`;
    await sql`delete from market_entry.api_client_quotas where route = 'inquiries'`;
    expect((await get("192.0.2.1", "invalid")).status).toBe(503);
    expect((await get("not-an-ip")).status).toBe(503);
    const first = await Promise.all(Array.from({ length: 10 }, () => get("192.0.2.1")));
    expect(first.every(({ status }) => status === 204)).toBe(true);
    const over = await get("::ffff:192.0.2.1");
    expect(over.status).toBe(429);
    expect(Number(over.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect((await get("192.0.2.2")).status).toBe(204);
    await sql`update market_entry.api_quotas set requests = 99 where route = 'inquiries'`;
    const atCeiling = await Promise.all([get("192.0.2.3"), get("192.0.2.4")]);
    expect(atCeiling.map(({ status }) => status).sort()).toEqual([204, 429]);
    const clients = await sql<{ client_key: string }[]>`select client_key from market_entry.api_client_quotas where route = 'inquiries'`;
    expect(clients.length).toBeGreaterThanOrEqual(3);
    expect(clients.length).toBeLessThanOrEqual(4);
    expect(clients.every(({ client_key }) => /^[a-f0-9]{64}$/.test(client_key))).toBe(true);
  } finally {
    if (originalMode === undefined) delete env.NODE_ENV;
    else env.NODE_ENV = originalMode;
    if (originalSecret === undefined) delete env.ECOM_TRUSTED_PROXY_TOKEN;
    else env.ECOM_TRUSTED_PROXY_TOKEN = originalSecret;
    await sql`delete from market_entry.api_quotas where route = 'inquiries'`;
    await sql`delete from market_entry.api_client_quotas where route = 'inquiries'`;
  }
}, 30_000);
