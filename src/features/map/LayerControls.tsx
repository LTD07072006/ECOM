"use client";

import { useState } from "react";
import {
	colorScale,
	indicatorGroups,
	infrastructureKindColors,
	infrastructureKindOrder,
	missingColor,
	sourcesAreComparable,
	type InfrastructureKind,
	type MapLayers,
	type StatisticalLayer,
} from "./layers";
import type { LayerFilterSummary } from "./filters";
import {
	catchmentFacilities,
	catchmentRadii,
	type CatchmentCenter,
	type ProvinceProximityMatch,
} from "./proximity";
import { useI18n } from "../../lib/i18n/provider";
import {
	indicatorLabel,
	qualityLabel,
	scopeLabel,
	unitLabel,
} from "../../lib/i18n/data-labels";
import type { MessageKey } from "../../lib/i18n";

function groupMessageKey(code: string): MessageKey {
	const group = indicatorGroups[code] ?? "other";
	return `layers.group.${group}` as MessageKey;
}

function SourceDetails({ layer }: { layer: StatisticalLayer }) {
	const { t, locale } = useI18n();
	const covered = Object.values(layer.values).filter(
		(value) => value !== null,
	).length;
	return (
		<article className="layer-source">
			<strong>{indicatorLabel(locale, layer.indicator, layer.label)}</strong>
			<a href={layer.dataset.source.url ?? undefined}>
				{layer.dataset.source.title}
			</a>
			<dl className="dataset-details">
				<div>
					<dt>{t("layers.publisher")}</dt>
					<dd>{layer.dataset.source.publisher}</dd>
				</div>
				<div>
					<dt>{t("layers.version")}</dt>
					<dd>{layer.dataset.version}</dd>
				</div>
				<div>
					<dt>{t("layers.period")}</dt>
					<dd>{layer.period}</dd>
				</div>
				<div>
					<dt>{t("layers.geography")}</dt>
					<dd>{layer.geographyVersion}</dd>
				</div>
				<div>
					<dt>{t("layers.unit")}</dt>
					<dd>{unitLabel(locale, layer.unit)}</dd>
				</div>
				<div>
					<dt>{t("layers.scope")}</dt>
					<dd>{scopeLabel(locale, layer.scope)}</dd>
				</div>
				<div>
					<dt>{t("layers.coverage")}</dt>
					<dd>{t("layers.covered", { count: covered })}</dd>
				</div>
				<div>
					<dt>{t("layers.license")}</dt>
					<dd>{layer.dataset.source.license}</dd>
				</div>
				<div>
					<dt>{t("layers.review")}</dt>
					<dd>
						{layer.dataset.freshness === "review_due"
							? t("layers.due")
							: t("layers.current")}{" "}
						· {layer.dataset.reviewDueAt.slice(0, 10)}
					</dd>
				</div>
			</dl>
			<p>{layer.definition}</p>
			<p>{layer.method}</p>
			<p>{layer.limitations}</p>
		</article>
	);
}

function SourceComparison({
	layers,
	active,
	province,
}: {
	layers: StatisticalLayer[];
	active: StatisticalLayer | null;
	province: { id: string; name: string } | null;
}) {
	const { t, locale, formatNumber } = useI18n();
	const [firstId, setFirstId] = useState("");
	const [secondId, setSecondId] = useState("");
	const first =
		layers.find((item) => item.id === firstId) ?? active ?? layers[0];
	const others = layers.filter((item) => item.id !== first?.id);
	const second =
		others.find((item) => item.id === secondId) ??
		others.find((item) => item.indicator === first?.indicator) ??
		others[0];
	if (!first || !second) return null;
	const comparable = sourcesAreComparable(first, second);
	const firstValue = province ? first.values[province.id] : null;
	const secondValue = province ? second.values[province.id] : null;
	const option = (layer: StatisticalLayer) =>
		`${indicatorLabel(locale, layer.indicator, layer.label)} · ${layer.period} · ${layer.dataset.version}`;

	return (
		<details className="layer-comparison">
			<summary>{t("layers.compareSources")}</summary>
			<label>
				{t("layers.firstSource")}
				<select
					value={first.id}
					onChange={(event) => setFirstId(event.target.value)}
				>
					{layers.map((item) => (
						<option key={item.id} value={item.id}>
							{option(item)}
						</option>
					))}
				</select>
			</label>
			<label>
				{t("layers.secondSource")}
				<select
					value={second.id}
					onChange={(event) => setSecondId(event.target.value)}
				>
					{others.map((item) => (
						<option key={item.id} value={item.id}>
							{option(item)}
						</option>
					))}
				</select>
			</label>
			<div className="layer-comparison-result" aria-live="polite">
				{!comparable ? (
					<p>{t("layers.compareIncompatible")}</p>
				) : !province ? (
					<p>{t("layers.compareSelectProvince")}</p>
				) : firstValue == null || secondValue == null ? (
					<p>{t("layers.compareNeedsBoth", { name: province.name })}</p>
				) : (
					<p>
						{t("layers.compareResult", {
							name: province.name,
							first: formatNumber(firstValue),
							firstUnit: unitLabel(locale, first.unit),
							second: formatNumber(secondValue),
							secondUnit: unitLabel(locale, second.unit),
							delta: formatNumber(secondValue - firstValue),
							unit:
								first.unit === "%"
									? t("common.percentagePoints")
									: unitLabel(locale, first.unit),
						})}
					</p>
				)}
			</div>
			<SourceDetails layer={first} />
			<SourceDetails layer={second} />
		</details>
	);
}

export function LayerControls({
	data,
	layer,
	setLayer,
	airports,
	setAirports,
	enabledKinds = [],
	onToggleKind,
	province,
	provinceCount,
	filterMin,
	filterMax,
	onFilterChange,
	onClearFilter,
	filterSummary,
	filterInvalid,
	filterInverted,
	proximityKind = "",
	proximityKm = "100",
	proximityResult = null,
	onProximityChange,
	catchmentCenter,
	catchmentRadius = 0,
	onCatchmentRadius,
}: {
	catchmentCenter?: CatchmentCenter | null;
	catchmentRadius?: number;
	onCatchmentRadius?: (radius: number) => void;
	data: MapLayers;
	layer: StatisticalLayer | null;
	setLayer: (id: string) => void;
	airports: boolean;
	setAirports: (enabled: boolean) => void;
	enabledKinds?: InfrastructureKind[];
	onToggleKind?: (kind: InfrastructureKind) => void;
	province: { id: string; name: string } | null;
	provinceCount: number;
	filterMin: string;
	filterMax: string;
	onFilterChange: (min: string, max: string) => void;
	onClearFilter: () => void;
	filterSummary: LayerFilterSummary | null;
	filterInvalid: boolean;
	filterInverted: boolean;
	proximityKind?: "" | InfrastructureKind;
	proximityKm?: string;
	proximityResult?: {
		matchedCount: number;
		totalProvinces: number;
		provinces: ProvinceProximityMatch[];
	} | null;
	onProximityChange?: (kind: "" | InfrastructureKind, maxKm: string) => void;
}) {
	const { t, locale, formatNumber } = useI18n();
	const [shareStatus, setShareStatus] = useState<
		"share.copied" | "share.failed" | null
	>(null);

	async function copyLink() {
		try {
			await navigator.clipboard.writeText(window.location.href);
			setShareStatus("share.copied");
		} catch {
			setShareStatus("share.failed");
		}
	}

	const groups = new Map<string, StatisticalLayer[]>();
	for (const item of data.indicators) {
		const name = groupMessageKey(item.indicator);
		const group = groups.get(name);
		if (group) group.push(item);
		else groups.set(name, [item]);
	}
	const covered = layer
		? Object.values(layer.values).filter((value) => value != null).length
		: 0;
	const details =
		layer && province ? layer.valueDetails?.[province.id] : undefined;
	return (
		<section className="layer-controls" aria-label={t("layers.aria")}>
			{onCatchmentRadius && (
				<div className="layer-filter">
					<label>
						{t("site.catchment")}
						<select
							disabled={!catchmentCenter}
							value={catchmentCenter ? catchmentRadius : 0}
							onChange={(event) =>
								onCatchmentRadius(Number(event.target.value))
							}
						>
							<option value={0}>{t("proximity.none")}</option>
							{catchmentRadii.map((km) => (
								<option key={km} value={km}>
									{km} km
								</option>
							))}
						</select>
					</label>
					{catchmentCenter && catchmentRadius > 0 && (
						<div className="site-coverage">
							<small>{t("site.referenceOnly")}</small>
							{catchmentRadii
								.filter((km) => km <= catchmentRadius)
								.map((km) => (
									<details key={km}>
										<summary>{km} km</summary>
										<p>
											{catchmentFacilities(catchmentCenter)
												.filter((poi) => poi.distanceKm <= km)
												.map((poi) => poi.name)
												.join(" · ") || t("district.missing")}
										</p>
									</details>
								))}
						</div>
					)}
				</div>
			)}
			<div className="layer-share">
				<button
					type="button"
					className="text-button"
					onClick={() => void copyLink()}
				>
					{t("share.copy")}
				</button>
				{shareStatus && <span role="status">{t(shareStatus)}</span>}
			</div>
			<label>
				{t("layers.colourBy")}
				<select
					value={layer?.id ?? ""}
					onChange={(event) => setLayer(event.target.value)}
				>
					<option value="">{t("layers.boundaries")}</option>
					{[...groups].map(([name, items]) => (
						<optgroup key={name} label={t(name as MessageKey)}>
							{items.map((item) => (
								<option value={item.id} key={item.id}>
									{indicatorLabel(locale, item.indicator, item.label)} ·{" "}
									{item.period} · {item.dataset.version}
								</option>
							))}
						</optgroup>
					))}
				</select>
			</label>
			{layer && (
				<div
					className="layer-filter"
					role="group"
					aria-label={t("layers.filterTitle")}
				>
					<p className="map-label">{t("layers.filterTitle")}</p>
					<div className="layer-filter-row">
						<label>
							{t("layers.filterMin")}
							<input
								type="number"
								inputMode="decimal"
								value={filterMin}
								onChange={(event) =>
									onFilterChange(event.target.value, filterMax)
								}
							/>
						</label>
						<label>
							{t("layers.filterMax")}
							<input
								type="number"
								inputMode="decimal"
								value={filterMax}
								onChange={(event) =>
									onFilterChange(filterMin, event.target.value)
								}
							/>
						</label>
						{(filterMin !== "" || filterMax !== "") && (
							<button
								type="button"
								className="text-button"
								onClick={onClearFilter}
							>
								{t("layers.filterClear")}
							</button>
						)}
					</div>
					{filterInvalid ? (
						<p role="alert">{t("layers.filterInvalid")}</p>
					) : filterInverted ? (
						<p role="alert">{t("layers.filterRange")}</p>
					) : filterSummary?.active ? (
						<p role="status">
							{t("layers.filterSummary", {
								matched: filterSummary.matched,
								total: filterSummary.total,
								missing: filterSummary.missing,
							})}
						</p>
					) : null}
				</div>
			)}
			{layer && (
				<div
					className="layer-legend"
					role="group"
					aria-label={t("layers.legendAria")}
				>
					<p>
						{t("layers.legendSummary", {
							unit: unitLabel(locale, layer.unit),
							period: layer.period,
							covered,
							total: provinceCount,
						})}
					</p>
					<ul>
						{colorScale(layer).map((bin, index) => (
							<li key={bin.color}>
								<span style={{ background: bin.color }} aria-hidden="true" />
								{bin.min === bin.max
									? formatNumber(bin.min)
									: `${index === 0 ? "" : "≥ "}${formatNumber(bin.min)} – ${formatNumber(bin.max)}`}
							</li>
						))}
						<li>
							<span style={{ background: missingColor }} aria-hidden="true" />{" "}
							{t("layers.unavailable")}
						</li>
					</ul>
					<a href={layer.dataset.source.url ?? undefined}>
						{layer.dataset.source.title}
					</a>
					{province &&
						(() => {
							const provinceValue = layer.values[province.id];
							return (
								<div className="layer-comparison-result" aria-live="polite">
									<strong>{province.name}</strong>
									<p>
										{provinceValue == null
											? t("layers.unavailable")
											: `${formatNumber(provinceValue)} ${unitLabel(locale, layer.unit)}`}{" "}
										· {layer.period}
									</p>
									<p>
										{t("layers.quality", {
											quality: qualityLabel(
												locale,
												details?.quality ?? "unavailable",
											),
										})}
									</p>
									<p className="muted">
										{details?.quality === "verified"
											? t("layers.qualityVerifiedNote")
											: details?.quality === "supported"
												? t("layers.qualitySupportedNote")
												: t("layers.qualityUnavailableNote")}
									</p>
									{details?.missingReason && <p>{details.missingReason}</p>}
									<p>
										{t("layers.source", {
											publisher: layer.dataset.source.publisher,
											title: layer.dataset.source.title,
											license: layer.dataset.source.license,
										})}
									</p>
									{details?.method && <p>{details.method}</p>}
									{details?.limitations && <p>{details.limitations}</p>}
								</div>
							);
						})()}
				</div>
			)}
			{data.infrastructure &&
				(() => {
					const counts = data.infrastructure.kinds ?? {
						airport: data.infrastructure.points.features.length,
					};
					const otherKinds = infrastructureKindOrder.filter(
						(kind) => kind !== "airport" && (counts[kind] ?? 0) > 0,
					);
					const activeTotal = data.infrastructure.points.features.filter(
						(feature) =>
							(feature.properties.kind === "airport" && airports) ||
							enabledKinds.includes(feature.properties.kind),
					).length;
					return (
						<div className="poi-control">
							<div className="infra-kind-list">
								<label>
									<input
										type="checkbox"
										checked={airports}
										onChange={(event) => setAirports(event.target.checked)}
									/>{" "}
									<span
										className="infra-kind-dot"
										style={{ background: infrastructureKindColors.airport }}
										aria-hidden="true"
									/>
									{t("layers.airports")}
								</label>
								{otherKinds.map((kind) => (
									<label key={kind}>
										<input
											type="checkbox"
											checked={enabledKinds.includes(kind)}
											onChange={() => onToggleKind?.(kind)}
										/>{" "}
										<span
											className="infra-kind-dot"
											style={{ background: infrastructureKindColors[kind] }}
											aria-hidden="true"
										/>
										{t(`infra.${kind}` as MessageKey)} ({counts[kind]})
									</label>
								))}
							</div>
							{activeTotal > 0 && (
								<p>
									<a href={data.infrastructure.dataset.source.url ?? undefined}>
										{data.infrastructure.dataset.source.publisher}
									</a>{" "}
									· {t("layers.referencePoints", { count: activeTotal })}
								</p>
							)}
						</div>
					);
				})()}
			{onProximityChange && (
				<div
					className="layer-filter proximity-filter"
					role="group"
					aria-label={t("proximity.title")}
				>
					<p className="map-label">{t("proximity.title")}</p>
					<div className="layer-filter-row">
						<label>
							{t("proximity.kindLabel")}
							<select
								value={proximityKind}
								onChange={(event) =>
									onProximityChange(
										event.target.value as "" | InfrastructureKind,
										proximityKm,
									)
								}
							>
								<option value="">{t("proximity.none")}</option>
								{infrastructureKindOrder.map((kind) => (
									<option key={kind} value={kind}>
										{t(`infra.${kind}` as MessageKey)}
									</option>
								))}
							</select>
						</label>
						{proximityKind && (
							<label>
								{t("proximity.radiusKm")}
								<input
									type="number"
									min="1"
									max="1500"
									inputMode="numeric"
									value={proximityKm}
									onChange={(event) =>
										onProximityChange(proximityKind, event.target.value)
									}
								/>
							</label>
						)}
						{proximityKind && (
							<button
								type="button"
								className="text-button"
								onClick={() => onProximityChange("", "100")}
							>
								{t("layers.filterClear")}
							</button>
						)}
					</div>
					{proximityKind && proximityResult && (
						<div aria-live="polite">
							<p role="status">
								{t("proximity.summary", {
									matched: proximityResult.matchedCount,
									total: proximityResult.totalProvinces,
									km: proximityKm,
									kind: t(`infra.${proximityKind}` as MessageKey),
								})}
							</p>
							{province &&
								(() => {
									const match = proximityResult.provinces.find(
										(item) => item.geoId === province.id,
									);
									if (!match) return null;
									return (
										<p className="muted">
											{t("proximity.nearestFacility", {
												province: match.name,
												facility: match.nearestPoiName,
												code: match.nearestPoiCode,
												km: formatNumber(match.distanceKm),
											})}
										</p>
									);
								})()}
						</div>
					)}
				</div>
			)}
			<SourceComparison
				layers={data.indicators}
				active={layer}
				province={province}
			/>
		</section>
	);
}
