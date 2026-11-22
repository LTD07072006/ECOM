import { expect, test } from "bun:test";
import { summarizeGeometryCoverage } from "../../../src/features/geography/domain";
import { demoCatalog } from "../../../src/db/seed-data";

test("demo geography coverage reports point-only context and no public boundaries", () => {
	const coverage = summarizeGeometryCoverage(demoCatalog.geographies);

	expect(
		demoCatalog.geographies.every((geo) => geo.geometryStatus === "point_only"),
	).toBe(true);
	expect(coverage.total).toBe(8);
	expect(coverage.pointOnly).toBe(8);
	expect(coverage.boundaryReady).toBe(0);
	expect(coverage.publicBoundaryAvailable).toBe(false);
});
