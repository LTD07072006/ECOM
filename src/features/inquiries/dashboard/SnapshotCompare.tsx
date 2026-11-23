"use client";

import { useI18n } from "../../../lib/i18n/provider";
import {
	filterLabelKeys,
	formatFilterValue,
	formatReportPeriod,
	statusOptions,
	type SnapshotComparison,
} from "./types";

type Props = {
	comparison: SnapshotComparison;
	geographyNames: Record<string, string>;
};

export function SnapshotCompare({ comparison, geographyNames }: Props) {
	const { t, formatDate } = useI18n();

	return (
		<section aria-label={t("reports.comparisonAria")}>
			<h2>{t("reports.comparisonTitle")}</h2>
			{comparison.compatible ? (
				<div
					className="inquiry-report-scroll"
					role="region"
					aria-label={t("reports.tableCompareAria")}
					// biome-ignore lint/a11y/noNoninteractiveTabindex: vùng bảng cuộn phải focus được bằng bàn phím (WCAG 2.1.1)
					tabIndex={0}
				>
					<table>
						<thead>
							<tr>
								<th scope="col">{t("reports.metricCol")}</th>
								{[comparison.left, comparison.right].map((item) => (
									<th scope="col" key={item.snapshotId}>
										{formatReportPeriod(
											{
												period_start: item.periodStart,
												period_end: item.periodEnd,
												time_zone: item.timeZone,
											},
											formatDate,
										)}
									</th>
								))}
								<th scope="col">{t("reports.deltaCol")}</th>
							</tr>
						</thead>
						<tbody>
							{[
								{
									label: t("reports.totalInquiry"),
									left: comparison.left.total,
									right: comparison.right.total,
									delta: comparison.delta.total,
								},
								...statusOptions.map((option) => ({
									label: t(option.key),
									left:
										comparison.left.byStatus[
											option.value as keyof typeof comparison.left.byStatus
										] ?? 0,
									right:
										comparison.right.byStatus[
											option.value as keyof typeof comparison.right.byStatus
										] ?? 0,
									delta:
										comparison.delta.byStatus[
											option.value as keyof typeof comparison.delta.byStatus
										] ?? 0,
								})),
							].map((row) => (
								<tr key={row.label}>
									<th scope="row">{row.label}</th>
									<td>{row.left}</td>
									<td>{row.right}</td>
									<td>
										{row.delta > 0 ? "+" : ""}
										{row.delta}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : (
				<ul aria-label={t("reports.differencesAria")}>
					{comparison.differences.map(({ field, left, right }) => (
						<li key={field}>
							<strong>
								{filterLabelKeys[field] ? t(filterLabelKeys[field]) : field}
							</strong>{" "}
							· {formatFilterValue(field, left, geographyNames, t)} →{" "}
							{formatFilterValue(field, right, geographyNames, t)}
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
