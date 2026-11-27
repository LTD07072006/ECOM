import { readFile } from "node:fs/promises";
import { z } from "zod";
import {
	dataset,
	loadRelease,
	readDataset,
	requireCoverage,
} from "./release-data";

const text = z.string().trim().min(1);
const province = z.string().regex(/^\d{2}$/);
const manifestSchema = z.object({
	geographyVersion: text,
	year: z.number().int().min(2025).max(2100),
	series: z
		.array(
			z.object({
				indicator: z.object({
					code: z.string().regex(/^[A-Z][A-Z0-9_]+$/),
					label: text,
					definition: text,
					unit: text,
					valueType: z.enum(["integer", "decimal", "percent"]),
					scope: text,
				}),
				coverage: z.enum(["national_provinces", "selected_provinces"]),
				method: text,
				limitations: text,
				dataset,
			}),
		)
		.min(1),
	airports: dataset,
	ports: dataset,
});

const observations = z.object({
	periodLabel: text,
	values: z
		.array(z.object({ code: province, value: z.number().nullable() }))
		.min(1),
});

const infrastructureKind = z.enum([
	"airport",
	"seaport",
	"industrial_park",
	"icd",
	"expressway_node",
]);

const airportClassification = z.enum(["international", "domestic"]).nullable();
const operationalStatus = z.enum(["operational", "planned", "not_operational"]);
const classificationSourceUrl = z.url({ protocol: /^https$/ }).nullable();

const airports = z
	.array(
		z
			.object({
				id: z.string().regex(/^[A-Z0-9-]+$/),
				name: text,
				code: z
					.string()
					.regex(/^[A-Z]{3}$/)
					.nullable(),
				kind: infrastructureKind.default("airport"),
				longitude: z.number().min(-180).max(180).nullable(),
				latitude: z.number().min(-90).max(90).nullable(),
				airportClassification,
				airportOperationalStatus: operationalStatus,
				classificationSourceUrl,
				url: z.url({ protocol: /^https$/ }),
			})
			.superRefine((airport, context) => {
				if ((airport.longitude === null) !== (airport.latitude === null)) {
					context.addIssue({
						code: "custom",
						message: "Airport coordinates must be both present or both null",
						path: ["longitude"],
					});
				}
			}),
	)
	.min(1);

const ports = z
	.array(
		z.object({
			id: z.string().regex(/^[A-Z0-9-]+$/),
			name: text,
			code: z
				.string()
				.regex(/^[A-Z0-9-]+$/)
				.nullable(),
			kind: z.literal("seaport"),
			longitude: z.number().min(-180).max(180),
			latitude: z.number().min(-90).max(90),
			portType: z
				.enum(["deep_sea", "coastal", "river", "container_terminal"])
				.nullable(),
			coastalProvinceCode: province.optional(),
			operationalStatus,
			classificationSourceUrl,
			url: z.url({ protocol: /^https$/ }),
		}),
	)
	.min(1);

export async function loadWave2(path: string) {
	const manifest = manifestSchema.parse(
		JSON.parse(await readFile(path, "utf8")),
	);
	const geography = await loadRelease("data/sprint1/manifest.json");
	if (manifest.geographyVersion !== geography.manifest.geography.code)
		throw new Error("Incompatible Wave 2 geography version");
	const expected = new Set(geography.provinces.map((place) => place.code));
	const identities = manifest.series.map(
		({ dataset, indicator }) =>
			`${dataset.source.id}/${dataset.datasetCode}/${dataset.version}/${indicator.code}`,
	);
	if (new Set(identities).size !== identities.length)
		throw new Error("Duplicate Wave 2 dataset and indicator");

	const series = await Promise.all(
		manifest.series.map(async (entry) => {
			const data = observations.parse(await readDataset(path, entry.dataset));
			const codes = data.values.map((row) => row.code);
			if (entry.coverage === "national_provinces")
				requireCoverage(entry.indicator.code, codes, expected);
			else if (
				new Set(codes).size !== codes.length ||
				codes.some((code) => !expected.has(code))
			) {
				throw new Error(
					`Unexpected or duplicate province for ${entry.indicator.code}`,
				);
			}
			if (
				!data.periodLabel.startsWith(String(manifest.year)) ||
				entry.dataset.dataAsOf !== `${manifest.year}-12-31`
			) {
				throw new Error(`Invalid reporting period for ${entry.indicator.code}`);
			}
			for (const { value } of data.values) {
				if (value === null) continue;
				const { code, valueType } = entry.indicator;
				const minimum =
					code === "FDI_LICENSED"
						? -Infinity
						: code === "GRDP_GROWTH"
							? -100
							: 0;
				if (
					(valueType === "integer" && !Number.isSafeInteger(value)) ||
					(valueType === "percent" && value > 100) ||
					value < minimum
				)
					throw new Error(`Invalid value for ${code}`);
			}
			return { ...entry, ...data };
		}),
	);
	const points = airports.parse(await readDataset(path, manifest.airports));
	if (new Set(points.map((point) => point.id)).size !== points.length)
		throw new Error("Duplicate airport identifier");
	const portPoints = ports.parse(await readDataset(path, manifest.ports));
	if (new Set(portPoints.map((point) => point.id)).size !== portPoints.length)
		throw new Error("Duplicate port identifier");
	for (const port of portPoints) {
		if (port.coastalProvinceCode && !expected.has(port.coastalProvinceCode))
			throw new Error(`Unknown coastal province for port ${port.id}`);
	}
	return {
		manifest,
		series,
		points,
		ports: portPoints,
		boundaryDataset: geography.manifest.boundaries,
	};
}
