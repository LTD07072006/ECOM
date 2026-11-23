"use client";

import { useState } from "react";
import { useI18n } from "../../lib/i18n/provider";
import { saveCsv } from "../inquiries/dashboard/types";
import {
	buildCoverageFreshnessMatrix,
	buildCoverageMatrixCsv,
	type FreshnessState,
} from "./coverage-matrix";
import styles from "./coverage-matrix.module.css";
import type { ReleaseOverview } from "./operations";

type MatrixFilter = "all" | "attention" | "overdue" | "incomplete";

const COPY = {
	vi: {
		title: "Ma trận Độ phủ 34 Tỉnh & Độ tươi Dữ liệu",
		exportCsv: "Xuất báo cáo độ phủ CSV",
		filters: {
			all: "Tất cả",
			attention: "Cần rà soát",
			overdue: "Quá hạn kiểm tra",
			incomplete: "Thiếu độ phủ tỉnh",
		} satisfies Record<MatrixFilter, string>,
		kpis: {
			total: "Tổng bộ dữ liệu",
			fullCoverage: "Đủ 100% tỉnh kỳ vọng",
			incomplete: "Thiếu độ phủ",
			overdue: "Quá hạn rà soát",
			dueSoon: "Sắp đến hạn (≤30 ngày)",
			validation: "Lỗi hình học / số liệu",
		},
		columns: {
			dataset: "Mã dữ liệu",
			version: "Phiên bản",
			status: "Trạng thái",
			coverage: "Độ phủ tỉnh",
			asOf: "Ngày dữ liệu",
			due: "Hạn kiểm tra",
			freshness: "Độ tươi",
			issues: "Cảnh báo",
		},
		freshnessLabels: {
			overdue: "Quá hạn",
			due_soon: "Sắp đến hạn",
			fresh: "Đạt chuẩn",
			unknown: "Chưa có hạn",
		} satisfies Record<FreshnessState, string>,
		noRows: "Không có bộ dữ liệu nào khớp bộ lọc hiện tại.",
		noData: "Chưa có dữ liệu",
	},
	en: {
		title: "34-Province Coverage & Freshness Matrix",
		exportCsv: "Export Coverage Audit CSV",
		filters: {
			all: "All datasets",
			attention: "Needs review",
			overdue: "Overdue review",
			incomplete: "Incomplete province coverage",
		} satisfies Record<MatrixFilter, string>,
		kpis: {
			total: "Total datasets",
			fullCoverage: "100% expected provinces",
			incomplete: "Incomplete coverage",
			overdue: "Overdue reviews",
			dueSoon: "Due soon (≤30d)",
			validation: "Validation errors",
		},
		columns: {
			dataset: "Dataset",
			version: "Version",
			status: "Status",
			coverage: "Province coverage",
			asOf: "Data as of",
			due: "Review due",
			freshness: "Freshness",
			issues: "Alerts",
		},
		freshnessLabels: {
			overdue: "Overdue",
			due_soon: "Due soon",
			fresh: "Fresh",
			unknown: "No schedule",
		} satisfies Record<FreshnessState, string>,
		noRows: "No datasets match the active filter.",
		noData: "No data available",
	},
} as const;

export function CoverageFreshnessMatrix({
	datasets,
}: {
	datasets: ReleaseOverview["datasets"];
}) {
	const { locale } = useI18n();
	const text = COPY[locale];
	const [filter, setFilter] = useState<MatrixFilter>("all");
	const summary = buildCoverageFreshnessMatrix(datasets);

	const filteredRows = summary.rows.filter((row) => {
		if (filter === "attention") return row.needsAttention;
		if (filter === "overdue") return row.freshnessState === "overdue";
		if (filter === "incomplete") return row.isIncomplete;
		return true;
	});

	function exportCsv() {
		const csv = buildCoverageMatrixCsv(filteredRows);
		saveCsv(
			new Blob([csv], { type: "text/csv;charset=utf-8" }),
			"release-coverage-freshness.csv",
		);
	}

	function freshnessBadgeClass(state: FreshnessState): string {
		switch (state) {
			case "overdue":
				return `${styles.badge} ${styles.badgeOverdue}`;
			case "due_soon":
				return `${styles.badge} ${styles.badgeDueSoon}`;
			case "fresh":
				return `${styles.badge} ${styles.badgeFresh}`;
			case "unknown":
				return `${styles.badge} ${styles.badgeUnknown}`;
		}
	}

	return (
		<section
			className={styles.matrix}
			aria-labelledby="coverage-matrix-heading"
			data-testid="release-coverage-matrix"
		>
			<div className={styles.header}>
				<h2 id="coverage-matrix-heading">{text.title}</h2>
				<button
					type="button"
					className={styles.exportBtn}
					disabled={filteredRows.length === 0}
					onClick={exportCsv}
				>
					{text.exportCsv}
				</button>
			</div>

			<div className={styles.kpiStrip}>
				<div className={styles.kpiCard}>
					<span className={styles.kpiLabel}>{text.kpis.total}</span>
					<span className={styles.kpiValue}>{summary.totalDatasets}</span>
				</div>
				<div className={styles.kpiCard}>
					<span className={styles.kpiLabel}>{text.kpis.fullCoverage}</span>
					<span className={styles.kpiValue}>{summary.fullCoverageCount}</span>
				</div>
				<div className={styles.kpiCard}>
					<span className={styles.kpiLabel}>{text.kpis.incomplete}</span>
					<span
						className={
							summary.incompleteCount > 0
								? `${styles.kpiValue} ${styles.kpiAlert}`
								: styles.kpiValue
						}
					>
						{summary.incompleteCount}
					</span>
				</div>
				<div className={styles.kpiCard}>
					<span className={styles.kpiLabel}>{text.kpis.overdue}</span>
					<span
						className={
							summary.overdueCount > 0
								? `${styles.kpiValue} ${styles.kpiAlert}`
								: styles.kpiValue
						}
					>
						{summary.overdueCount}
					</span>
				</div>
				<div className={styles.kpiCard}>
					<span className={styles.kpiLabel}>{text.kpis.dueSoon}</span>
					<span className={styles.kpiValue}>{summary.dueSoonCount}</span>
				</div>
				<div className={styles.kpiCard}>
					<span className={styles.kpiLabel}>{text.kpis.validation}</span>
					<span
						className={
							summary.validationIssueCount > 0
								? `${styles.kpiValue} ${styles.kpiAlert}`
								: styles.kpiValue
						}
					>
						{summary.validationIssueCount}
					</span>
				</div>
			</div>

			<div className={styles.toolbar}>
				<div className={styles.filters} role="group" aria-label={text.title}>
					{(["all", "attention", "overdue", "incomplete"] as const).map(
						(key) => {
							const active = filter === key;
							return (
								<button
									key={key}
									type="button"
									aria-pressed={active}
									className={
										active
											? `${styles.filterBtn} ${styles.filterBtnActive}`
											: styles.filterBtn
									}
									onClick={() => setFilter(key)}
								>
									{text.filters[key]}
								</button>
							);
						},
					)}
				</div>
			</div>

			<div className={styles.tableWrap}>
				{filteredRows.length === 0 ? (
					<p className={styles.emptyNote}>{text.noRows}</p>
				) : (
					<table className={styles.table}>
						<thead>
							<tr>
								<th scope="col">{text.columns.dataset}</th>
								<th scope="col">{text.columns.version}</th>
								<th scope="col">{text.columns.status}</th>
								<th scope="col">{text.columns.coverage}</th>
								<th scope="col">{text.columns.asOf}</th>
								<th scope="col">{text.columns.due}</th>
								<th scope="col">{text.columns.freshness}</th>
								<th scope="col">{text.columns.issues}</th>
							</tr>
						</thead>
						<tbody>
							{filteredRows.map((row) => (
								<tr key={row.datasetVersionId}>
									<td className={styles.codeCell}>{row.code}</td>
									<td>{row.version}</td>
									<td>
										{row.status} ({row.sourceStatus})
									</td>
									<td>
										{row.coveragePercent === null ? (
											<span>{text.noData}</span>
										) : (
											<div className={styles.coverageCell}>
												<div className={styles.coverageBar} aria-hidden="true">
													<span
														className={styles.coverageFill}
														style={{ width: `${row.coveragePercent}%` }}
													/>
												</div>
												<span>
													{row.coveredProvinces}/{row.expectedProvinces} (
													{row.coveragePercent}%)
												</span>
											</div>
										)}
									</td>
									<td>{row.asOf ?? "—"}</td>
									<td>{row.due ?? "—"}</td>
									<td>
										<span className={freshnessBadgeClass(row.freshnessState)}>
											{text.freshnessLabels[row.freshnessState]}
										</span>
									</td>
									<td>
										{row.validationIssues > 0 ? `${row.validationIssues}` : "0"}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>
		</section>
	);
}
