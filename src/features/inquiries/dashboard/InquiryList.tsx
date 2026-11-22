"use client";

import { useI18n } from "../../../lib/i18n/provider";
import { countSlaOverdue, isInquirySlaOverdue } from "./sla";
import {
	formatStatusLabel,
	type InquiryMetrics,
	type InquiryPagination,
	type InquiryRow,
} from "./types";

type Props = {
	busy: boolean;
	canAuthenticate: boolean;
	pageSize: number;
	rows: InquiryRow[];
	metrics: InquiryMetrics | null;
	pagination: InquiryPagination | null;
	onPageSizeChange: (size: number) => void;
	onLoad: () => void;
	onDownloadCsv: () => void;
	onOpenDetail: (referenceCode: string) => void;
	onChangePage: (page: number) => void;
};

export function InquiryList({
	busy,
	canAuthenticate,
	pageSize,
	rows,
	metrics,
	pagination,
	onPageSizeChange,
	onLoad,
	onDownloadCsv,
	onOpenDetail,
	onChangePage,
}: Props) {
	const { t, formatPercent } = useI18n();
	const overdueCount = countSlaOverdue(rows);

	return (
		<>
			<div className="inquiry-report-actions">
				<label>
					{t("admin.rowsPerPage")}
					<select
						value={pageSize}
						disabled={busy}
						onChange={(event) => onPageSizeChange(Number(event.target.value))}
					>
						<option value={25}>25</option>
						<option value={50}>50</option>
						<option value={100}>100</option>
					</select>
				</label>
				<button type="button" disabled={busy} onClick={onLoad}>
					{t("admin.load")}
				</button>
				<button
					type="button"
					disabled={busy || !canAuthenticate}
					onClick={onDownloadCsv}
				>
					{t("admin.exportCsv")}
				</button>
			</div>

			{overdueCount > 0 && (
				<p className="sla-banner" role="alert">
					{t("admin.slaBanner", { count: overdueCount })}
				</p>
			)}

			{metrics && (
				<section aria-label={t("admin.metricsTitle")}>
					<h2>{t("admin.metricsTitle")}</h2>
					<p>{t("admin.total", { count: metrics.total })}</p>
					<p>
						{t("admin.statusBreakdown", {
							new: metrics.byStatus.new ?? 0,
							contacted: metrics.byStatus.contacted ?? 0,
							qualified: metrics.byStatus.qualified ?? 0,
							closed: metrics.byStatus.closed ?? 0,
						})}
					</p>
					<p>
						{t("admin.rates", {
							contacted: formatPercent(metrics.contactedRate),
							qualified: formatPercent(metrics.qualifiedRate),
						})}
					</p>
					<p>
						{t("admin.averageHours", {
							hours:
								metrics.averageHoursToContacted === null
									? "—"
									: metrics.averageHoursToContacted.toFixed(1),
							qualifiedHours:
								metrics.averageHoursToQualified === null
									? "—"
									: metrics.averageHoursToQualified.toFixed(1),
						})}
					</p>
					<h3>{t("admin.weeklyTrend")}</h3>
					<p>
						{Object.entries(metrics.weeklyTrend)
							.map(([week, count]) => `${week}: ${count}`)
							.join(" · ") || "—"}
					</p>
					<h3>{t("admin.byGeography")}</h3>
					<p>
						{Object.entries(metrics.byGeography)
							.map(([geography, count]) => `${geography}: ${count}`)
							.join(" · ") || "—"}
					</p>
					<h3>{t("admin.byCountry")}</h3>
					<p>
						{Object.entries(metrics.byCountry)
							.map(([value, count]) => `${value}: ${count}`)
							.join(" · ") || "—"}
					</p>
					<h3>{t("admin.bySector")}</h3>
					<p>
						{Object.entries(metrics.bySector)
							.map(([value, count]) => `${value}: ${count}`)
							.join(" · ") || "—"}
					</p>
				</section>
			)}

			<ul aria-label={t("admin.listAria")}>
				{rows.map((row) => {
					const overdue = isInquirySlaOverdue(row);
					return (
						<li key={row.reference_code}>
							<button
								type="button"
								disabled={busy}
								onClick={() => onOpenDetail(row.reference_code)}
							>
								<strong>{row.reference_code}</strong>
							</button>
							{overdue && (
								<span className="sla-badge">{t("admin.slaOverdue")}</span>
							)}
							{" · "}
							{t("admin.row", {
								status: formatStatusLabel(row.status, t),
								country: row.country ?? t("common.countryNotProvided"),
								sector: row.sector ?? t("common.sectorNotProvided"),
								places: row.geography_ids.length,
							})}
						</li>
					);
				})}
			</ul>

			{pagination && (
				<nav aria-label={t("admin.pagesAria")}>
					<p>
						{t("admin.pageInfo", {
							page: pagination.page,
							pages: pagination.totalPages,
							total: pagination.total,
						})}
					</p>
					<button
						type="button"
						disabled={busy || !pagination.hasPrevious}
						onClick={() => onChangePage(pagination.page - 1)}
					>
						{t("admin.previous")}
					</button>
					<button
						type="button"
						disabled={busy || !pagination.hasNext}
						onClick={() => onChangePage(pagination.page + 1)}
					>
						{t("admin.next")}
					</button>
				</nav>
			)}
		</>
	);
}
