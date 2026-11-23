"use client";

import { useI18n } from "../../../lib/i18n/provider";
import {
	formatAuditAction,
	formatFilterSummary,
	formatReportPeriod,
	type SnapshotRecord,
} from "./types";

type Props = {
	busy: boolean;
	canAuthenticate: boolean;
	snapshots: SnapshotRecord[];
	snapshotsLoaded: boolean;
	selectedSnapshot: SnapshotRecord | null;
	compareId: string;
	geographyNames: Record<string, string>;
	onRefreshHistory: () => void;
	onOpenSnapshot: (snapshotId: string) => void;
	onExportSnapshot: (snapshotId: string) => void;
	onCreateCorrection: () => void;
	onCompareIdChange: (snapshotId: string) => void;
	onCompareSnapshot: () => void;
};

export function SnapshotHistory({
	busy,
	canAuthenticate,
	snapshots,
	snapshotsLoaded,
	selectedSnapshot,
	compareId,
	geographyNames,
	onRefreshHistory,
	onOpenSnapshot,
	onExportSnapshot,
	onCreateCorrection,
	onCompareIdChange,
	onCompareSnapshot,
}: Props) {
	const { t, formatDate } = useI18n();
	const reportDate = (value: string, timeZone: string, includeTime = false) =>
		formatDate(value, { timeZone, includeTime });

	return (
		<>
			<section aria-label={t("reports.history")}>
				<div className="action-row action-row--split">
					<h2>{t("reports.history")}</h2>
					<button
						type="button"
						className="btn btn-secondary btn-sm"
						disabled={busy || !canAuthenticate}
						onClick={onRefreshHistory}
					>
						{t("reports.loadHistory")}
					</button>
				</div>
				{snapshots.length > 0 ? (
					<div
						className="data-table-wrap"
						role="region"
						aria-label={t("reports.tableAria")}
						// biome-ignore lint/a11y/noNoninteractiveTabindex: vùng bảng cuộn phải focus được bằng bàn phím (WCAG 2.1.1)
						tabIndex={0}
					>
						<table className="data-table">
							<thead>
								<tr>
									<th scope="col">{t("reports.periodCol")}</th>
									<th scope="col">{t("reports.typeCol")}</th>
									<th scope="col">{t("reports.createdCol")}</th>
									<th scope="col" className="num">
										{t("reports.totalCol")}
									</th>
									<th scope="col">{t("reports.csvCol")}</th>
								</tr>
							</thead>
							<tbody>
								{snapshots.map((snapshot) => (
									<tr
										key={snapshot.snapshot_id}
										data-testid={`snapshot-row-${snapshot.snapshot_id}`}
									>
										<th scope="row">
											<button
												type="button"
												className="btn btn-quiet btn-sm"
												disabled={busy}
												onClick={() => onOpenSnapshot(snapshot.snapshot_id)}
											>
												{formatReportPeriod(snapshot, formatDate)}
											</button>
										</th>
										<td>
											{snapshot.corrects_snapshot_id
												? t("reports.correction")
												: t("reports.original")}
										</td>
										<td>
											{reportDate(
												snapshot.created_at,
												snapshot.time_zone,
												true,
											)}
										</td>
										<td className="num">{snapshot.metrics.total}</td>
										<td>
											<button
												type="button"
												className="btn btn-secondary btn-sm"
												disabled={busy}
												onClick={() => onExportSnapshot(snapshot.snapshot_id)}
											>
												{t("reports.exportStored")}
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				) : (
					<p className="muted">
						{snapshotsLoaded ? t("reports.noReports") : t("reports.tokenFirst")}
					</p>
				)}
			</section>

			{selectedSnapshot && (
				<article aria-label={t("reports.snapshotAria")}>
					<h2>
						{formatReportPeriod(selectedSnapshot, formatDate)} ·{" "}
						{selectedSnapshot.corrects_snapshot_id
							? t("reports.correction")
							: t("reports.original")}
					</h2>
					<dl className="inquiry-report-meta">
						<dt>{t("reports.filters")}</dt>
						<dd>
							{formatFilterSummary(selectedSnapshot.filters, geographyNames, t)}
						</dd>
						<dt>{t("reports.savedTotal")}</dt>
						<dd>{selectedSnapshot.metrics.total}</dd>
						<dt>{t("reports.formulaVersion")}</dt>
						<dd>{selectedSnapshot.formula_version}</dd>
						<dt>{t("reports.timeZone")}</dt>
						<dd>{selectedSnapshot.time_zone}</dd>
						<dt>{t("reports.reportId")}</dt>
						<dd>
							<code>{selectedSnapshot.snapshot_id}</code>
						</dd>
						{selectedSnapshot.corrects_snapshot_id && (
							<>
								<dt>{t("reports.correctsFor")}</dt>
								<dd>
									<button
										type="button"
										className="btn btn-quiet btn-sm"
										disabled={busy}
										onClick={() => {
											if (selectedSnapshot.corrects_snapshot_id)
												onOpenSnapshot(selectedSnapshot.corrects_snapshot_id);
										}}
									>
										{t("reports.openCorrected")}
									</button>
								</dd>
							</>
						)}
					</dl>
					<div className="action-row">
						<button
							type="button"
							className="btn btn-secondary btn-sm"
							disabled={busy}
							onClick={onCreateCorrection}
						>
							{t("reports.createCorrection")}
						</button>
						<label className="form-field">
							{t("reports.compareWith")}
							<select
								className="control-select"
								value={compareId}
								disabled={busy}
								onChange={(event) => onCompareIdChange(event.target.value)}
							>
								<option value="">{t("reports.choosePeriod")}</option>
								{snapshots
									.filter(
										(snapshot) =>
											snapshot.snapshot_id !== selectedSnapshot.snapshot_id,
									)
									.map((snapshot) => (
										<option
											key={snapshot.snapshot_id}
											value={snapshot.snapshot_id}
										>
											{formatReportPeriod(snapshot, formatDate)} ·{" "}
											{snapshot.corrects_snapshot_id
												? t("reports.correction")
												: t("reports.original")}{" "}
											·{" "}
											{reportDate(
												snapshot.created_at,
												snapshot.time_zone,
												true,
											)}
										</option>
									))}
							</select>
						</label>
						<button
							type="button"
							className="btn btn-primary btn-sm"
							disabled={!compareId || busy}
							onClick={onCompareSnapshot}
						>
							{t("reports.compare")}
						</button>
					</div>
					<h3>{t("reports.auditLog")}</h3>
					<ol className="inquiry-audit-list">
						{(selectedSnapshot.audit ?? []).map((event) => (
							<li key={event.event_id}>
								<span className="status-badge">
									{formatAuditAction(event.action, t)}
								</span>{" "}
								· {event.actor} ·{" "}
								{reportDate(
									event.happened_at,
									selectedSnapshot.time_zone,
									true,
								)}
							</li>
						))}
					</ol>
				</article>
			)}
		</>
	);
}
