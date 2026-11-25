import { expect, test } from "bun:test";
import {
	compareCohortPriority,
	type CohortSortCandidate,
} from "../../src/features/geography/cohort-policy";

const candidate = (
	periodEnd: string,
	coverage: number,
	datasetId: string,
): CohortSortCandidate => ({
	periodEnd,
	coverage,
	publishedAt: "2026-01-01T00:00:00.000Z",
	datasetId,
	periodStart: `${periodEnd.slice(0, 4)}-01-01`,
	scope: "provincial",
	unit: "index",
});

test("prefers a complete cohort over a newer partial cohort", () => {
	const partial = candidate("2026-12-31", 1, "partial-2026");
	const complete = candidate("2025-12-31", 2, "complete-2025");

	expect([partial, complete].sort(compareCohortPriority)[0].datasetId).toBe(
		"complete-2025",
	);
});

test("prefers the newer period when cohort coverage is tied", () => {
	const current = candidate("2026-12-31", 2, "current-2026");
	const previous = candidate("2025-12-31", 2, "previous-2025");

	expect([previous, current].sort(compareCohortPriority)[0].datasetId).toBe(
		"current-2026",
	);
});
