import { expect, test } from "bun:test";
import { POST as submitInquiry } from "../../src/app/api/inquiries/route";
import { GET as listInquiries } from "../../src/app/api/internal/inquiries/route";
import { GET as getInquiry, PATCH as updateInquiry } from "../../src/app/api/internal/inquiries/[referenceCode]/route";
import { databasePool } from "../../src/db/pool";
import { loadDatabaseCatalog } from "../../src/features/geography/database-repository";

const databaseTest = process.env.RUN_INQUIRY_DB_TESTS === "1" ? test : test.skip;
const origin = "http://localhost";

databaseTest("stores a public inquiry and its provenance, then records steward actions in PostgreSQL", async () => {
  const target = new URL(process.env.DATABASE_URL ?? "");
  expect(target.hostname).toBe("127.0.0.1");
  expect(target.pathname).toMatch(/^\/ecom_inquiry_it_[a-z0-9_]+$/);
  const steward = process.env.RELEASE_STEWARD_TOKEN;
  if (!steward) throw new Error("Configure the local steward token before running this test.");
  const authorization = { Authorization: `Bearer ${steward}` };
  const jsonHeaders = { "Content-Type": "application/json" };
  const listUrl = origin + "/api/internal/inquiries";

  try {
    const catalog = await loadDatabaseCatalog();
    const province = catalog.geographies.find(({ code, level }) => code === "01" && level === "province");
    if (!province) throw new Error("Load the published foundation into the inquiry test database.");

    const submitted = await submitInquiry(new Request(origin + "/api/inquiries", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        email: "inquiry-pilot@example.test",
        message: "Integration test for investment support in Hanoi.",
        country: "Vietnam",
        sector: "Logistics",
        geographyIds: [province.id],
      }),
    }));
    expect(submitted.status).toBe(201);
    const { referenceCode } = await submitted.json();
    expect(referenceCode).toMatch(/^INQ-\d{4}-[A-F0-9]{8}$/);

    expect((await listInquiries(new Request(listUrl))).status).toBe(401);
    const filtered = await listInquiries(new Request(`${listUrl}?reference=${referenceCode}&status=new&country=Vietnam&sector=Logistics`, {
      headers: authorization,
    }));
    expect(filtered.status).toBe(200);
    const listed = (await filtered.json()).data;
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({ reference_code: referenceCode, status: "new" });
    expect(listed[0]).not.toHaveProperty("email");
    const paged = await listInquiries(new Request(`${listUrl}?reference=${referenceCode}&page=1&pageSize=1`, { headers: authorization }));
    expect(paged.status).toBe(200);
    const pagedBody = await paged.json();
    expect(pagedBody.pagination).toMatchObject({ page: 1, pageSize: 1, total: 1, totalPages: 1, hasNext: false });
    expect(pagedBody.metrics.total).toBe(1);
    const csv = await listInquiries(new Request(`${listUrl}?reference=${referenceCode}&format=csv`, { headers: authorization }));
    expect(csv.status).toBe(200);
    expect(await csv.text()).toContain("country_self_reported");

    const detailUrl = `${listUrl}/${referenceCode}`;
    const context = { params: Promise.resolve({ referenceCode }) };
    expect((await getInquiry(new Request(detailUrl), context)).status).toBe(401);
    const details = await getInquiry(new Request(detailUrl, { headers: authorization }), context);
    expect(details.status).toBe(200);
    expect((await details.json()).data.inquiry.provenance).toMatchObject({
      geographyVersionCode: province.geographyVersion,
      geographyIds: [province.id],
      datasets: [expect.objectContaining({ code: "VN_ADMIN_CATALOG" })],
    });

    function update(body: { status: string; closeReason?: string; note?: string }) {
      return updateInquiry(new Request(detailUrl, {
        method: "PATCH", headers: { ...authorization, ...jsonHeaders }, body: JSON.stringify(body),
      }), context);
    }

    expect((await update({ status: "contacted", note: "Steward integration test note." })).status).toBe(200);
    expect((await update({ status: "qualified" })).status).toBe(200);
    expect((await update({ status: "closed" })).status).toBe(409);
    expect((await update({ status: "closed", closeReason: "resolved" })).status).toBe(200);
    expect((await update({ status: "contacted" })).status).toBe(409);

    const final = await getInquiry(new Request(detailUrl, { headers: authorization }), context);
    expect(final.status).toBe(200);
    const { inquiry, audit } = (await final.json()).data;
    expect(inquiry).toMatchObject({ status: "closed", close_reason: "resolved" });
    expect(audit.map((event: { action: string }) => event.action)).toEqual([
      "status_changed", "status_changed", "note_added", "status_changed", "submitted",
    ]);
  } finally {
    await databasePool().end({ timeout: 2 });
  }
}, 30_000);
