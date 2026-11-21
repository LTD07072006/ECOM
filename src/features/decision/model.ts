import type { Profile } from "../geography/types";

export const criteria = [
	{
		code: "RETAIL_TOTAL",
		label: "Retail sales and consumer services",
		unit: "billion VND",
	},
	{ code: "LABOR_FORCE", label: "Labour force", unit: "thousand people" },
] as const;

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
	const reasons: string[] = [];
	if (
		profiles.length < 2 ||
		profiles.length > 3 ||
		new Set(profiles.map((p) => p.id)).size !== profiles.length
	) {
		reasons.push("Select two or three different provinces.");
	}
	if (
		profiles.some((p) => p.level !== "province") ||
		new Set(profiles.map((p) => p.geographyVersion)).size > 1
	) {
		reasons.push(
			"Selected places must be provinces from the same geography release.",
		);
	}
	if (
		weights.length !== criteria.length ||
		weights.some((w) => !Number.isFinite(w) || w < 0) ||
		Math.abs(weights.reduce((a, b) => a + b, 0) - 100) > 0.001
	) {
		reasons.push("Weights must be non-negative and add up to 100%.");
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
		reasons.push(
			"Customer needs evidence with a segment, sample, method, period, source and selected geography coverage is unavailable.",
		);
	}

	const observations = criteria.map((criterion) =>
		profiles.map((profile) =>
			profile.observations.find((item) => item.indicator === criterion.code),
		),
	);
	observations.forEach((items, index) => {
		const label = criteria[index].label;
		if (
			items.some(
				(item) =>
					!item || item.value === null || item.quality === "unavailable",
			)
		) {
			reasons.push(`${label}: a selected province has no usable value.`);
			return;
		}
		if (items.some((item) => !item!.scoreEligible))
			reasons.push(`${label}: this indicator is not approved for scoring.`);
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
			reasons.push(
				`${label}: sources, releases, periods, units or definitions do not match.`,
			);
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
