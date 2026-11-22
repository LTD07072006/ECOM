import { spreadsheetCsvCell } from "../../lib/csv";
import type { Profile } from "../geography/types";
import type {
	CriterionDefinition,
	Evidence,
	SectorId,
	ScoringReason,
} from "./model";

export type DecisionScenarioExport = {
	exportedAt: string;
	sector: SectorId;
	sectorLabel: string;
	assumptions: {
		targetSegment: string | null;
		hypotheses: string | null;
		weights: Array<{ code: string; label: string; weightPercent: number }>;
	};
	observedFacts: {
		provinces: Array<{
			id: string;
			code: string;
			name: string;
			geographyVersion: string;
			indicators: Array<{
				code: string;
				label: string;
				value: number | null;
				unit: string;
				period: string | null;
				quality: string;
				scoreEligible: boolean;
				sourceTitle: string | null;
				sourcePublisher: string | null;
				sourceLicense: string | null;
				datasetVersion: string | null;
			}>;
		}>;
	};
	customerEvidence: {
		status: Evidence["status"];
		segment: string | null;
		sampleSize: number | null;
		method: string | null;
		period: string | null;
		questionId: string | null;
		source: string | null;
		sourceUrl: string | null;
		isDemo: boolean;
	};
	assessment: {
		officialStatus: "computed" | "refused";
		officialRefusalCodes: string[];
		officialScores: Array<{ id: string; name: string; score: number }>;
		exploratoryWhatIfScores: Array<{
			id: string;
			name: string;
			score: number;
		}>;
		exploratoryDisclaimer: string;
	};
};

export function buildDecisionScenarioExport(input: {
	sector: SectorId;
	sectorLabel: string;
	criteria: readonly CriterionDefinition[];
	weights: readonly number[];
	profiles: readonly Profile[];
	targetSegment?: string;
	hypotheses?: string;
	evidence: Evidence;
	officialResult:
		| { ok: true; results: Array<{ id: string; name: string; score: number }> }
		| { ok: false; reasons: ScoringReason[] };
	whatIfResult?:
		| { ok: true; results: Array<{ id: string; name: string; score: number }> }
		| { ok: false; reasons: ScoringReason[] }
		| null;
	exportedAt?: Date;
}): DecisionScenarioExport {
	return {
		exportedAt: (input.exportedAt ?? new Date()).toISOString(),
		sector: input.sector,
		sectorLabel: input.sectorLabel,
		assumptions: {
			targetSegment: input.targetSegment?.trim() || null,
			hypotheses: input.hypotheses?.trim() || null,
			weights: input.criteria.map((criterion, index) => ({
				code: criterion.code,
				label: criterion.label,
				weightPercent: Number.isFinite(input.weights[index])
					? input.weights[index]
					: 0,
			})),
		},
		observedFacts: {
			provinces: input.profiles.map((profile) => ({
				id: profile.id,
				code: profile.code,
				name: profile.displayName,
				geographyVersion: profile.geographyVersion,
				indicators: input.criteria.map((criterion) => {
					const obs = profile.observations.find(
						(item) => item.indicator === criterion.code,
					);
					return {
						code: criterion.code,
						label: criterion.label,
						value: obs?.value ?? null,
						unit: obs?.unit ?? criterion.unit,
						period: obs?.period ?? null,
						quality: obs?.quality ?? "unavailable",
						scoreEligible: obs?.scoreEligible ?? false,
						sourceTitle: obs?.source.title ?? null,
						sourcePublisher: obs?.source.publisher ?? null,
						sourceLicense: obs?.source.license ?? null,
						datasetVersion: obs?.datasetVersion ?? null,
					};
				}),
			})),
		},
		customerEvidence: {
			status: input.evidence.status,
			segment: input.evidence.segment?.trim() || null,
			sampleSize: input.evidence.sampleSize ?? null,
			method: input.evidence.method?.trim() || null,
			period: input.evidence.period?.trim() || null,
			questionId: input.evidence.questionId?.trim() || null,
			source: input.evidence.source?.trim() || null,
			sourceUrl: input.evidence.sourceUrl?.trim() || null,
			isDemo: Boolean(input.evidence.isDemo),
		},
		assessment: {
			officialStatus: input.officialResult.ok ? "computed" : "refused",
			officialRefusalCodes: input.officialResult.ok
				? []
				: input.officialResult.reasons.map((reason) => reason.code),
			officialScores: input.officialResult.ok
				? input.officialResult.results.map((item) => ({
						id: item.id,
						name: item.name,
						score: Number(item.score.toFixed(2)),
					}))
				: [],
			exploratoryWhatIfScores: input.whatIfResult?.ok
				? input.whatIfResult.results.map((item) => ({
						id: item.id,
						name: item.name,
						score: Number(item.score.toFixed(2)),
					}))
				: [],
			exploratoryDisclaimer:
				"Exploratory What-if rankings are non-official contextual comparisons only and do not represent verified customer demand or investment eligibility.",
		},
	};
}

export function decisionScenarioToCsv(payload: DecisionScenarioExport): string {
	const header = [
		"exported_at",
		"sector",
		"target_segment_assumption",
		"hypotheses_assumption",
		"evidence_status",
		"evidence_source",
		"official_status",
		"province_code",
		"province_name",
		"indicator_code",
		"indicator_label",
		"value",
		"unit",
		"period",
		"quality",
		"score_eligible",
		"source_publisher",
		"dataset_version",
		"official_score",
		"exploratory_whatif_score",
	];
	const officialByGeo = new Map(
		payload.assessment.officialScores.map((item) => [item.id, item.score]),
	);
	const whatIfByGeo = new Map(
		payload.assessment.exploratoryWhatIfScores.map((item) => [
			item.id,
			item.score,
		]),
	);

	const rows: Array<Array<string | number | null>> = [];
	for (const province of payload.observedFacts.provinces) {
		for (const indicator of province.indicators) {
			rows.push([
				payload.exportedAt,
				payload.sectorLabel,
				payload.assumptions.targetSegment,
				payload.assumptions.hypotheses,
				payload.customerEvidence.status,
				payload.customerEvidence.source,
				payload.assessment.officialStatus,
				province.code,
				province.name,
				indicator.code,
				indicator.label,
				indicator.value,
				indicator.unit,
				indicator.period,
				indicator.quality,
				indicator.scoreEligible ? "true" : "false",
				indicator.sourcePublisher,
				indicator.datasetVersion,
				officialByGeo.get(province.id) ?? null,
				whatIfByGeo.get(province.id) ?? null,
			]);
		}
	}

	const lines = [
		header.map((cell) => spreadsheetCsvCell(cell)).join(","),
		...rows.map((row) => row.map((cell) => spreadsheetCsvCell(cell)).join(",")),
	];
	return `\uFEFF${lines.join("\r\n")}\r\n`;
}
