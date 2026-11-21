import { expect, test } from "bun:test";
import { buildInquiryMetrics, inquiryRowsCsv } from "../../src/features/inquiries/reporting";
import { spreadsheetCsvCell } from "../../src/lib/csv";

const rows = [
  { reference_code: "INQ-2026-AAAAAAAA", status: "new" as const, close_reason: null, country: null, sector: "Logistics", geography_ids: ["geo-1"], created_at: new Date("2026-01-01T00:00:00Z"), updated_at: new Date("2026-01-01T00:00:00Z"), anonymized_at: null },
  { reference_code: "INQ-2026-BBBBBBBB", status: "contacted" as const, close_reason: null, country: "VN", sector: "Retail", geography_ids: ["geo-2"], created_at: new Date("2026-01-01T00:00:00Z"), updated_at: new Date("2026-01-01T06:00:00Z"), anonymized_at: null },
  { reference_code: "INQ-2026-CCCCCCCC", status: "closed" as const, close_reason: "resolved", country: "VN", sector: "Retail", geography_ids: ["geo-2"], created_at: new Date("2026-01-01T00:00:00Z"), updated_at: new Date("2026-01-02T00:00:00Z"), anonymized_at: null },
];

test("builds funnel metrics without private fields", () => {
  const metrics = buildInquiryMetrics(rows);
  expect(metrics.total).toBe(3);
  expect(metrics.byStatus).toEqual({ new: 1, contacted: 1, qualified: 0, closed: 1 });
  expect(metrics.byCloseReason).toEqual({ resolved: 1 });
  expect(metrics.contactedRate).toBe(0);
  expect(metrics.qualifiedRate).toBe(0);
});

test("exports safe rows CSV without email, message, or notes", () => {
  const csv = inquiryRowsCsv(rows);
  expect(csv).toContain("country_self_reported");
  expect(csv).toContain("INQ-2026-AAAAAAAA");
  expect(csv).not.toContain("email");
  expect(csv).not.toContain("message");
  expect(csv).not.toContain("note");
});

test("CSV keeps user-provided spreadsheet prefixes as text and preserves ordinary values", () => {
  expect(inquiryRowsCsv([{ ...rows[0], country: " ＝1", sector: 'Example "A",\r\nB' }]))
    .toContain(`,"' ＝1","Example ""A"",\r\nB",geo-1`);
  expect(["=1", "+1", "-1", "@example", "\ttext", "\rtext"].map((value) => spreadsheetCsvCell(value)))
    .toEqual(['"\'=1"', '"\'+1"', '"\'-1"', '"\'@example"', '"\'\ttext"', '"\'\rtext"']);
  expect(spreadsheetCsvCell(-12)).toBe("-12");
  expect(spreadsheetCsvCell("Việt Nam")).toBe("Việt Nam");
});
