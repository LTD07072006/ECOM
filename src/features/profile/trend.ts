import type { ObservationPoint } from "../geography/types";

/** History is already partitioned by source, indicator, unit and scope in the repository. */
export function calculateCagr(
	history: readonly ObservationPoint[],
): number | null {
	const ordered = [...history].sort((a, b) =>
		a.periodEnd.localeCompare(b.periodEnd),
	);
	if (ordered.length < 2) return null;
	const first = ordered[0];
	const last = ordered[ordered.length - 1];
	const startYear = Number(first.periodStart.slice(0, 4));
	if (
		!ordered.every((point, index) => {
			const year = startYear + index;
			return (
				point.periodStart === `${year}-01-01` &&
				point.periodEnd === `${year}-12-31` &&
				point.quality !== "unavailable" &&
				point.value !== null &&
				Number.isFinite(point.value) &&
				point.value > 0
			);
		}) ||
		first.value === null ||
		last.value === null
	)
		return null;
	const result =
		Math.expm1(
			(Math.log(last.value) - Math.log(first.value)) / (ordered.length - 1),
		) * 100;
	return Number.isFinite(result) ? result : null;
}

export type UsablePoint = {
	period: string;
	periodEnd: string;
	value: number;
};

export type TrendSummary = {
	points: UsablePoint[];
	yoy: { delta: number; kind: "pct" | "pp" } | null;
	polyline: string;
	lastPoint: { x: number; y: number } | null;
};

export function summarizeTrend(
	history: readonly ObservationPoint[] | undefined,
	unit: string,
	width = 112,
	height = 26,
	padding = 3,
): TrendSummary {
	const usable = (history ?? [])
		.filter(
			(item): item is ObservationPoint & { value: number } =>
				item.quality !== "unavailable" && item.value !== null,
		)
		.sort((left, right) => left.periodEnd.localeCompare(right.periodEnd))
		.map((item) => ({
			period: item.period,
			periodEnd: item.periodEnd,
			value: item.value,
		}));

	if (usable.length < 2) {
		return { points: usable, yoy: null, polyline: "", lastPoint: null };
	}

	const prev = usable[usable.length - 2];
	const latest = usable[usable.length - 1];
	let yoy: TrendSummary["yoy"] = null;
	if (unit === "%") {
		yoy = { delta: latest.value - prev.value, kind: "pp" };
	} else if (prev.value !== 0) {
		yoy = {
			delta: ((latest.value - prev.value) / Math.abs(prev.value)) * 100,
			kind: "pct",
		};
	}

	const values = usable.map((point) => point.value);
	const min = Math.min(...values);
	const max = Math.max(...values);
	const span = max - min;
	const innerWidth = Math.max(width - padding * 2, 1);
	const innerHeight = Math.max(height - padding * 2, 1);

	const coords = usable.map((point, index) => {
		const x = padding + (innerWidth * index) / (usable.length - 1);
		const y =
			span === 0
				? padding + innerHeight / 2
				: padding + innerHeight * (1 - (point.value - min) / span);
		return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
	});

	return {
		points: usable,
		yoy,
		polyline: coords.map((pt) => `${pt.x},${pt.y}`).join(" "),
		lastPoint: coords[coords.length - 1] ?? null,
	};
}
