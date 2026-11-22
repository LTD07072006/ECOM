import type { Profile } from "../geography/types";
import type { MessageKey } from "../../lib/i18n/en";
import { safeSourceUrl } from "../../lib/source-url";

export type CriterionDefinition = {
	readonly code: string;
	readonly label: string;
	readonly labelKey: MessageKey;
	readonly unit: string;
	readonly polarity?: "higher" | "lower";
	readonly minimumLabelKey?: MessageKey;
};

export type SectorId = "retail" | "manufacturing" | "logistics" | "enterprise";

export type SectorScenario = {
	readonly id: SectorId;
	readonly labelKey: MessageKey;
	readonly criteria: readonly CriterionDefinition[];
	readonly defaultWeights: readonly string[];
};

export const criteria = [
	{
		code: "RETAIL_TOTAL",
		label: "Retail sales and consumer services",
		labelKey: "retail.criterionRetail" as MessageKey,
		unit: "billion VND",
		minimumLabelKey: "retail.retailMinimum" as MessageKey,
	},
	{
		code: "LABOR_FORCE",
		label: "Labour force",
		labelKey: "retail.criterionLabour" as MessageKey,
		unit: "thousand people",
		minimumLabelKey: "retail.labourMinimum" as MessageKey,
	},
] as const;

export const sectorScenarios: Record<SectorId, SectorScenario> = {
	retail: {
		id: "retail",
		labelKey: "retail.retail",
		criteria,
		defaultWeights: ["60", "40"],
	},
	manufacturing: {
		id: "manufacturing",
		labelKey: "retail.manufacturing",
		criteria: [
			{
				code: "GRDP_PC",
				label: "GRDP per capita",
				labelKey: "retail.criterionGrdpPc",
				unit: "million VND",
			},
			{
				code: "FDI_LICENSED",
				label: "Licensed FDI",
				labelKey: "retail.criterionFdi",
				unit: "million USD",
			},
			{
				code: "TRAINED_LABOR_RATE",
				label: "Trained labour rate",
				labelKey: "retail.criterionTrained",
				unit: "%",
			},
			{
				code: "LABOR_FORCE",
				label: "Labour force",
				labelKey: "retail.criterionLabour",
				unit: "thousand people",
			},
		],
		defaultWeights: ["25", "25", "25", "25"],
	},
	logistics: {
		id: "logistics",
		labelKey: "retail.logistics",
		criteria: [
			{
				code: "RETAIL_TOTAL",
				label: "Retail sales and consumer services",
				labelKey: "retail.criterionRetail",
				unit: "billion VND",
			},
			{
				code: "FDI_LICENSED",
				label: "Licensed FDI",
				labelKey: "retail.criterionFdi",
				unit: "million USD",
			},
			{
				code: "GRDP_PC",
				label: "GRDP per capita",
				labelKey: "retail.criterionGrdpPc",
				unit: "million VND",
			},
			{
				code: "POP_AVG",
				label: "Average population",
				labelKey: "retail.criterionPopulation",
				unit: "thousand people",
			},
		],
		defaultWeights: ["30", "30", "20", "20"],
	},
	enterprise: {
		id: "enterprise",
		labelKey: "retail.enterprise",
		criteria: [
			{
				code: "GRDP_GROWTH",
				label: "GRDP growth rate",
				labelKey: "retail.criterionGrdpGrowth",
				unit: "%",
			},
			{
				code: "ENTERPRISES_NEW",
				label: "Newly established enterprises",
				labelKey: "retail.criterionEnterprises",
				unit: "enterprises",
			},
			{
				code: "TRAINED_LABOR_RATE",
				label: "Trained labour rate",
				labelKey: "retail.criterionTrained",
				unit: "%",
			},
			{
				code: "POP_AVG",
				label: "Average population",
				labelKey: "retail.criterionPopulation",
				unit: "thousand people",
			},
		],
		defaultWeights: ["30", "30", "20", "20"],
	},
};

export const decisionIndicatorCodes = new Set(
	Object.values(sectorScenarios).flatMap((scenario) =>
		scenario.criteria.map((criterion) => criterion.code),
	),
);

export type ScoringReason =
	| {
			code:
				| "retail.reasonSelect"
				| "retail.reasonSameRelease"
				| "retail.reasonWeights"
				| "retail.reasonEvidence";
	  }
	| {
			code:
				| "retail.reasonNoValue"
				| "retail.reasonNotEligible"
				| "retail.reasonMismatch";
			criterion: MessageKey;
	  };

export type Evidence = {
	status: "available" | "unavailable";
	segment?: string;
	geographyIds?: string[];
	sampleSize?: number;
	method?: string;
	period?: string;
	periodStart?: string;
	periodEnd?: string;
	questionId?: string;
	aggregateSummary?: string;
	source?: string;
	sourceUrl?: string;
	isDemo?: boolean;
};

export function validateCustomerEvidence(
	evidence: Evidence,
	profileIds: readonly string[],
) {
	const segment = Boolean(evidence.segment?.trim());
	const sampleSize = Boolean(
		evidence.sampleSize !== undefined &&
			Number.isFinite(evidence.sampleSize) &&
			evidence.sampleSize >= 1,
	);
	const method = Boolean(evidence.method?.trim());
	const period = Boolean(evidence.period?.trim());
	const source = Boolean(evidence.source?.trim());
	const sourceUrlValid =
		!evidence.sourceUrl?.trim() || Boolean(safeSourceUrl(evidence.sourceUrl));
	const coverage =
		profileIds.length > 0 &&
		profileIds.every((id) => evidence.geographyIds?.includes(id));

	const ok =
		evidence.status === "available" &&
		segment &&
		sampleSize &&
		method &&
		period &&
		source &&
		sourceUrlValid &&
		coverage;

	return {
		ok,
		checks: {
			segment,
			sampleSize,
			method,
			period,
			source,
			sourceUrlValid,
			coverage,
		},
	};
}

function validateComparableInputs(
	sectorCriteria: readonly CriterionDefinition[],
	profiles: Profile[],
	weights: number[],
	requireScoreEligible: boolean,
) {
	const reasons: ScoringReason[] = [];
	const ineligibleIndicators: MessageKey[] = [];

	if (
		profiles.length < 2 ||
		profiles.length > 3 ||
		new Set(profiles.map((p) => p.id)).size !== profiles.length
	) {
		reasons.push({ code: "retail.reasonSelect" });
	}
	if (
		profiles.some((p) => p.level !== "province") ||
		new Set(profiles.map((p) => p.geographyVersion)).size > 1
	) {
		reasons.push({ code: "retail.reasonSameRelease" });
	}
	if (
		weights.length !== sectorCriteria.length ||
		weights.some((w) => !Number.isFinite(w) || w < 0) ||
		Math.abs(weights.reduce((a, b) => a + b, 0) - 100) > 0.001
	) {
		reasons.push({ code: "retail.reasonWeights" });
	}

	const observations = sectorCriteria.map((criterion) =>
		profiles.map((profile) =>
			profile.observations.find((item) => item.indicator === criterion.code),
		),
	);

	observations.forEach((items, index) => {
		const criterion = sectorCriteria[index];
		const usable = items.filter(
			(item): item is NonNullable<typeof item> & { value: number } =>
				Boolean(item && item.value !== null && item.quality !== "unavailable"),
		);
		if (usable.length !== items.length) {
			reasons.push({
				code: "retail.reasonNoValue",
				criterion: criterion.labelKey,
			});
			return;
		}
		if (usable.some((item) => !item.scoreEligible)) {
			ineligibleIndicators.push(criterion.labelKey);
			if (requireScoreEligible) {
				reasons.push({
					code: "retail.reasonNotEligible",
					criterion: criterion.labelKey,
				});
			}
		}
		const first = usable[0];
		if (
			first &&
			usable.some(
				(item) =>
					item.source.id !== first.source.id ||
					item.dataset?.id !== first.dataset?.id ||
					item.datasetVersion !== first.datasetVersion ||
					item.periodStart !== first.periodStart ||
					item.periodEnd !== first.periodEnd ||
					item.unit !== first.unit ||
					item.scope !== first.scope ||
					item.definition !== first.definition,
			)
		) {
			reasons.push({
				code: "retail.reasonMismatch",
				criterion: criterion.labelKey,
			});
		}
	});

	return { reasons, observations, ineligibleIndicators };
}

function computeWeightedResults(
	sectorCriteria: readonly CriterionDefinition[],
	profiles: Profile[],
	weights: number[],
	observations: Array<Array<Profile["observations"][number] | undefined>>,
) {
	return profiles.map((profile, index) => {
		const parts = observations.map((items, criterionIndex) => {
			const values = items.map((item) => item?.value ?? 0);
			const min = Math.min(...values);
			const max = Math.max(...values);
			const criterion = sectorCriteria[criterionIndex];
			const polarity = criterion.polarity ?? "higher";
			const normalized =
				max === min
					? 50
					: polarity === "lower"
						? (100 * (max - values[index])) / (max - min)
						: (100 * (values[index] - min)) / (max - min);
			return {
				label: criterion.label,
				labelKey: criterion.labelKey,
				value: values[index],
				normalized,
				weight: weights[criterionIndex],
				contribution: (normalized * weights[criterionIndex]) / 100,
			};
		});
		return {
			id: profile.id,
			name: profile.displayName,
			parts,
			score: parts.reduce((sum, part) => sum + part.contribution, 0),
		};
	});
}

export function calculateSectorScore(
	sectorCriteria: readonly CriterionDefinition[],
	profiles: Profile[],
	weights: number[],
	evidence: Evidence,
) {
	const { reasons, observations } = validateComparableInputs(
		sectorCriteria,
		profiles,
		weights,
		true,
	);
	const evidenceCheck = validateCustomerEvidence(
		evidence,
		profiles.map((profile) => profile.id),
	);
	if (!evidenceCheck.ok) {
		reasons.push({ code: "retail.reasonEvidence" });
	}
	if (reasons.length) return { ok: false as const, reasons };

	return {
		ok: true as const,
		results: computeWeightedResults(
			sectorCriteria,
			profiles,
			weights,
			observations,
		),
	};
}

export function calculateContextualRanking(
	sectorCriteria: readonly CriterionDefinition[],
	profiles: Profile[],
	weights: number[],
) {
	const { reasons, observations, ineligibleIndicators } =
		validateComparableInputs(sectorCriteria, profiles, weights, false);
	if (reasons.length) return { ok: false as const, reasons };

	const results = computeWeightedResults(
		sectorCriteria,
		profiles,
		weights,
		observations,
	).sort((left, right) => right.score - left.score);

	return {
		ok: true as const,
		exploratory: true as const,
		ineligibleIndicators,
		results,
	};
}

export function calculateRetailScore(
	profiles: Profile[],
	weights: number[],
	evidence: Evidence,
) {
	return calculateSectorScore(criteria, profiles, weights, evidence);
}
