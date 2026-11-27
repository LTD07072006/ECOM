"use client";

import { useMemo, useState } from "react";
import { useI18n } from "../../lib/i18n/provider";
import {
	filterLogisticsMatrix,
	type LogisticsMatrixLeg,
	type LogisticsMatrixRow,
	toLogisticsMatrixRows,
} from "../map/logistics-matrix";
import type { LogisticsDestination } from "../map/logistics-network";

export function LogisticsMatrix({
	destinations,
	legs,
	onDestinationSelect,
}: {
	destinations: readonly LogisticsDestination[];
	legs: readonly LogisticsMatrixLeg[];
	onDestinationSelect?: (destinationCode: string) => void;
}) {
	const { t } = useI18n();
	const [kind, setKind] = useState<LogisticsDestination["kind"] | "">("");
	const [status, setStatus] = useState<LogisticsMatrixLeg["status"] | "">("");
	const [selected, setSelected] = useState<LogisticsMatrixRow | null>(null);
	const rows = useMemo(
		() =>
			filterLogisticsMatrix(toLogisticsMatrixRows(destinations, legs), {
				kind: kind || undefined,
				status: status || undefined,
			}),
		[destinations, kind, legs, status],
	);

	return (
		<section
			className="site-visit-matrix"
			aria-labelledby="site-visit-matrix-title"
		>
			<div className="site-visit-matrix-heading">
				<div>
					<p className="site-visit-kicker">Route matrix</p>
					<h2 id="site-visit-matrix-title">Site connections</h2>
					<details className="site-visit-route-status-help">
						<summary>{t("siteVisit.routeStatus")}</summary>
						<div>
							<p>{t("siteVisit.routeStatus.live")}</p>
							<p>{t("siteVisit.routeStatus.baseline")}</p>
							<p>{t("siteVisit.routeStatus.unavailable")}</p>
							<small>{t("siteVisit.routeStatus.advisory")}</small>
						</div>
					</details>
				</div>
				<div className="site-visit-matrix-filters">
					<label>
						<span>Kind</span>
						<select
							value={kind}
							onChange={(event) => setKind(event.target.value as typeof kind)}
						>
							<option value="">All kinds</option>
							<option value="airport">Airport</option>
							<option value="seaport">Seaport</option>
							<option value="icd">ICD</option>
							<option value="expressway_node">Expressway</option>
						</select>
					</label>
					<label>
						<span>Status</span>
						<select
							value={status}
							onChange={(event) =>
								setStatus(event.target.value as typeof status)
							}
						>
							<option value="">All statuses</option>
							<option value="live">Live</option>
							<option value="baseline">Baseline</option>
							<option value="unavailable">Unavailable</option>
						</select>
					</label>
				</div>
			</div>
			<div className="site-visit-matrix-scroll">
				<table>
					<caption className="sr-only">Site route matrix</caption>
					<thead>
						<tr>
							<th scope="col">Destination</th>
							<th scope="col">Kind</th>
							<th scope="col">Status</th>
							<th scope="col">Distance</th>
							<th scope="col">Duration</th>
							<th scope="col">Provider</th>
						</tr>
					</thead>
					<tbody>
						{rows.length === 0 ? (
							<tr>
								<td colSpan={6} className="site-visit-table-empty">
									{t("siteVisit.noMatchingRoutes")}
								</td>
							</tr>
						) : (
							rows.map((row) => (
								<tr key={row.destinationCode}>
									<th scope="row">
										<button
											type="button"
											className="site-visit-matrix-link"
											data-destination-code={row.destinationCode}
											aria-current={
												selected?.destinationCode === row.destinationCode
											}
											onClick={() => {
												setSelected(row);
												onDestinationSelect?.(row.destinationCode);
											}}
										>
											{row.name}
										</button>
										<small>{row.provinceName}</small>
									</th>
									<td>{row.kind}</td>
									<td>
										<span
											className={`site-visit-status-chip site-visit-status-chip--${row.status}`}
										>
											{row.status}
										</span>
									</td>
									<td>
										{row.distanceMeters == null
											? "—"
											: `${Math.round(row.distanceMeters / 100) / 10} km`}
									</td>
									<td>
										{row.durationSeconds == null
											? "—"
											: `${Math.round(row.durationSeconds / 60)} min`}
									</td>
									<td>{row.provider ?? "—"}</td>
								</tr>
							))
						)}
					</tbody>
				</table>
			</div>
			{selected && (
				<LogisticsLegDetail row={selected} onClose={() => setSelected(null)} />
			)}
		</section>
	);
}

function LogisticsLegDetail({
	row,
	onClose,
}: {
	row: LogisticsMatrixRow;
	onClose: () => void;
}) {
	return (
		<aside className="site-visit-leg-detail" aria-label="Route detail">
			<div>
				<h3>{row.name}</h3>
				<button type="button" onClick={onClose} aria-label="Close route detail">
					×
				</button>
			</div>
			<p>
				{row.status} · {row.provider ?? "No provider"}
			</p>
			{row.fallback && (
				<p>
					Fallback based on dated evidence:{" "}
					{row.observedOn ?? "date unavailable"}
				</p>
			)}
			{row.errorCategory && <p>Unavailable reason: {row.errorCategory}</p>}
			{row.sourceUrl && (
				<a href={row.sourceUrl} target="_blank" rel="noreferrer">
					Open source
				</a>
			)}
			<small>
				Advisory estimate only; not a traffic, truck-access, or investment
				guarantee.
			</small>
		</aside>
	);
}
