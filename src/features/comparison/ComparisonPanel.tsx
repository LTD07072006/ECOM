"use client";

import { useEffect, useState } from "react";
import type { Profile } from "../geography/types";
import { useI18n } from "../../lib/i18n/provider";
import { indicatorLabel, unitLabel } from "../../lib/i18n/data-labels";
import { computeComparisonRowMetrics } from "./metrics";

type Comparison = {
	compatible: boolean;
	reason: string | null;
	reasonCode?: string | null;
	rows: Array<{
		indicator: string;
		label: string;
		unit: string;
		reason?: string | null;
		reasonCode?: string | null;
		values: Array<number | null>;
	}>;
};

export function ComparisonPanel({
	ids,
	onClose,
}: {
	ids: string[];
	onClose: () => void;
}) {
	const { t, tc, locale, formatNumber } = useI18n();
	const [period, setPeriod] = useState("");
	const key = `${ids.join(",")}|${period}`;
	const [result, setResult] = useState<
		| {
				key: string;
				data: { profiles: Profile[]; comparison: Comparison };
				availablePeriods: string[];
		  }
		| { key: string; error: string }
	>();
	const [baselineId, setBaselineId] = useState("");
	const [shareStatus, setShareStatus] = useState<
		"share.copied" | "share.failed" | null
	>(null);

	useEffect(() => {
		const controller = new AbortController();
		const idsParam = ids.join(",");
		const requestKey = `${idsParam}|${period}`;
		setResult(undefined);
		setBaselineId("");
		setShareStatus(null);
		const params = new URLSearchParams({ ids: idsParam });
		if (period) params.set("period", period);
		fetch(`/api/geographies/compare?${params}`, {
			signal: controller.signal,
		})
			.then(async (response) => {
				const body = await response.json();
				if (!response.ok)
					throw new Error(body.error ?? t("comparison.unavailable"));
				return {
					data: body.data,
					availablePeriods: Array.isArray(body.meta?.availablePeriods)
						? (body.meta.availablePeriods as string[])
						: [],
				};
			})
			.then(({ data, availablePeriods }) => {
				if (!controller.signal.aborted)
					setResult({ key: requestKey, data, availablePeriods });
			})
			.catch((reason: unknown) => {
				if (!controller.signal.aborted)
					setResult({
						key: requestKey,
						error:
							reason instanceof Error
								? reason.message
								: t("comparison.unavailable"),
					});
			});
		return () => controller.abort();
	}, [ids, period, t]);

	async function copyLink() {
		try {
			const url = new URL(window.location.href);
			url.searchParams.set("compare", ids.join(","));
			await navigator.clipboard.writeText(url.toString());
			setShareStatus("share.copied");
		} catch {
			setShareStatus("share.failed");
		}
	}

	const current = result?.key === key ? result : undefined;
	const error = current && "error" in current ? current.error : null;
	const { profiles, comparison } =
		current && "data" in current
			? current.data
			: { profiles: [], comparison: null };
	const availablePeriods =
		current && "availablePeriods" in current ? current.availablePeriods : [];
	const resolvedBaselineIndex = Math.max(
		0,
		profiles.findIndex((profile) => profile.id === baselineId),
	);

	return (
		<section className="comparison-panel" aria-label={t("comparison.aria")}>
			<div className="comparison-heading">
				<div>
					<span className="map-label">{t("comparison.eyebrow")}</span>
					<h2>{t("comparison.title")}</h2>
				</div>
				<div className="shortlist-actions">
					<button
						type="button"
						className="text-button"
						onClick={() => void copyLink()}
					>
						{t("comparison.share")}
					</button>
					<button type="button" className="text-button" onClick={onClose}>
						{t("common.close")}
					</button>
				</div>
			</div>
			{shareStatus && (
				<p className="muted" role="status">
					{t(shareStatus)}
				</p>
			)}
			{error ? (
				<p className="state-message">{error}</p>
			) : !comparison ? (
				<p className="state-message">{t("comparison.loading")}</p>
			) : (
				<>
					{!comparison.compatible ? (
						<p className="state-message">
							{tc(comparison.reasonCode, comparison.reason)}
						</p>
					) : (
						<p className="comparison-note">{t("comparison.note")}</p>
					)}
					{profiles.length >= 2 && (
						<div className="comparison-toolbar">
							<label>
								{t("comparison.baseline")}
								<select
									value={profiles[resolvedBaselineIndex]?.id ?? ""}
									onChange={(event) => setBaselineId(event.target.value)}
								>
									{profiles.map((profile) => (
										<option key={profile.id} value={profile.id}>
											{profile.displayName}
										</option>
									))}
								</select>
							</label>
							{availablePeriods.length > 0 && (
								<label>
									{t("comparison.period")}
									<select
										value={period}
										onChange={(event) => setPeriod(event.target.value)}
									>
										<option value="">{t("comparison.latestCommon")}</option>
										{availablePeriods.map((item) => (
											<option key={item} value={item}>
												{item}
											</option>
										))}
									</select>
								</label>
							)}
						</div>
					)}
					<div className="comparison-table-wrap">
						<table className="comparison-table">
							<thead>
								<tr>
									<th scope="col">{t("comparison.indicator")}</th>
									{profiles.map((profile) => (
										<th scope="col" key={profile.id}>
											{profile.displayName}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{comparison.rows.map((row) => {
									const presentCount = row.values.filter(
										(value) => value !== null,
									).length;
									const rowPeriod =
										profiles
											.map(
												(profile) =>
													profile.observations.find(
														(obs) => obs.indicator === row.indicator,
													)?.period,
											)
											.find(Boolean) ?? null;
									const stats = row.reason
										? null
										: computeComparisonRowMetrics(
												row.values,
												resolvedBaselineIndex,
												row.unit,
											);
									return (
										<tr key={row.indicator}>
											<th scope="row">
												{indicatorLabel(locale, row.indicator, row.label)}
												<small>
													{unitLabel(locale, row.unit)}
													{rowPeriod ? ` · ${rowPeriod}` : ""}
													{` · ${presentCount}/${row.values.length}`}
												</small>
												{row.reason && (
													<small>{tc(row.reasonCode, row.reason)}</small>
												)}
											</th>
											{row.values.map((value, index) => {
												const stat = stats?.[index];
												const deltaClass =
													stat?.delta == null
														? ""
														: stat.delta > 0
															? "positive"
															: stat.delta < 0
																? "negative"
																: "";
												const signedDelta =
													stat?.delta == null
														? ""
														: `${stat.delta > 0 ? "+" : ""}${formatNumber(Number(stat.delta.toFixed(2)))}`;
												const signedPct =
													stat?.deltaPercent == null
														? ""
														: `${stat.deltaPercent > 0 ? "+" : ""}${formatNumber(Number(stat.deltaPercent.toFixed(1)))}`;

												return (
													<td
														key={`${row.indicator}-${profiles[index]?.id ?? index}`}
													>
														{value === null ? (
															<span className="unavailable">
																{t("common.unavailable")}
															</span>
														) : (
															<div className="compare-cell">
																<span>{formatNumber(value)}</span>
																{stat && stat.barPercent > 0 && (
																	<div
																		className="compare-bar-track"
																		aria-hidden="true"
																	>
																		<span
																			className={`compare-bar-fill${stat.isBaseline ? " baseline" : ""}`}
																			style={{ width: `${stat.barPercent}%` }}
																		/>
																	</div>
																)}
																{stat?.isBaseline ? (
																	<small className="compare-delta">
																		{t("comparison.baselineBadge")}
																	</small>
																) : stat?.delta != null ? (
																	<small
																		className={`compare-delta ${deltaClass}`}
																	>
																		{stat.deltaKind === "pp"
																			? t("comparison.deltaPp", {
																					delta: signedDelta,
																				})
																			: stat.deltaKind === "pct" &&
																					stat.deltaPercent != null
																				? t("comparison.deltaPct", {
																						delta: signedDelta,
																						percent: signedPct,
																					})
																				: t("comparison.deltaOnly", {
																						delta: signedDelta,
																					})}
																	</small>
																) : null}
															</div>
														)}
													</td>
												);
											})}
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				</>
			)}
		</section>
	);
}
