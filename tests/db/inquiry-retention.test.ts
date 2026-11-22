import { expect, test } from "bun:test";
import { retentionCutoff } from "../../src/features/inquiries/validation";

test("retention cleanup cutoff is one year before the run date", () => {
	expect(
		retentionCutoff(new Date("2026-11-21T00:00:00.000Z")).toISOString(),
	).toBe("2025-11-21T00:00:00.000Z");
});

test("retention cleanup command defaults to non-destructive mode", async () => {
	const source = await Bun.file("src/db/cleanup-inquiries.ts").text();
	expect(source).toContain('process.argv.includes("--apply")');
	expect(source).toContain("cleanupExpiredInquiries(apply)");
});
