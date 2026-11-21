import { randomBytes } from "node:crypto";
import { expect, test } from "bun:test";
import { GET, POST } from "../../src/app/api/internal/releases/route";
import { loadDatabaseCatalog, loadProvinceMap } from "../../src/features/geography/database-repository";
import { loadMapLayers } from "../../src/features/map/layer-repository";
import type { ReleaseOverview } from "../../src/features/releases/operations";

const workflowTest = process.env.RUN_RELEASE_WORKFLOW_TESTS === "1" ? test : test.skip;
const url = "http://localhost/api/internal/releases";

workflowTest("separates roles, publishes staged data atomically and retires Wave 2 with an audit trail", async () => {
  const database = new URL(process.env.DATABASE_URL ?? "");
  expect(database.hostname).toBe("127.0.0.1");
  expect(database.pathname).toMatch(/^\/ecom_sprint4_workflow_[a-z0-9_]+$/);
  const reviewer = randomBytes(32).toString("base64url");
  const steward = randomBytes(32).toString("base64url");
  process.env.RELEASE_REVIEWER_TOKEN = reviewer;
  process.env.RELEASE_STEWARD_TOKEN = steward;
  const previousOperators = process.env.ECOM_OPERATORS;
  process.env.ECOM_OPERATORS = JSON.stringify([
    { id: "workflow-reviewer", role: "reviewer", token: reviewer },
    { id: "workflow-steward", role: "steward", token: steward },
  ]);
  async function overview(token: string) {
    const response = await GET(new Request(url, { headers: { Authorization: "Bearer " + token } }));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const payload: { role: string; data: ReleaseOverview } = await response.json();
    return payload.data;
  }
  function change(token: string, batchId: string, action: string) {
    return POST(new Request(url, {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify({ batchId, action, note: "Verified Sprint 4 workflow on disposable database." }),
    }));
  }
  try {
    expect((await GET(new Request(url))).status).toBe(401);
    const [foundation] = (await overview(reviewer)).batches;
    expect(foundation).toMatchObject({ kind: "foundation", staged: true, approved: false, blockers: [] });
    expect((await loadDatabaseCatalog()).publicationStatus).toBe("unpublished");
    expect((await loadProvinceMap()).features).toHaveLength(0);
    expect((await change(steward, foundation.id, "publish")).status).toBe(409);
    expect((await change(steward, foundation.id, "approve")).status).toBe(403);
    expect((await change(reviewer, foundation.id, "publish")).status).toBe(403);
    expect((await change(reviewer, foundation.id, "approve")).status).toBe(200);
    expect((await loadDatabaseCatalog()).publicationStatus).toBe("unpublished");

    const publications = await Promise.all([
      change(steward, foundation.id, "publish"),
      change(steward, foundation.id, "publish"),
    ]);
    expect(publications.map((response) => response.status)).toEqual([200, 200]);
    expect((await loadDatabaseCatalog()).geographies).toHaveLength(3356);
    expect((await loadProvinceMap()).features).toHaveLength(34);
    expect((await change(steward, foundation.id, "retire")).status).toBe(409);
    expect((await overview(reviewer)).batches[0].audit.map((event) => event.action)).toEqual(["import", "approve", "publish"]);
    expect((await overview(reviewer)).batches[0].audit.filter((event) => event.action === "approve" || event.action === "publish").map((event) => event.actor))
      .toEqual(["workflow-reviewer", "workflow-steward"]);

    const stage = Bun.spawnSync([process.execPath, "run", "db:import:wave2", "--stage"]);
    expect(stage.exitCode).toBe(0);
    const wave = (await overview(reviewer)).batches.find((batch) => batch.kind === "wave2")!;
    expect(wave).toMatchObject({ staged: true, blockers: [] });
    expect((await loadMapLayers()).infrastructure).toBeNull();
    expect((await change(reviewer, wave.id, "approve")).status).toBe(200);
    expect((await change(steward, wave.id, "publish")).status).toBe(200);
    expect((await loadMapLayers()).infrastructure?.points.features).toHaveLength(22);
    expect((await change(steward, wave.id, "retire")).status).toBe(200);
    expect((await loadMapLayers()).infrastructure).toBeNull();
    expect((await overview(reviewer)).batches.find((batch) => batch.id === wave.id)?.audit.map((event) => event.action))
      .toEqual(["import", "approve", "publish", "retire"]);
  } finally {
    delete process.env.RELEASE_REVIEWER_TOKEN;
    delete process.env.RELEASE_STEWARD_TOKEN;
    if (previousOperators === undefined) delete process.env.ECOM_OPERATORS;
    else process.env.ECOM_OPERATORS = previousOperators;
  }
}, 60_000);
