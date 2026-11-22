export type CohortSortCandidate = {
	periodEnd: string;
	coverage: number;
	publishedAt: string | null;
	datasetId: string;
	periodStart: string;
	scope: string;
	unit: string;
};

/**
 * Canonical cohort selection order shared across map layers, profile catalog,
 * and search filters:
 * 1. periodEnd DESC
 * 2. coverage DESC
 * 3. publishedAt DESC
 * 4. datasetId ASC
 * 5. periodStart DESC
 * 6. scope ASC
 * 7. unit ASC
 */
export function compareCohortPriority(
	left: CohortSortCandidate,
	right: CohortSortCandidate,
): number {
	return (
		right.periodEnd.localeCompare(left.periodEnd) ||
		right.coverage - left.coverage ||
		(right.publishedAt ?? "").localeCompare(left.publishedAt ?? "") ||
		left.datasetId.localeCompare(right.datasetId) ||
		right.periodStart.localeCompare(left.periodStart) ||
		left.scope.localeCompare(right.scope) ||
		left.unit.localeCompare(right.unit)
	);
}
