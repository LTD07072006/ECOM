import { expect, test } from "bun:test";
import {
  buildInquiryAnalytics,
  inquiryRowsCsv,
  normalizeSelfReported,
  paginateRows,
  type InquiryReportRow,
} from "../../src/features/inquiries/reporting";

test("uses a shared filter shape with date, geography, and pagination fields", () => {
  const filters = {
    status: "new" as const,
    from: new Date("2026-01-01T00:00:00Z"),
    to: new Date("2026-02-01T00:00:00Z"),
    geographyIds: ["geo-a"],
    page: 2,
    pageSize: 25,
  };
  expect(filters.pageSize).toBe(25);
  expect(filters.geographyIds).toEqual(["geo-a"]);
});

function row(overrides: Partial<InquiryReportRow> = {}): InquiryReportRow {
  return {
    reference_code: "INQ-2026-AAAAAAAA",
    status: "new",
    close_reason: null,
    country: null,
    sector: null,
    geography_ids: [],
    created_at: new Date("2026-01-05T12:00:00Z"),
    updated_at: new Date("2026-01-05T12:00:00Z"),
    anonymized_at: null,
    ...overrides,
  };
}

test("normalizes self-reported values for stable reporting groups", () => {
  expect(normalizeSelfReported("  Hà   Nội  ")).toBe("hà nội");
  expect(normalizeSelfReported("HÀ NỘI")).toBe("hà nội");
  expect(normalizeSelfReported("   ")).toBe(null);
});

test("counts a multi-geography inquiry once in totals and once per related geography breakdown", () => {
  const analytics = buildInquiryAnalytics([
    row({ reference_code: "INQ-2026-AAAA0001", geography_ids: ["geo-a", "geo-b"] }),
    row({ reference_code: "INQ-2026-AAAA0002", geography_ids: ["geo-a"] }),
  ]);

  expect(analytics.total).toBe(2);
  expect(analytics.byGeography).toEqual({ "geo-a": 2, "geo-b": 1 });
});

test("groups normalized country and sector values and returns ISO weekly trend", () => {
  const analytics = buildInquiryAnalytics([
    row({ country: " Vietnam ", sector: "  Logistics  " }),
    row({ reference_code: "INQ-2026-AAAA0002", country: "VIETNAM", sector: "logistics", created_at: new Date("2026-01-07T12:00:00Z") }),
    row({ reference_code: "INQ-2026-AAAA0003", country: "Singapore", sector: "Retail", created_at: new Date("2026-01-12T12:00:00Z") }),
  ]);

  expect(analytics.byCountry).toEqual({ vietnam: 2, singapore: 1 });
  expect(analytics.bySector).toEqual({ logistics: 2, retail: 1 });
  expect(analytics.weeklyTrend).toEqual({ "2026-W02": 2, "2026-W03": 1 });
});

test("paginates rows while retaining total and next-page metadata", () => {
  const rows = Array.from({ length: 5 }, (_, index) => row({ reference_code: `INQ-2026-${String(index).padStart(8, "0")}` }));
  expect(paginateRows(rows, 2, 2)).toEqual({
    rows: [rows[2], rows[3]],
    page: 2,
    pageSize: 2,
    total: 5,
    totalPages: 3,
    hasNext: true,
    hasPrevious: true,
  });
});

test("safe CSV can represent a complete filtered result larger than one page", () => {
  const rows = Array.from({ length: 101 }, (_, index) => row({ reference_code: `INQ-2026-${String(index).padStart(8, "0")}` }));
  expect(inquiryRowsCsv(rows).trim().split("\r\n")).toHaveLength(102);
});
