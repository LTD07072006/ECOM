import { expect, test } from "bun:test";
import { csvDownload } from "../../src/lib/http";

test("csvDownload sanitizes unsafe filename characters including quotes, CR, and LF", async () => {
	const response = csvDownload(
		"col\nval",
		'report"injected\r\nSet-Cookie: x=1/../../evil.csv',
	);
	expect(response.headers.get("Content-Type")).toBe("text/csv; charset=utf-8");
	const disposition = response.headers.get("Content-Disposition");
	expect(disposition).toBe(
		'attachment; filename="report_injected__Set-Cookie__x_1_.._.._evil.csv"',
	);
	expect(disposition).not.toMatch(/[\r\n]/);
	expect(await response.text()).toBe("\uFEFFcol\nval");
});

test("csvDownload preserves clean filenames", () => {
	const response = csvDownload("a,b\n1,2", "vietnam-market-context-2026.csv");
	expect(response.headers.get("Content-Disposition")).toBe(
		'attachment; filename="vietnam-market-context-2026.csv"',
	);
});
