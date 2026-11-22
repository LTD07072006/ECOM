"use client";

import { useI18n } from "../../../lib/i18n/provider";
import { VIETNAM_REPORT_TIME_ZONE } from "../reporting";
import { buildFunnelBars, buildWeeklyBars } from "./sla";
import {
	formatFilterSummary,
	formatReportPeriod,
	formatStatusLabel,
	type InquiryMetrics,
} from "./types";

type SnapshotInputPreview = {
	periodStart: string;
	periodEnd: string;
	filters: Record<string, unknown>;
};

type Props = {
	busy: boolean;
	canAuthenticate: boolean;
	validPeriod: boolean;
	snapshotInput: SnapshotInputPreview;
	currentPreview: { key: string; total: number } | null;
	correctionId: string;
	geographyNames: Record<string, string>;
	chartMetrics: InquiryMetrics | null;
	onCancelCorrection: () => void;
	onPrepareSnapshot: (previewOnly: boolean) => void;
};

export function ReportingWorkspace({
	busy,
	canAuthenticate,
	validPeriod,
	snapshotInput,
	currentPreview,
	correctionId,
	geographyNames,
	chartMetrics,
	onCancelCorrection,
	onPrepareSnapshot,
}: Props) {
	const { t, formatDate } = useI18n();
	const funnelBars = chartMetrics ? buildFunnelBars(chartMetrics) : [];
	const weeklyBars = chartMetrics
		? buildWeeklyBars(chartMetrics.weeklyTrend)
		: [];

	return (
		<>
			<section aria-label={t("reports.previewAria")}>
				<h2>{t("reports.previewTitle")}</h2>
				<dl className="inquiry-report-meta">
					<dt>{t("reports.period")}</dt>
					<dd>
						{validPeriod
							? formatReportPeriod(
									{
										period_start: snapshotInput.periodStart,
										period_end: snapshotInput.periodEnd,
										time_zone: VIETNAM_REPORT_TIME_ZONE,
									},
									formatDate,
								)
							: t("reports.chooseEndDate")}
					</dd>
					<dt>{t("reports.filters")}</dt>
					<dd>
						{formatFilterSummary(snapshotInput.filters, geographyNames, t)}
					</dd>
					<dt>{t("reports.totalInquiry")}</dt>
					<dd>{currentPreview?.total ?? t("reports.previewHint")}</dd>
				</dl>
				{correctionId && (
					<p>
						{t("reports.correctionFrom", { id: correctionId })}{" "}
						<button type="button" disabled={busy} onClick={onCancelCorrection}>
							{t("reports.cancelCorrection")}
						</button>
					</p>
				)}
				<div className="inquiry-report-actions">
					<button
						type="button"
						disabled={busy || !canAuthenticate || !validPeriod}
						onClick={() => onPrepareSnapshot(true)}
					>
						{t("reports.preview")}
					</button>
					<button
						type="button"
						className="inquiry-primary"
						disabled={busy || !canAuthenticate || !currentPreview}
						onClick={() => onPrepareSnapshot(false)}
					>
						{correctionId ? t("reports.saveCorrection") : t("reports.save")}
					</button>
				</div>
			</section>

			{chartMetrics ? (
				<div className="report-charts">
					<section
						className="report-chart-card"
						aria-label={t("reports.funnelChartAria")}
					>
						<h3>{t("admin.metricsTitle")}</h3>
						<ul className="funnel-bars">
							{funnelBars.map((item) => (
								<li className="funnel-bar-row" key={item.stage}>
									<span>{formatStatusLabel(item.stage, t)}</span>
									<div className="funnel-bar-track" aria-hidden="true">
										<span
											className="funnel-bar-fill"
											style={{ width: `${item.percent}%` }}
										/>
									</div>
									<span>
										{item.count} ({item.percent}%)
									</span>
								</li>
							))}
						</ul>
					</section>

					<section
						className="report-chart-card"
						aria-label={t("reports.weeklyChartAria")}
					>
						<h3>{t("admin.weeklyTrend")}</h3>
						{weeklyBars.length > 0 ? (
							<svg
								className="weekly-chart-svg"
								viewBox={`0 0 ${Math.max(weeklyBars.length * 42, 160)} 110`}
								role="img"
								aria-label={t("reports.weeklyChartAria")}
							>
								{weeklyBars.map((bar, index) => {
									const barHeight = Math.max(
										4,
										Math.round((bar.heightPercent / 100) * 68),
									);
									const x = index * 42 + 8;
									const y = 80 - barHeight;
									return (
										<g key={bar.week}>
											<rect
												x={x}
												y={y}
												width="26"
												height={barHeight}
												rx="3"
												fill="#0f5c5a"
											/>
											<text
												x={x + 13}
												y={y - 4}
												textAnchor="middle"
												fontSize="9"
												fill="#17211f"
											>
												{bar.count}
											</text>
											<text
												x={x + 13}
												y="96"
												textAnchor="middle"
												fontSize="8"
												fill="#4f625e"
											>
												{bar.week.slice(-3)}
											</text>
										</g>
									);
								})}
							</svg>
						) : (
							<p className="muted">—</p>
						)}
					</section>
				</div>
			) : (
				<p className="muted">{t("reports.chartNoData")}</p>
			)}
		</>
	);
}
