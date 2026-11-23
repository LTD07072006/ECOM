"use client";

import { useEffect, useRef, useState } from "react";
import type { SearchNumericFilterSummary } from "../geography/database-repository";
import type { Profile, Geography } from "../geography/types";
import { indicatorGroups } from "../map/layers";
import { useI18n } from "../../lib/i18n/provider";
import {
	formalPlaceName,
	indicatorLabel,
	levelLabel,
	qualityLabel,
	unitLabel,
} from "../../lib/i18n/data-labels";

const searchableIndicators = Object.keys(indicatorGroups);

export function GeoSearch({
	onSelect,
}: {
	onSelect: (profile: Profile) => void;
}) {
	const { t, locale } = useI18n();
	const [query, setQuery] = useState("");
	const [level, setLevel] = useState<"" | Geography["level"]>("");
	const [indicator, setIndicator] = useState("");
	const [period, setPeriod] = useState("");
	const [quality, setQuality] = useState<"" | "verified" | "supported">("");
	const [minVal, setMinVal] = useState("");
	const [maxVal, setMaxVal] = useState("");
	const [results, setResults] = useState<Geography[]>([]);
	const [filterMeta, setFilterMeta] =
		useState<SearchNumericFilterSummary | null>(null);
	const [selected, setSelected] = useState("");
	const [status, setStatus] = useState("");
	const selection = useRef<AbortController | null>(null);
	useEffect(() => () => selection.current?.abort(), []);

	const hasNumericBounds = Boolean(
		indicator &&
			(minVal.trim() !== "" ||
				maxVal.trim() !== "" ||
				period.trim() !== "" ||
				quality !== ""),
	);
	const rangeInvalid = Boolean(
		indicator &&
			minVal.trim() !== "" &&
			maxVal.trim() !== "" &&
			(!Number.isFinite(Number(minVal)) ||
				!Number.isFinite(Number(maxVal)) ||
				Number(minVal) > Number(maxVal)),
	);

	useEffect(() => {
		if (rangeInvalid) {
			setResults([]);
			setFilterMeta(null);
			setStatus(t("search.invalidRange"));
			return;
		}
		const trimmed = query.trim();
		const canQueryByText = trimmed.length >= 2 && query !== selected;
		const canQueryByFilter =
			hasNumericBounds &&
			(trimmed.length === 0 || trimmed.length >= 2) &&
			query !== selected;
		if (!canQueryByText && !canQueryByFilter) {
			if (query !== selected) {
				setResults([]);
				setFilterMeta(null);
				setStatus("");
			}
			return;
		}

		const controller = new AbortController();
		const timer = window.setTimeout(async () => {
			setStatus(t("search.searching"));
			try {
				const params = new URLSearchParams();
				if (trimmed.length >= 2) params.set("q", trimmed);
				if (level) params.set("level", level);
				if (hasNumericBounds && indicator) {
					params.set("indicator", indicator);
					if (minVal.trim() !== "") params.set("min", minVal.trim());
					if (maxVal.trim() !== "") params.set("max", maxVal.trim());
					if (period.trim() !== "") params.set("period", period.trim());
					if (quality) params.set("quality", quality);
				}
				const response = await fetch(`/api/geographies?${params}`, {
					signal: controller.signal,
				});
				if (!response.ok) throw new Error();
				const body: {
					data: Geography[];
					meta?: { numericFilter?: SearchNumericFilterSummary | null };
				} = await response.json();
				if (controller.signal.aborted) return;
				setResults(body.data);
				setFilterMeta(body.meta?.numericFilter ?? null);
				setStatus(
					body.data.length
						? t("search.found", { count: body.data.length })
						: t("search.none"),
				);
			} catch {
				if (!controller.signal.aborted) setStatus(t("search.unavailable"));
			}
		}, 250);
		return () => {
			window.clearTimeout(timer);
			controller.abort();
		};
	}, [
		query,
		selected,
		level,
		indicator,
		period,
		quality,
		minVal,
		maxVal,
		hasNumericBounds,
		rangeInvalid,
		t,
	]);

	async function select(place: Geography) {
		selection.current?.abort();
		const controller = new AbortController();
		selection.current = controller;
		setStatus(t("search.loadingProfile"));
		try {
			const response = await fetch(`/api/geographies/${place.id}`, {
				signal: controller.signal,
			});
			if (!response.ok) throw new Error();
			const body: { data: Profile } = await response.json();
			if (controller.signal.aborted) return;
			onSelect(body.data);
			document.getElementById("geo-search-input")?.focus();
			setSelected(place.displayName);
			setQuery(place.displayName);
			setResults([]);
			setStatus(t("search.profileLoaded", { name: place.displayName }));
		} catch {
			if (!controller.signal.aborted) setStatus(t("search.profileUnavailable"));
		}
	}

	function clearFilters() {
		setLevel("");
		setIndicator("");
		setPeriod("");
		setQuality("");
		setMinVal("");
		setMaxVal("");
		setFilterMeta(null);
		setSelected("");
		if (query.trim().length < 2) {
			setResults([]);
			setStatus("");
		}
	}

	return (
		<div className="geo-search">
			<label htmlFor="geo-search-input">{t("search.label")}</label>
			<input
				id="geo-search-input"
				value={query}
				onChange={(event) => {
					selection.current?.abort();
					setQuery(event.target.value);
					setSelected("");
					setResults([]);
					setStatus("");
				}}
				maxLength={120}
				placeholder={t("search.placeholder")}
				autoComplete="off"
			/>
			<p className="search-status" role="status">
				{status}
			</p>
			{results.length > 0 ? (
				<ul className="search-results">
					{results.map((place) => (
						<li key={place.id}>
							<button type="button" onClick={() => select(place)}>
								<strong>{formalPlaceName(locale, place)}</strong>
								<span>
									{t("search.resultMeta", {
										level: levelLabel(locale, place.level, place),
										parent: place.parentName ?? t("common.vietnam"),
									})}
								</span>
							</button>
						</li>
					))}
				</ul>
			) : null}
			<details className="geo-search-filters">
				<summary>{t("search.filtersToggle")}</summary>
				<div className="layer-filter-row">
					<label>
						{t("search.level")}
						<select
							value={level}
							onChange={(event) => {
								setLevel(event.target.value as "" | Geography["level"]);
								setSelected("");
							}}
						>
							<option value="">{t("search.allLevels")}</option>
							<option value="province">{levelLabel(locale, "province")}</option>
							<option value="commune">{levelLabel(locale, "commune")}</option>
						</select>
					</label>
					<label>
						{t("search.indicator")}
						<select
							value={indicator}
							onChange={(event) => {
								const nextIndicator = event.target.value;
								setIndicator(nextIndicator);
								if (!nextIndicator) {
									setMinVal("");
									setMaxVal("");
									setPeriod("");
									setQuality("");
									setFilterMeta(null);
								}
								setSelected("");
							}}
						>
							<option value="">{t("search.noIndicator")}</option>
							{searchableIndicators.map((code) => (
								<option key={code} value={code}>
									{indicatorLabel(locale, code, code)}
								</option>
							))}
						</select>
					</label>
				</div>
				{indicator && (
					<>
						<div className="layer-filter-row">
							<label>
								{t("search.min")}
								<input
									type="number"
									inputMode="decimal"
									value={minVal}
									onChange={(event) => {
										setMinVal(event.target.value);
										setSelected("");
									}}
								/>
							</label>
							<label>
								{t("search.max")}
								<input
									type="number"
									inputMode="decimal"
									value={maxVal}
									onChange={(event) => {
										setMaxVal(event.target.value);
										setSelected("");
									}}
								/>
							</label>
						</div>
						<div className="layer-filter-row">
							<label>
								{t("search.period")}
								<input
									type="text"
									maxLength={32}
									placeholder="2025"
									value={period}
									onChange={(event) => {
										setPeriod(event.target.value);
										setSelected("");
									}}
								/>
							</label>
							<label>
								{t("search.quality")}
								<select
									value={quality}
									onChange={(event) => {
										setQuality(
											event.target.value as "" | "verified" | "supported",
										);
										setSelected("");
									}}
								>
									<option value="">{t("search.allQuality")}</option>
									<option value="verified">
										{qualityLabel(locale, "verified")}
									</option>
									<option value="supported">
										{qualityLabel(locale, "supported")}
									</option>
								</select>
							</label>
						</div>
					</>
				)}
				{filterMeta && (
					<div className="search-filter-meta" role="status">
						<p className="muted">
							<strong>
								{indicatorLabel(locale, filterMeta.indicator, filterMeta.label)}
							</strong>
							{` (${unitLabel(locale, filterMeta.unit)}${filterMeta.period ? ` · ${filterMeta.period}` : ""})`}
							{filterMeta.definition ? ` — ${filterMeta.definition}` : ""}
						</p>
						<p className="muted">
							{t("search.exclusionSummary", {
								matched: filterMeta.matchedCount,
								missing: filterMeta.excludedMissingCount,
								outOfRange: filterMeta.excludedOutOfRangeCount,
							})}
						</p>
					</div>
				)}
				{(level || indicator || period || quality || minVal || maxVal) && (
					<button type="button" className="text-button" onClick={clearFilters}>
						{t("search.clearFilters")}
					</button>
				)}
			</details>
		</div>
	);
}
