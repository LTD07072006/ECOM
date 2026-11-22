export type ComparisonCellStat = {
	barPercent: number;
	isBaseline: boolean;
	delta: number | null;
	deltaPercent: number | null;
	deltaKind: "pct" | "pp" | null;
};

export function computeComparisonRowMetrics(
	values: ReadonlyArray<number | null>,
	baselineIndex: number,
	unit: string,
): ComparisonCellStat[] {
	const finiteValues = values.filter(
		(v): v is number => v !== null && Number.isFinite(v),
	);
	const maxAbs =
		finiteValues.length > 0
			? Math.max(...finiteValues.map((v) => Math.abs(v)))
			: 0;
	const safeBaselineIndex =
		baselineIndex >= 0 && baselineIndex < values.length ? baselineIndex : 0;
	const baselineValue = values[safeBaselineIndex] ?? null;

	return values.map((value, index) => {
		const isBaseline = index === safeBaselineIndex;
		if (value === null || !Number.isFinite(value)) {
			return {
				barPercent: 0,
				isBaseline,
				delta: null,
				deltaPercent: null,
				deltaKind: null,
			};
		}

		const barPercent =
			maxAbs > 0
				? Math.max(
						4,
						Math.min(100, Math.round((Math.abs(value) / maxAbs) * 100)),
					)
				: 0;

		if (
			isBaseline ||
			baselineValue === null ||
			!Number.isFinite(baselineValue)
		) {
			return {
				barPercent,
				isBaseline,
				delta: null,
				deltaPercent: null,
				deltaKind: null,
			};
		}

		const delta = value - baselineValue;
		if (unit === "%") {
			return {
				barPercent,
				isBaseline: false,
				delta,
				deltaPercent: null,
				deltaKind: "pp",
			};
		}
		if (baselineValue !== 0) {
			return {
				barPercent,
				isBaseline: false,
				delta,
				deltaPercent: (delta / Math.abs(baselineValue)) * 100,
				deltaKind: "pct",
			};
		}
		return {
			barPercent,
			isBaseline: false,
			delta,
			deltaPercent: null,
			deltaKind: null,
		};
	});
}
