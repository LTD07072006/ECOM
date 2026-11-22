import { expect, test } from "bun:test";
import { demoCatalog } from "../../src/db/seed-data";
import { getProfile } from "../../src/features/geography/domain";
import {
	compatibleRegionMetrics,
	regionMetric,
} from "../../src/features/regions/model";

const source = demoCatalog.geographies
	.slice(1, 3)
	.map((geo) => getProfile(demoCatalog, geo.id))
	.filter((p): p is NonNullable<typeof p> => p !== null);
const datasetBase = demoCatalog.dataset ?? {
	code: "demo",
	version: "demo-v1",
	owner: "demo",
	dataAsOf: "2025-12-31",
	reviewedAt: "2025-12-31T00:00:00.000Z",
	reviewDueAt: "2026-12-31T00:00:00.000Z",
	freshness: "current" as const,
	publicationStatus: "published" as const,
	source: source[0].observations[0].source,
};
const profiles = source.map((profile, index) => ({
	...profile,
	observations: [
		{
			...profile.observations[0],
			indicator: "POP_AVG",
			value: (index + 1) * 100,
			quality: "verified" as const,
			dataset: { ...datasetBase, id: "same-release" },
		},
	],
}));

test("adds compatible provinces and compares non-overlapping region metrics", () => {
	const total = regionMetric(profiles, "POP_AVG");
	expect(total.value).toBe(300);
	expect(
		compatibleRegionMetrics(
			regionMetric([profiles[0]], "POP_AVG"),
			regionMetric([profiles[1]], "POP_AVG"),
		),
	).toBe(true);
});

test("does not report partial totals, mixed releases, duplicate or mixed geography", () => {
	expect(regionMetric([], "POP_AVG").value).toBeNull();
	expect(
		regionMetric([profiles[0], { ...profiles[1], observations: [] }], "POP_AVG")
			.value,
	).toBeNull();
	expect(
		regionMetric(
			[
				profiles[0],
				{
					...profiles[1],
					observations: [
						{ ...profiles[1].observations[0], datasetVersion: "different" },
					],
				},
			],
			"POP_AVG",
		).value,
	).toBeNull();
	expect(regionMetric([profiles[0], profiles[0]], "POP_AVG").value).toBeNull();
	expect(
		regionMetric([profiles[0], { ...profiles[1], level: "commune" }], "POP_AVG")
			.value,
	).toBeNull();
	expect(
		compatibleRegionMetrics(
			regionMetric([profiles[0]], "POP_AVG"),
			regionMetric(
				[{ ...profiles[1], geographyVersion: "older-geography" }],
				"POP_AVG",
			),
		),
	).toBe(false);
	expect(
		compatibleRegionMetrics(
			regionMetric([profiles[0]], "POP_AVG"),
			regionMetric(
				[
					{
						...profiles[1],
						observations: [
							{ ...profiles[1].observations[0], periodEnd: "different" },
						],
					},
				],
				"POP_AVG",
			),
		),
	).toBe(false);
});
