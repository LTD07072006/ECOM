import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

test("Phase 9 runbook and checklist contain operational release gates", () => {
	const files = [
		"docs/phase-9-production-observability-runbook.md",
		"docs/phase-9-release-checklist.md",
	];
	const text = files
		.map((file) => readFileSync(file, "utf8"))
		.join("\n")
		.toLowerCase();
	for (const term of [
		"redaction",
		"retention",
		"rollback",
		"fallback",
		"quota",
		"p50",
		"p95",
		"csp",
		"attribution",
	]) {
		expect(text).toContain(term);
	}
});
