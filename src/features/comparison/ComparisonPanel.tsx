"use client";

import { useEffect, useRef, useState } from "react";
import type { Profile } from "../geography/types";
import { useI18n } from "../../lib/i18n/provider";
import {
	formalPlaceName,
	indicatorLabel,
	unitLabel,
} from "../../lib/i18n/data-labels";
import { indicatorGroups } from "../map/layers";
import { COMPARISON_LIMIT } from "../shortlist/store";
import { computeComparisonRowMetrics } from "./metrics";
import { IndicatorTrend } from "../profile/IndicatorTrend";

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

const orderedIndicators = Object.keys(indicatorGroups);

export function ComparisonPanel({
	ids,
	onClose,
}: {
	ids: string[];
	onClose: () => void;
}) {
	const { t, tc, locale, formatNumber } = useI18n();
	const tRef = useRef(t);
	tRef.current = t;
	const onCloseRef = useRef(onClose);
	onCloseRef.current = onClose;
	const panelRef = useRef<HTMLElement | null>(null);
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
		const previousFocus = document.activeElement as HTMLElement | null;
		panelRef.current?.focus();

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				event.preventDefault();
				onCloseRef.current();
			}
		}

		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			previousFocus?.focus();
		};
	}, []);

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
				const body = (await response.json().catch(() => null)) as {
					data?: { profiles: Profile[]; comparison: Comparison };
					meta?: { availablePeriods?: unknown };
					error?: string;
				} | null;
				if (!response.ok || !body?.data)
					throw new Error(
						body?.error ?? tRef.current("comparison.unavailable"),
					);
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
								: tRef.current("comparison.unavailable"),
					});
			});
		return () => controller.abort();
	}, [ids, period]);

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

	const sortedRows = comparison
		? [...comparison.rows].sort((left, right) => {
				const leftIdx = orderedIndicators.indexOf(left.indicator);
				const rightIdx = orderedIndicators.indexOf(right.indicator);
				const a = leftIdx === -1 ? Number.MAX_SAFE_INTEGER : leftIdx;
				const b = rightIdx === -1 ? Number.MAX_SAFE_INTEGER : rightIdx;
				return a - b;
			})
		: [];

	return (
		<section
			ref={panelRef}
			className="comparison-panel"
			aria-label={t("comparison.aria")}
			tabIndex={-1}
		>
			<div className="comparison-heading">
				<div>
					<h2>{t("comparison.title")}</h2>
					<span className="muted tabular-nums">
						{t("comparison.capacity", {
							count: ids.length,
							max: COMPARISON_LIMIT,
						})}
					</span>
				</div>
				<div className="action-row">
					<button
						type="button"
						className="btn btn-secondary btn-sm"
						onClick={() => void copyLink()}
					>
						{t("comparison.share")}
					</button>
					<button
						type="button"
						className="btn btn-secondary btn-sm"
						onClick={onClose}
					>
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
				<p className="banner banner--error">{error}</p>
			) : !comparison ? (
				<p className="muted">{t("comparison.loading")}</p>
			) : (
				<>
					{!comparison.compatible ? (
						<p className="banner banner--warning">
							{tc(comparison.reasonCode, comparison.reason)}
						</p>
					) : (
						<p className="muted">{t("comparison.note")}</p>
					)}
					{profiles.length >= 2 && (
						<div className="comparison-toolbar">
							<label className="form-field">
								{t("comparison.baseline")}
								<select
									className="control-select"
									value={profiles[resolvedBaselineIndex]?.id ?? ""}
									onChange={(event) => setBaselineId(event.target.value)}
								>
									{profiles.map((profile) => (
										<option key={profile.id} value={profile.id}>
											{formalPlaceName(locale, profile)}
										</option>
									))}
								</select>
							</label>
							{availablePeriods.length > 0 && (
								<label className="form-field">
									{t("comparison.period")}
									<select
										className="control-select"
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
					<div className="data-table-wrap">
						<table className="data-table">
							<thead>
								<tr>
									<th scope="col">{t("comparison.indicator")}</th>
									{profiles.map((profile) => (
										<th scope="col" className="num" key={profile.id}>
											{formalPlaceName(locale, profile)}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								{sortedRows.map((row) => {
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
												<div>
													{indicatorLabel(locale, row.indicator, row.label)}
												</div>
												<small className="muted">
													{unitLabel(locale, row.unit)}
													{rowPeriod ? ` · ${rowPeriod}` : ""}
													{` · ${presentCount}/${row.values.length}`}
												</small>
												{row.reason && (
													<small className="decision-mismatch">
														{tc(row.reasonCode, row.reason)}
													</small>
												)}
											</th>
											{row.values.map((value, index) => {
												const observation = profiles[index]?.observations.find(
													(item) => item.indicator === row.indicator,
												);
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
														className="num"
														key={`${row.indicator}-${profiles[index]?.id ?? index}`}
													>
														{value === null ? (
															<span className="unavailable">
																{t("common.unavailable")}
															</span>
														) : (
															<div className="compare-cell">
																<span className="tabular-nums">
																	{formatNumber(value)}
																</span>
																{!row.reason && observation && (
																	<IndicatorTrend observation={observation} />
																)}
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
