"use client";

import { useMemo, useState } from "react";
import { useI18n } from "../../../lib/i18n/provider";
import { countSlaOverdue, isInquirySlaOverdue } from "./sla";
import {
	formatStatusLabel,
	type InquiryMetrics,
	type InquiryPagination,
	type InquiryRow,
} from "./types";

type SortColumn =
	| "reference_code"
	| "status"
	| "country"
	| "sector"
	| "places"
	| "updated_at";

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

function statusBadgeClass(status: string): string {
	if (status === "qualified") return "status-badge status-badge--success";
	if (status === "contacted") return "status-badge status-badge--info";
	if (status === "new") return "status-badge status-badge--warning";
	return "status-badge";
}

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
	const { t, formatDate, formatPercent } = useI18n();
	const [sortBy, setSortBy] = useState<SortColumn>("updated_at");
	const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
	const overdueCount = countSlaOverdue(rows);

	function toggleSort(column: SortColumn) {
		if (sortBy === column) {
			setSortDir((current) => (current === "asc" ? "desc" : "asc"));
		} else {
			setSortBy(column);
			setSortDir(
				column === "places" || column === "updated_at" ? "desc" : "asc",
			);
		}
	}

	const sortedRows = useMemo(() => {
		const copy = [...rows];
		copy.sort((left, right) => {
			let cmp = 0;
			if (sortBy === "places") {
				cmp = left.geography_ids.length - right.geography_ids.length;
			} else if (sortBy === "updated_at") {
				cmp = left.updated_at.localeCompare(right.updated_at);
			} else if (sortBy === "country") {
				cmp = (left.country ?? "").localeCompare(right.country ?? "");
			} else if (sortBy === "sector") {
				cmp = (left.sector ?? "").localeCompare(right.sector ?? "");
			} else {
				cmp = left[sortBy].localeCompare(right[sortBy]);
			}
			return sortDir === "asc" ? cmp : -cmp;
		});
		return copy;
	}, [rows, sortBy, sortDir]);

	return (
		<section className="inquiry-list-panel" aria-label={t("admin.listAria")}>
			<div className="action-row">
				<label className="form-field">
					{t("admin.rowsPerPage")}
					<select
						className="control-select"
						value={pageSize}
						disabled={busy}
						onChange={(event) => onPageSizeChange(Number(event.target.value))}
					>
						<option value={25}>25</option>
						<option value={50}>50</option>
						<option value={100}>100</option>
					</select>
				</label>
				<button
					type="button"
					className="btn btn-primary"
					disabled={busy}
					onClick={onLoad}
				>
					{t("admin.load")}
				</button>
				<button
					type="button"
					className="btn btn-secondary"
					disabled={busy || !canAuthenticate}
					onClick={onDownloadCsv}
				>
					{t("admin.exportCsv")}
				</button>
			</div>

			{overdueCount > 0 && (
				<p className="banner banner--error" role="alert">
					<span>{t("admin.slaBanner", { count: overdueCount })}</span>
				</p>
			)}

			{metrics && (
				<section aria-label={t("admin.metricsTitle")}>
					<h2>{t("admin.metricsTitle")}</h2>
					<dl className="release-metrics">
						<div>
							<dt>{t("reports.totalInquiry")}</dt>
							<dd>{metrics.total}</dd>
						</div>
						<div>
							<dt>{t("admin.new")}</dt>
							<dd>{metrics.byStatus.new ?? 0}</dd>
						</div>
						<div>
							<dt>{t("admin.contacted")}</dt>
							<dd>
								{metrics.byStatus.contacted ?? 0} (
								{formatPercent(metrics.contactedRate)})
							</dd>
						</div>
						<div>
							<dt>{t("admin.qualified")}</dt>
							<dd>
								{metrics.byStatus.qualified ?? 0} (
								{formatPercent(metrics.qualifiedRate)})
							</dd>
						</div>
						<div>
							<dt>{t("admin.closed")}</dt>
							<dd>{metrics.byStatus.closed ?? 0}</dd>
						</div>
					</dl>
					<p className="muted tabular-nums">
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
				</section>
			)}

			<div className="data-table-wrap">
				<table className="data-table" aria-label={t("admin.listAria")}>
					<thead>
						<tr>
							<th
								scope="col"
								aria-sort={
									sortBy === "reference_code"
										? sortDir === "asc"
											? "ascending"
											: "descending"
										: "none"
								}
							>
								<button
									type="button"
									className="table-sort-btn"
									onClick={() => toggleSort("reference_code")}
								>
									{t("reports.referenceCode")}
								</button>
							</th>
							<th
								scope="col"
								aria-sort={
									sortBy === "status"
										? sortDir === "asc"
											? "ascending"
											: "descending"
										: "none"
								}
							>
								<button
									type="button"
									className="table-sort-btn"
									onClick={() => toggleSort("status")}
								>
									{t("admin.status")}
								</button>
							</th>
							<th
								scope="col"
								aria-sort={
									sortBy === "country"
										? sortDir === "asc"
											? "ascending"
											: "descending"
										: "none"
								}
							>
								<button
									type="button"
									className="table-sort-btn"
									onClick={() => toggleSort("country")}
								>
									{t("admin.country")}
								</button>
							</th>
							<th
								scope="col"
								aria-sort={
									sortBy === "sector"
										? sortDir === "asc"
											? "ascending"
											: "descending"
										: "none"
								}
							>
								<button
									type="button"
									className="table-sort-btn"
									onClick={() => toggleSort("sector")}
								>
									{t("admin.sector")}
								</button>
							</th>
							<th
								scope="col"
								className="num"
								aria-sort={
									sortBy === "places"
										? sortDir === "asc"
											? "ascending"
											: "descending"
										: "none"
								}
							>
								<button
									type="button"
									className="table-sort-btn"
									onClick={() => toggleSort("places")}
								>
									{t("status.placesAttached")}
								</button>
							</th>
							<th
								scope="col"
								aria-sort={
									sortBy === "updated_at"
										? sortDir === "asc"
											? "ascending"
											: "descending"
										: "none"
								}
							>
								<button
									type="button"
									className="table-sort-btn"
									onClick={() => toggleSort("updated_at")}
								>
									{t("status.updatedAt")}
								</button>
							</th>
						</tr>
					</thead>
					<tbody>
						{sortedRows.map((row) => {
							const overdue = isInquirySlaOverdue(row);
							return (
								<tr key={row.reference_code}>
									<th scope="row">
										<div className="action-row">
											<button
												type="button"
												className="btn btn-quiet btn-sm"
												disabled={busy}
												onClick={() => onOpenDetail(row.reference_code)}
											>
												<strong>{row.reference_code}</strong>
											</button>
											{overdue && (
												<span className="status-badge status-badge--error">
													{t("admin.slaOverdue")}
												</span>
											)}
										</div>
									</th>
									<td>
										<span className={statusBadgeClass(row.status)}>
											{formatStatusLabel(row.status, t)}
										</span>
									</td>
									<td>{row.country ?? t("common.countryNotProvided")}</td>
									<td>{row.sector ?? t("common.sectorNotProvided")}</td>
									<td className="num">{row.geography_ids.length}</td>
									<td>{formatDate(row.updated_at, { includeTime: true })}</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			{pagination && (
				<nav
					className="action-row action-row--split"
					aria-label={t("admin.pagesAria")}
				>
					<p className="muted tabular-nums">
						{t("admin.pageInfo", {
							page: pagination.page,
							pages: pagination.totalPages,
							total: pagination.total,
						})}
					</p>
					<div className="action-row">
						<button
							type="button"
							className="btn btn-secondary btn-sm"
							disabled={busy || !pagination.hasPrevious}
							onClick={() => onChangePage(pagination.page - 1)}
						>
							{t("admin.previous")}
						</button>
						<button
							type="button"
							className="btn btn-secondary btn-sm"
							disabled={busy || !pagination.hasNext}
							onClick={() => onChangePage(pagination.page + 1)}
						>
							{t("admin.next")}
						</button>
					</div>
				</nav>
			)}
		</section>
	);
}
