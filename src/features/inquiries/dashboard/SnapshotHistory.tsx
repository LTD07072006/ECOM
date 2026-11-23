"use client";

import { useI18n } from "../../../lib/i18n/provider";
import {
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
				<div className="inquiry-report-actions">
					<h2>{t("reports.history")}</h2>
					<button
						type="button"
						disabled={busy || !canAuthenticate}
						onClick={onRefreshHistory}
					>
						{t("reports.loadHistory")}
					</button>
				</div>
				{snapshots.length > 0 ? (
					<div
						className="inquiry-report-scroll"
						role="region"
						aria-label={t("reports.tableAria")}
						// biome-ignore lint/a11y/noNoninteractiveTabindex: vùng bảng cuộn phải focus được bằng bàn phím (WCAG 2.1.1)
						tabIndex={0}
					>
						<table>
							<thead>
								<tr>
									<th scope="col">{t("reports.periodCol")}</th>
									<th scope="col">{t("reports.typeCol")}</th>
									<th scope="col">{t("reports.createdCol")}</th>
									<th scope="col">{t("reports.totalCol")}</th>
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
										<td>{snapshot.metrics.total}</td>
										<td>
											<button
												type="button"
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
					<p>
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
					<div className="inquiry-report-actions">
						<button type="button" disabled={busy} onClick={onCreateCorrection}>
							{t("reports.createCorrection")}
						</button>
						<label>
							{t("reports.compareWith")}
							<select
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
							disabled={!compareId || busy}
							onClick={onCompareSnapshot}
						>
							{t("reports.compare")}
						</button>
					</div>
					<h3>{t("reports.auditLog")}</h3>
					<ol>
						{(selectedSnapshot.audit ?? []).map((event) => (
							<li key={event.event_id}>
								{event.action} · {event.actor} ·{" "}
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
