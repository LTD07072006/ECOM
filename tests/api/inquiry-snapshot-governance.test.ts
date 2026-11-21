import { expect, test } from "bun:test";
import { GET as getSnapshot, PATCH as patchSnapshot } from "../../src/app/api/internal/inquiries/snapshots/[snapshotId]/route";
import { GET as compareSnapshots } from "../../src/app/api/internal/inquiries/snapshots/compare/route";
import { GET as exportSnapshot } from "../../src/app/api/internal/inquiries/snapshots/export/route";

const context = { params: Promise.resolve({ snapshotId: "00000000-0000-4000-8000-000000000001" }) };

test("snapshot detail, compare, and export endpoints require steward authorization", async () => {
  const detail = await getSnapshot(new Request("http://localhost/api/internal/inquiries/snapshots/00000000-0000-4000-8000-000000000001"), context);
  const compare = await compareSnapshots(new Request("http://localhost/api/internal/inquiries/snapshots/compare?left=one&right=two"));
  const exported = await exportSnapshot(new Request("http://localhost/api/internal/inquiries/snapshots/export?id=one"));
  expect(detail.status).toBe(401);
  expect(compare.status).toBe(401);
  expect(exported.status).toBe(401);
  expect((await patchSnapshot(new Request("http://localhost/api/internal/inquiries/snapshots/00000000-0000-4000-8000-000000000001", { method: "PATCH" }), context)).status).toBe(405);
});
