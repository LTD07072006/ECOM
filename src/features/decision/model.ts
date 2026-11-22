import type { Profile } from "../geography/types";
import type { MessageKey } from "../../lib/i18n/en";

export const criteria = [
	{
		code: "RETAIL_TOTAL",
		label: "Retail sales and consumer services",
		labelKey: "retail.criterionRetail" as MessageKey,
		unit: "billion VND",
	},
	{
		code: "LABOR_FORCE",
		label: "Labour force",
		labelKey: "retail.criterionLabour" as MessageKey,
		unit: "thousand people",
	},
] as const;

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
	source?: string;
};

export function calculateRetailScore(
	profiles: Profile[],
	weights: number[],
	evidence: Evidence,
) {
	const reasons: ScoringReason[] = [];
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
		weights.length !== criteria.length ||
		weights.some((w) => !Number.isFinite(w) || w < 0) ||
		Math.abs(weights.reduce((a, b) => a + b, 0) - 100) > 0.001
	) {
		reasons.push({ code: "retail.reasonWeights" });
	}
	if (
		evidence.status !== "available" ||
		!evidence.segment ||
		!evidence.sampleSize ||
		evidence.sampleSize < 1 ||
		!evidence.method ||
		!evidence.period ||
		!evidence.source ||
		profiles.some((profile) => !evidence.geographyIds?.includes(profile.id))
	) {
		reasons.push({ code: "retail.reasonEvidence" });
	}

	const observations = criteria.map((criterion) =>
		profiles.map((profile) =>
			profile.observations.find((item) => item.indicator === criterion.code),
		),
	);
	observations.forEach((items, index) => {
		const criterion = criteria[index];
		if (
			items.some(
				(item) =>
					!item || item.value === null || item.quality === "unavailable",
			)
		) {
			reasons.push({
				code: "retail.reasonNoValue",
				criterion: criterion.labelKey,
			});
			return;
		}
		if (items.some((item) => !item!.scoreEligible))
			reasons.push({
				code: "retail.reasonNotEligible",
				criterion: criterion.labelKey,
			});
		const first = items[0]!;
		if (
			items.some(
				(item) =>
					item!.source.id !== first.source.id ||
					item!.dataset?.id !== first.dataset?.id ||
					item!.datasetVersion !== first.datasetVersion ||
					item!.periodStart !== first.periodStart ||
					item!.periodEnd !== first.periodEnd ||
					item!.unit !== first.unit ||
					item!.scope !== first.scope ||
					item!.definition !== first.definition,
			)
		)
			reasons.push({
				code: "retail.reasonMismatch",
				criterion: criterion.labelKey,
			});
	});
	if (reasons.length) return { ok: false as const, reasons };

	const results = profiles.map((profile, index) => {
		const parts = observations.map((items, criterion) => {
			const values = items.map((item) => item!.value!);
			const min = Math.min(...values);
			const max = Math.max(...values);
			const normalized =
				max === min ? 50 : (100 * (values[index] - min)) / (max - min);
			return {
				label: criteria[criterion].label,
				labelKey: criteria[criterion].labelKey,
				value: values[index],
				normalized,
				weight: weights[criterion],
				contribution: (normalized * weights[criterion]) / 100,
			};
		});
		return {
			id: profile.id,
			name: profile.displayName,
			parts,
			score: parts.reduce((sum, part) => sum + part.contribution, 0),
		};
	});
	return { ok: true as const, results };
}
