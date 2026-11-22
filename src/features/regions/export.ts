import type { Profile } from "../geography/types";
import { spreadsheetCsvCell } from "../../lib/csv";
import {
	compatibleRegionMetrics,
	regionIndicators,
	regionMetric,
} from "./model";

export type RegionExportPlace = {
	id: string;
	code: string;
	name: string;
	geographyVersion: string;
};

export type RegionExportMetricRow = {
	indicator: string;
	label: string;
	unit: string | null;
	period: string | null;
	datasetVersion: string | null;
	sourcePublisher: string | null;
	sourceUrl: string | null;
	sourceLicense: string | null;
	regionAValue: number | null;
	regionAStatus: "available" | "empty" | "missing" | "incompatible";
	regionBValue: number | null;
	regionBStatus: "available" | "empty" | "missing" | "incompatible";
	compatible: boolean;
	deltaBMinusA: number | null;
	deltaPercent: number | null;
};

export type RegionExportPayload = {
	exportedAt: string;
	method: string;
	warning: string;
	regionA: RegionExportPlace[];
	regionB: RegionExportPlace[];
	metrics: RegionExportMetricRow[];
};

export function buildRegionExport(
	regions: readonly [readonly string[], readonly string[]],
	profilesById: Record<string, Profile>,
	exportedAt = new Date().toISOString(),
): RegionExportPayload {
	const groupA = regions[0]
		.map((id) => profilesById[id])
		.filter((item): item is Profile => Boolean(item));
	const groupB = regions[1]
		.map((id) => profilesById[id])
		.filter((item): item is Profile => Boolean(item));

	const toPlace = (profile: Profile): RegionExportPlace => ({
		id: profile.id,
		code: profile.code,
		name: profile.displayName,
		geographyVersion: profile.geographyVersion,
	});

	const metrics: RegionExportMetricRow[] = regionIndicators.map((indicator) => {
		const metricA = regionMetric(groupA, indicator);
		const metricB = regionMetric(groupB, indicator);
		const sample =
			metricA.value !== null
				? metricA
				: metricB.value !== null
					? metricB
					: null;
		const compatible = compatibleRegionMetrics(metricA, metricB);
		const deltaBMinusA =
			compatible && metricA.value !== null && metricB.value !== null
				? metricB.value - metricA.value
				: null;
		const deltaPercent =
			deltaBMinusA !== null && metricA.value !== null && metricA.value !== 0
				? Number(((deltaBMinusA / Math.abs(metricA.value)) * 100).toFixed(2))
				: null;

		return {
			indicator,
			label: sample ? sample.observation.label : indicator,
			unit: sample ? sample.observation.unit : null,
			period: sample ? sample.observation.period : null,
			datasetVersion: sample ? sample.observation.datasetVersion : null,
			sourcePublisher: sample ? sample.observation.source.publisher : null,
			sourceUrl: sample ? sample.observation.source.url : null,
			sourceLicense: sample ? sample.observation.source.license : null,
			regionAValue: metricA.value,
			regionAStatus: metricA.value !== null ? "available" : metricA.reason,
			regionBValue: metricB.value,
			regionBStatus: metricB.value !== null ? "available" : metricB.reason,
			compatible,
			deltaBMinusA,
			deltaPercent,
		};
	});

	return {
		exportedAt,
		method:
			"Sum of published provincial values for compatible indicators (same geography release, source, dataset snapshot, period, unit, scope, and definition).",
		warning:
			"Context only; verify regulatory, commercial, and local requirements with competent authorities.",
		regionA: groupA.map(toPlace),
		regionB: groupB.map(toPlace),
		metrics,
	};
}

export function regionExportToCsv(payload: RegionExportPayload): string {
	const header = [
		"indicator",
		"label",
		"unit",
		"period",
		"dataset_version",
		"source_publisher",
		"source_license",
		"region_a_places",
		"region_a_value",
		"region_a_status",
		"region_b_places",
		"region_b_value",
		"region_b_status",
		"compatible",
		"delta_b_minus_a",
		"delta_percent",
	];
	const placesA = payload.regionA.map((p) => p.name).join("; ");
	const placesB = payload.regionB.map((p) => p.name).join("; ");

	const lines = [
		header.join(","),
		...payload.metrics.map((row) =>
			[
				spreadsheetCsvCell(row.indicator),
				spreadsheetCsvCell(row.label),
				spreadsheetCsvCell(row.unit),
				spreadsheetCsvCell(row.period),
				spreadsheetCsvCell(row.datasetVersion),
				spreadsheetCsvCell(row.sourcePublisher),
				spreadsheetCsvCell(row.sourceLicense),
				spreadsheetCsvCell(placesA),
				spreadsheetCsvCell(row.regionAValue),
				spreadsheetCsvCell(row.regionAStatus),
				spreadsheetCsvCell(placesB),
				spreadsheetCsvCell(row.regionBValue),
				spreadsheetCsvCell(row.regionBStatus),
				spreadsheetCsvCell(row.compatible ? "true" : "false"),
				spreadsheetCsvCell(row.deltaBMinusA),
				spreadsheetCsvCell(row.deltaPercent),
			].join(","),
		),
	];

	// Include UTF-8 BOM so Excel opens Vietnamese province/indicator labels cleanly.
	return `\uFEFF${lines.join("\r\n")}\r\n`;
}
