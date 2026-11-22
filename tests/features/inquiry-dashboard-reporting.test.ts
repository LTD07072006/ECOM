import { expect, test } from "bun:test";
import { vi } from "../../src/lib/i18n/vi";

test("dashboard uses authenticated fetch for stored snapshot export", async () => {
	const source = await Bun.file(
		"src/features/inquiries/InquiryDashboard.tsx",
	).text();
	expect(source).toContain(
		'fetch("/api/internal/inquiries/snapshots/export", {',
	);
	expect(source).toContain("JSON.stringify({ id: snapshotId })");
	expect(source).toMatch(/Bearer \$\{token\}/);
	expect(source).not.toContain(
		"window.open(`/api/internal/inquiries/snapshots/export",
	);
});

test("dashboard report history labels originals and corrections and exposes audit", async () => {
	const source = await Bun.file(
		"src/features/inquiries/dashboard/SnapshotHistory.tsx",
	).text();
	expect(source).toContain('t("reports.original")');
	expect(source).toContain('t("reports.correction")');
	expect(source).toContain('t("reports.auditLog")');
	expect(vi["reports.original"]).toBe("Bản gốc");
	expect(vi["reports.correction"]).toBe("Đính chính");
	expect(vi["reports.auditLog"]).toBe("Nhật ký");
});
