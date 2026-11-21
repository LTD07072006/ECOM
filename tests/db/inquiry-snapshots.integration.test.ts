import { expect, test } from "bun:test";
import { cleanupExpiredInquiryReportSnapshots, createInquiryReportSnapshot, listInquiryReportSnapshots } from "../../src/features/inquiries/snapshots";
import { databasePool } from "../../src/db/pool";

const databaseTest = process.env.RUN_INQUIRY_DB_TESTS === "1" ? test : test.skip;

databaseTest("stores a non-sensitive weekly inquiry report snapshot", async () => {
  const now = new Date("2026-11-21T00:00:00Z");
  const snapshot = await createInquiryReportSnapshot({
    periodStart: new Date("2026-11-14T00:00:00Z"),
    periodEnd: now,
    filters: { country: "vietnam", page: 1, pageSize: 25 },
    metrics: { total: 2, byStatus: { new: 2, contacted: 0, qualified: 0, closed: 0 }, byCloseReason: {}, contactedRate: 0, qualifiedRate: 0, averageHoursToContacted: null, averageHoursToQualified: null, weeklyTrend: { "2026-W46": 2 }, byGeography: {}, byCountry: { vietnam: 2 }, bySector: {} },
    createdBy: "steward",
  });
  expect(snapshot.filters).toEqual({ country: "vietnam", page: 1, pageSize: 25 });
  expect(snapshot.metrics.total).toBe(2);
  expect(snapshot).not.toHaveProperty("email");
  expect((await listInquiryReportSnapshots()).some((item) => item.snapshot_id === snapshot.snapshot_id)).toBe(true);
  expect((await cleanupExpiredInquiryReportSnapshots(false, new Date("2026-11-21T00:00:00Z"))).applied).toBe(false);
  await databasePool().end({ timeout: 2 });
}, 30_000);
