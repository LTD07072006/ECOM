"use client";

import type { Observation } from "../geography/types";
import { useI18n } from "../../lib/i18n/provider";
import { indicatorLabel } from "../../lib/i18n/data-labels";
import { chartColors } from "../map/layers";
import { calculateCagr, summarizeTrend } from "./trend";

export function IndicatorTrend({ observation }: { observation: Observation }) {
	const { t, locale, formatNumber } = useI18n();
	const trend = summarizeTrend(observation.history, observation.unit);
	const cagr = calculateCagr(observation.history ?? []);

	if (trend.points.length <= 1) return null;

	const first = trend.points[0];
	const last = trend.points[trend.points.length - 1];
	const label = indicatorLabel(
		locale,
		observation.indicator,
		observation.label,
	);
	const badgeClass =
		trend.yoy === null
			? "status-badge"
			: trend.yoy.delta > 0
				? "status-badge status-badge--success"
				: trend.yoy.delta < 0
					? "status-badge status-badge--error"
					: "status-badge";
	const formattedDelta =
		trend.yoy === null
			? null
			: `${trend.yoy.delta > 0 ? "+" : ""}${formatNumber(Number(trend.yoy.delta.toFixed(1)))}`;

	return (
		<div className="indicator-trend">
			<svg
				width="112"
				height="26"
				viewBox="0 0 112 26"
				role="img"
				aria-label={t("trend.aria", {
					label,
					start: first.period,
					end: last.period,
				})}
			>
				<polyline
					fill="none"
					stroke={chartColors.primary}
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					points={trend.polyline}
				/>
				{trend.lastPoint && (
					<circle
						cx={trend.lastPoint.x}
						cy={trend.lastPoint.y}
						r="3"
						fill={chartColors.accent}
					/>
				)}
			</svg>
			{trend.yoy && formattedDelta && (
				<span className={badgeClass}>
					{t(trend.yoy.kind === "pp" ? "trend.yoyPp" : "trend.yoyPct", {
						delta: formattedDelta,
					})}
				</span>
			)}
			<span className="trend-range">
				{cagr !== null
					? t("trend.cagr", {
							start: first.period,
							end: last.period,
							rate: `${cagr > 0 ? "+" : ""}${formatNumber(Number(cagr.toFixed(1)))}`,
						})
					: t("trend.periods", {
							count: trend.points.length,
							start: first.period,
							end: last.period,
						})}
			</span>
		</div>
	);
}
