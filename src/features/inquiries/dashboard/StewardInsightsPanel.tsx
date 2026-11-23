"use client";

import { useI18n } from "../../../lib/i18n/provider";
import {
	buildStewardSummaryCsv,
	summarizeStewardInquiries,
} from "./steward-analytics";
import styles from "./steward-insights.module.css";
import { type InquiryMetrics, type InquiryRow, saveCsv } from "./types";

const COPY = {
	vi: {
		title: "Tổng quan SLA & Phân bổ yêu cầu IPA",
		exportCsv: "Xuất tóm tắt CSV",
		loadedCount: "Hồ sơ đang hiển thị",
		openCount: "Đang xử lý (chưa đóng)",
		overdueCount: "Quá hạn SLA (>48h)",
		onTrackPercent: "Tỷ lệ đúng hạn SLA",
		noData: "Chưa có dữ liệu",
		topSectors: "Ngành quan tâm hàng đầu",
		topCountries: "Thị trường nhà đầu tư",
		emptyBreakdown: "Tải danh sách yêu cầu để xem phân tích ngành và quốc gia.",
	},
	en: {
		title: "SLA & Investor Pipeline Insights",
		exportCsv: "Export Summary CSV",
		loadedCount: "Loaded inquiries",
		openCount: "Open pipeline",
		overdueCount: "SLA overdue (>48h)",
		onTrackPercent: "On-track SLA rate",
		noData: "No data available",
		topSectors: "Top target sectors",
		topCountries: "Top investor origin countries",
		emptyBreakdown:
			"Load inquiries to view sector and investor-origin breakdowns.",
	},
} as const;

export function StewardInsightsPanel({
	rows,
	metrics,
}: {
	rows: readonly InquiryRow[];
	metrics: InquiryMetrics | null;
}) {
	const { locale } = useI18n();
	const text = COPY[locale];
	const summary = summarizeStewardInquiries(rows, metrics);
	const peakCountryCount = summary.topCountries[0]?.count ?? 0;

	function exportSummaryCsv() {
		const csv = buildStewardSummaryCsv(summary);
		saveCsv(
			new Blob([csv], { type: "text/csv;charset=utf-8" }),
			"steward-inquiry-summary.csv",
		);
	}

	return (
		<section
			className={styles.panel}
			aria-labelledby="steward-insights-heading"
			data-testid="steward-insights-panel"
		>
			<div className={styles.header}>
				<h2 id="steward-insights-heading">{text.title}</h2>
				<button
					type="button"
					className={styles.exportBtn}
					disabled={summary.totalLoaded === 0 && summary.corpusTotal === null}
					onClick={exportSummaryCsv}
				>
					{text.exportCsv}
				</button>
			</div>

			<div className={styles.kpiGrid}>
				<div className={styles.kpiCard}>
					<span className={styles.kpiLabel}>{text.loadedCount}</span>
					<span className={styles.kpiValue}>{summary.totalLoaded}</span>
				</div>
				<div className={styles.kpiCard}>
					<span className={styles.kpiLabel}>{text.openCount}</span>
					<span className={styles.kpiValue}>{summary.openCount}</span>
				</div>
				<div className={styles.kpiCard}>
					<span className={styles.kpiLabel}>{text.overdueCount}</span>
					<span
						className={
							summary.slaOverdueCount > 0
								? `${styles.kpiValue} ${styles.kpiAlert}`
								: styles.kpiValue
						}
					>
						{summary.slaOverdueCount}
					</span>
				</div>
				<div className={styles.kpiCard}>
					<span className={styles.kpiLabel}>{text.onTrackPercent}</span>
					<span className={styles.kpiValue}>
						{summary.slaOnTrackPercent === null
							? text.noData
							: `${summary.slaOnTrackPercent}%`}
					</span>
				</div>
			</div>

			{summary.topSectors.length > 0 || summary.topCountries.length > 0 ? (
				<div className={styles.breakdowns}>
					<div className={styles.breakdownCard}>
						<h3>{text.topSectors}</h3>
						{summary.topSectors.length > 0 ? (
							<ul className={styles.barList}>
								{summary.topSectors.map((item) => (
									<li className={styles.barRow} key={item.sector}>
										<span className={styles.barLabel} title={item.sector}>
											{item.sector}
										</span>
										<div className={styles.barTrack} aria-hidden="true">
											<span
												className={styles.barFill}
												style={{ width: `${Math.max(item.percent, 4)}%` }}
											/>
										</div>
										<span className={styles.barValue}>
											{item.count} ({item.percent}%)
										</span>
									</li>
								))}
							</ul>
						) : (
							<p className={styles.emptyNote}>{text.noData}</p>
						)}
					</div>

					<div className={styles.breakdownCard}>
						<h3>{text.topCountries}</h3>
						{summary.topCountries.length > 0 ? (
							<ul className={styles.barList}>
								{summary.topCountries.map((item) => {
									const barPct =
										peakCountryCount > 0
											? Math.round((item.count / peakCountryCount) * 100)
											: 0;
									return (
										<li className={styles.barRow} key={item.country}>
											<span className={styles.barLabel} title={item.country}>
												{item.country}
											</span>
											<div className={styles.barTrack} aria-hidden="true">
												<span
													className={styles.barFill}
													style={{ width: `${Math.max(barPct, 4)}%` }}
												/>
											</div>
											<span className={styles.barValue}>{item.count}</span>
										</li>
									);
								})}
							</ul>
						) : (
							<p className={styles.emptyNote}>{text.noData}</p>
						)}
					</div>
				</div>
			) : (
				<p className={styles.emptyNote}>{text.emptyBreakdown}</p>
			)}
		</section>
	);
}
