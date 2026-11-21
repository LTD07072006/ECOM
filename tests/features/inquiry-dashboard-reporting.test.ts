import { expect, test } from "bun:test";

test("dashboard uses authenticated fetch for stored snapshot export", async () => {
  const source = await Bun.file("src/features/inquiries/InquiryDashboard.tsx").text();
  expect(source).toContain('fetch("/api/internal/inquiries/snapshots/export", {');
  expect(source).toContain("JSON.stringify({ id: snapshotId })");
  expect(source).toContain("authorization: `Bearer ${token}`");
  expect(source).not.toContain("window.open(`/api/internal/inquiries/snapshots/export");
});

test("dashboard report history labels originals and corrections and exposes audit", async () => {
  const source = await Bun.file("src/features/inquiries/InquiryDashboard.tsx").text();
  expect(source).toContain("Bản gốc");
  expect(source).toContain("Đính chính");
  expect(source).toContain("Nhật ký");
});
