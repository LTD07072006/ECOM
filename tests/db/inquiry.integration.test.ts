import { expect, test } from "bun:test";
import { POST as submitInquiry } from "../../src/app/api/inquiries/route";
import { GET as listInquiries } from "../../src/app/api/internal/inquiries/route";
import { GET as getInquiry, PATCH as updateInquiry } from "../../src/app/api/internal/inquiries/[referenceCode]/route";
import { databasePool } from "../../src/db/pool";
import { loadDatabaseCatalog } from "../../src/features/geography/database-repository";
import { INQUIRY_NOTICE_VERSION } from "../../src/features/inquiries/privacy";
import { cleanupExpiredInquiries, createInquiry, getInquiry as findInquiry, inquiryAnalytics, makeInquiryReference, updateInquiry as updateRecord } from "../../src/features/inquiries/repository";

const databaseTest = process.env.RUN_INQUIRY_DB_TESTS === "1" ? test : test.skip;
const origin = "http://localhost";

function inquiryTestDatabase() {
  const target = new URL(process.env.DATABASE_URL ?? "");
  if (target.hostname !== "127.0.0.1" || !/^\/ecom_inquiry_it_[a-z0-9_]+$/.test(target.pathname)) {
    throw new Error("Use a disposable local inquiry database.");
  }
  return databasePool();
}

databaseTest("stores a public inquiry and its provenance, then records steward actions in PostgreSQL", async () => {
  inquiryTestDatabase();
  const steward = process.env.RELEASE_STEWARD_TOKEN;
  if (!steward) throw new Error("Configure the local steward token before running this test.");
  const authorization = { Authorization: `Bearer ${steward}` };
  const jsonHeaders = { "Content-Type": "application/json" };
  const listUrl = origin + "/api/internal/inquiries";

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
      consent: true,
      noticeVersion: INQUIRY_NOTICE_VERSION,
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
  expect(audit.at(-1)).toMatchObject({ notice_version: INQUIRY_NOTICE_VERSION });
}, 30_000);

databaseTest("retries a reference collision once and records a single submission", async () => {
  const sql = inquiryTestDatabase();
  const input = {
    email: "collision@example.test", message: "Reference allocation regression.",
    geographyIds: [], noticeVersion: INQUIRY_NOTICE_VERSION,
  };
  const original = await createInquiry(input);
  const replacement = makeInquiryReference();
  let attempts = 0;
  const saved = await createInquiry(input, new Date(), () => ++attempts === 1 ? original.referenceCode : replacement);
  expect(attempts).toBe(2);
  expect(saved.referenceCode).toBe(replacement);
  expect((await findInquiry(replacement))?.audit.map(({ action }) => action)).toEqual(["submitted"]);
  await expect(createInquiry(input, new Date(), () => original.referenceCode)).rejects.toThrow("Unable to allocate an inquiry reference.");
  const [row] = await sql<[{ count: number }]>`
    select count(*)::int as count from market_entry.inquiry_audit where inquiry_id =
      (select inquiry_id from market_entry.investor_inquiries where reference_code = ${original.referenceCode})
  `;
  expect(row.count).toBe(1);
});

databaseTest("retention removes inquiry and audit text together and is safe to repeat", async () => {
  const sql = inquiryTestDatabase();
  const { referenceCode } = await createInquiry({
    email: "retention@example.test", message: "Synthetic details for retention.",
    country: "Vietnam", sector: "Education", geographyIds: [], noticeVersion: INQUIRY_NOTICE_VERSION,
  }, new Date("2020-03-04T00:00:00Z"));
  await updateRecord(referenceCode, { note: "Synthetic note containing retention@example.test." });
  const updated = (await findInquiry(referenceCode))!.inquiry;
  expect(updated.retention_at.getUTCFullYear()).toBe(updated.updated_at.getUTCFullYear() + 1);
  await sql`update market_entry.investor_inquiries set retention_at = '2020-12-01' where reference_code = ${referenceCode}`;
  const runAt = new Date("2021-01-01T00:00:00Z");
  expect(await cleanupExpiredInquiries(false, runAt)).toEqual({ count: 1, applied: false });
  expect((await findInquiry(referenceCode))?.inquiry.email).toBe("retention@example.test");
  expect(await cleanupExpiredInquiries(true, runAt)).toEqual({ count: 1, applied: true });
  const redacted = await findInquiry(referenceCode);
  expect(redacted?.inquiry).toMatchObject({ email: null, message: null, country: null, sector: null });
  expect(redacted?.audit.find(({ action }) => action === "note_added")).toMatchObject({ note: null });
  expect(redacted?.audit.filter(({ action }) => action === "anonymized")).toHaveLength(1);
  await expect(updateRecord(referenceCode, { note: "No notes after anonymization." })).rejects.toThrow("anonymized");
  expect(await cleanupExpiredInquiries(true, runAt)).toEqual({ count: 0, applied: true });
});

databaseTest("analytics use transition events and Vietnam week boundaries", async () => {
  const sql = inquiryTestDatabase();
  const { referenceCode } = await createInquiry({
    email: "analytics@example.test", message: "Analytics transition regression.",
    geographyIds: [], noticeVersion: INQUIRY_NOTICE_VERSION,
  }, new Date("2026-11-15T17:30:00Z"));
  await updateRecord(referenceCode, { status: "closed", closeReason: "spam" });
  const metrics = await inquiryAnalytics({ referenceCode });
  expect(metrics.total).toBe(1);
  expect(metrics.contactedRate).toBe(0);
  expect(metrics.qualifiedRate).toBe(0);
  expect(metrics.averageHoursToContacted).toBeNull();
  expect(metrics.weeklyTrend).toEqual({ "2026-W47": 1 });
  const [id] = await sql<{ inquiry_id: string }[]>`select inquiry_id from market_entry.investor_inquiries where reference_code = ${referenceCode}`;
  await sql`insert into market_entry.inquiry_audit (inquiry_id, actor, action, from_status, to_status, happened_at)
    values (${id.inquiry_id}, 'steward', 'status_changed', 'new', 'contacted', '2026-11-15 19:30:00+00')`;
  const contacted = await inquiryAnalytics({ referenceCode });
  expect(contacted.contactedRate).toBe(1);
  expect(contacted.averageHoursToContacted).toBe(2);
});

databaseTest("retention job records failures and proves expired data was removed", async () => {
  const sql = inquiryTestDatabase();
  const { referenceCode } = await createInquiry({
    email: "scheduled-retention@example.test", message: "Synthetic scheduled retention inquiry.",
    geographyIds: [], noticeVersion: INQUIRY_NOTICE_VERSION,
  });
  await updateRecord(referenceCode, { note: "Synthetic personal note." });
  await sql`update market_entry.investor_inquiries set retention_at = '2020-01-01' where reference_code = ${referenceCode}`;
  await sql`insert into market_entry.inquiry_retention_runs (status, started_at, finished_at) values ('failed', now(), now())`;
  const command = (argument: string) => Bun.spawnSync([process.execPath, "run", "src/db/cleanup-inquiries.ts", argument], {
    env: process.env, stdout: "pipe", stderr: "pipe",
  });
  expect(command("--monitor").exitCode).toBe(1);
  expect(command("--apply").exitCode).toBe(0);
  expect(command("--monitor").exitCode).toBe(0);
  const [run] = await sql<{ status: string; inquiries_processed: number }[]>`
    select status, inquiries_processed from market_entry.inquiry_retention_runs order by started_at desc limit 1
  `;
  expect(run.status).toBe("succeeded");
  expect(run.inquiries_processed).toBeGreaterThanOrEqual(1);
  const inquiry = await findInquiry(referenceCode);
  expect(inquiry?.inquiry.email).toBeNull();
  expect(inquiry?.audit.find(({ action }) => action === "note_added")?.note).toBeNull();
});

databaseTest("steward updates identify the authenticated operator in audit history", async () => {
  inquiryTestDatabase();
  const original = process.env.ECOM_OPERATORS;
  const token = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
  process.env.ECOM_OPERATORS = JSON.stringify([{ id: "qa-operator", role: "steward", token }]);
  try {
    const created = await createInquiry({
      email: "operator@example.test", message: "Synthetic operator identity check.",
      geographyIds: [], noticeVersion: INQUIRY_NOTICE_VERSION,
    });
    const url = `${origin}/api/internal/inquiries/${created.referenceCode}`;
    const response = await updateInquiry(new Request(url, {
      method: "PATCH", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ status: "contacted", note: "Operator audit test." }),
    }), { params: Promise.resolve({ referenceCode: created.referenceCode }) });
    expect(response.status).toBe(200);
    const record = await findInquiry(created.referenceCode);
    expect(record?.audit.filter((event) => event.action === "status_changed" || event.action === "note_added").map((event) => event.actor))
      .toEqual(["qa-operator", "qa-operator"]);
  } finally {
    if (original === undefined) delete process.env.ECOM_OPERATORS;
    else process.env.ECOM_OPERATORS = original;
  }
});
