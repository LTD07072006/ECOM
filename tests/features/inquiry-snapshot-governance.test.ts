import { expect, test } from "bun:test";
import {
  FORMULA_VERSION,
  buildSnapshotComparison,
  canonicalSnapshotInput,
  snapshotMetricsCsv,
  validateSnapshotMetrics,
} from "../../src/features/inquiries/snapshots";
import { vietnamDateRange } from "../../src/features/inquiries/reporting";

const metrics = {
  total: 3,
  byStatus: { new: 1, contacted: 1, qualified: 0, closed: 1 },
  byCloseReason: { resolved: 1 },
  contactedRate: 2 / 3,
  qualifiedRate: 1 / 3,
  averageHoursToContacted: 2,
  averageHoursToQualified: 4,
  weeklyTrend: { "2026-W02": 3 },
  byGeography: { "geo-1": 2 },
  byCountry: { vietnam: 3 },
  bySector: { logistics: 3 },
};

test("canonicalizes one reporting period, timezone, filters, and formula version", () => {
  const input = canonicalSnapshotInput({
    periodStart: new Date("2026-01-05T00:00:00.000Z"),
    periodEnd: new Date("2026-01-12T00:00:00.000Z"),
    timeZone: "Asia/Ho_Chi_Minh",
    filters: { country: " Vietnam ", page: 4, pageSize: 25 },
  });
  expect(input).toMatchObject({ timeZone: "Asia/Ho_Chi_Minh", formulaVersion: FORMULA_VERSION });
  expect(input.filters).toEqual({ country: "Vietnam" });
  expect(input).not.toHaveProperty("page");
});

test("validates that status counts reconcile to the stored total", () => {
  expect(validateSnapshotMetrics(metrics)).toEqual({ ok: true });
  expect(validateSnapshotMetrics({ ...metrics, total: 99 })).toMatchObject({ ok: false });
});

test("compares two snapshots with the same period contract", () => {
  const comparison = buildSnapshotComparison(
    { snapshotId: "one", periodStart: "2026-01-05", periodEnd: "2026-01-12", timeZone: "UTC", formulaVersion: FORMULA_VERSION, filters: { country: "Vietnam" }, metrics },
    { snapshotId: "two", periodStart: "2026-01-12", periodEnd: "2026-01-19", timeZone: "UTC", formulaVersion: FORMULA_VERSION, filters: { country: "Vietnam" }, metrics: { ...metrics, total: 4, byStatus: { ...metrics.byStatus, new: 2 } } },
  );
  expect(comparison.compatible).toBe(true);
  expect(comparison.delta.total).toBe(1);
});

test("treats different reporting periods as comparable when non-period filters match", () => {
  const left = { snapshotId: "one", periodStart: "2026-01-05", periodEnd: "2026-01-12", timeZone: "UTC", formulaVersion: FORMULA_VERSION, filters: { country: "Vietnam", geographyIds: ["a", "b", "a"], from: "2026-01-05", to: "2026-01-12" }, metrics };
  const right = { snapshotId: "two", periodStart: "2026-01-12", periodEnd: "2026-01-19", timeZone: "UTC", formulaVersion: FORMULA_VERSION, filters: { geographyIds: ["b", "a"], country: "vietnam", from: "2026-01-12", to: "2026-01-19" }, metrics };
  const comparison = buildSnapshotComparison(left, right);
  expect(comparison.compatible).toBe(true);
  expect(comparison.left).toMatchObject({ total: 3, byStatus: { new: 1 } });
  expect(comparison.right).toMatchObject({ total: 3, byStatus: { new: 1 } });
});

test("includes the full end date in Vietnam using an exclusive next-midnight boundary", () => {
  expect(vietnamDateRange("2026-11-09", "2026-11-15")).toEqual({
    from: "2026-11-08T17:00:00.000Z",
    to: "2026-11-15T17:00:00.000Z",
  });
});

test("returns status deltas and compatibility diagnostics", () => {
  const left = { snapshotId: "one", periodStart: "2026-01-05", periodEnd: "2026-01-12", timeZone: "UTC", formulaVersion: FORMULA_VERSION, filters: { country: "Vietnam", from: "period-one" }, metrics };
  const right = { snapshotId: "two", periodStart: "2026-01-12", periodEnd: "2026-01-19", timeZone: "UTC", formulaVersion: "inquiry-funnel-v4", filters: { country: "Thailand", to: "period-two" }, metrics: { ...metrics, byStatus: { ...metrics.byStatus, contacted: 3 }, total: 5 } };
  const comparison = buildSnapshotComparison(left, right);
  expect(comparison.compatible).toBe(false);
  expect(comparison.diagnostics).toEqual({ filters: true, timeZone: false, formulaVersion: true });
  expect(comparison.differences).toEqual([
    { field: "country", left: "vietnam", right: "thailand" },
    { field: "formulaVersion", left: FORMULA_VERSION, right: "inquiry-funnel-v4" },
  ]);
  expect(comparison.delta.byStatus.contacted).toBe(2);
});

test("exports stored aggregate metrics without querying inquiry rows", () => {
  const csv = snapshotMetricsCsv({ snapshotId: "snap-1", periodStart: "2026-01-05", periodEnd: "2026-01-12", timeZone: "UTC", formulaVersion: FORMULA_VERSION, filters: { country: "Vietnam" }, metrics });
  expect(csv).toContain("snapshot_id,period_start,period_end,time_zone,formula_version,metric,value");
  expect(csv).toContain("snap-1");
  expect(csv).toContain("by_status.new,1");
  expect(csv).not.toContain("email");
  expect(csv).not.toContain("message");
});
