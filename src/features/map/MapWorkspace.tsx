"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GeoSearch } from "../search/GeoSearch";
import { GeoProfilePanel } from "../profile/GeoProfilePanel";
import { ShortlistButton } from "../shortlist/ShortlistButton";
import { ShortlistTray } from "../shortlist/ShortlistTray";
import { readShortlist } from "../shortlist/store";
import { ProvinceMap } from "./ProvinceMap";
import { LayerControls, LayerLegend } from "./LayerControls";
import {
	familyLeadColors,
	familyOrder,
	layerFamily,
	filterInfrastructureByKinds,
	type IndicatorFamily,
	type InfrastructureKind,
	type MapLayers,
	type ProvinceInfrastructureItem,
} from "./layers";
import type { Geography, Profile } from "../geography/types";
import { RegionPanel, type RegionIds } from "../regions/RegionPanel";
import { readFilterInputs, summarizeLayerValues } from "./filters";
import {
	BOUNDARIES_LAYER,
	mapStateQuery,
	readMapState,
	readRegionIds,
	regionQueryParams,
} from "./url-state";
import { useI18n } from "../../lib/i18n/provider";
import { indicatorLabel, unitLabel } from "../../lib/i18n/data-labels";
import type { MessageKey } from "../../lib/i18n";

type Coverage = {
	total: number;
	pointOnly: number;
	boundaryReady: number;
	publicBoundaryAvailable: boolean;
};

type Props = {
	coverage: Coverage;
	provinces: Geography[];
};

export function MapWorkspace({ coverage, provinces }: Props) {
	const { t, locale, formatNumber } = useI18n();
	const [profile, setProfile] = useState<Profile | null>(null);
	const [requestedPlace, setRequestedPlace] = useState("");
	const [hoveredId, setHoveredId] = useState<string | null>(null);
	const [shortlistIds, setShortlistIds] = useState<string[]>([]);
	const [profileError, setProfileError] = useState(false);
	const [layers, setLayers] = useState<MapLayers | null>(null);
	const [layerError, setLayerError] = useState(false);
	const [layerId, setLayerId] = useState("");
	const [showAirports, setShowAirports] = useState(false);
	const [extraKinds, setExtraKinds] = useState<InfrastructureKind[]>([]);
	const toggleExtraKind = useCallback((kind: InfrastructureKind) => {
		setExtraKinds((current) =>
			current.includes(kind)
				? current.filter((item) => item !== kind)
				: [...current, kind],
		);
	}, []);
	const [filterMin, setFilterMin] = useState("");
	const [filterMax, setFilterMax] = useState("");
	const [regionMode, setRegionMode] = useState(false);
	const [activeRegion, setActiveRegion] = useState(0);
	const [regions, setRegions] = useState<RegionIds>([[], []]);
	const toggleRegion = useCallback(
		(id: string) => {
			setRegions((current) => {
				const next: RegionIds = [
					current[0].filter((item) => item !== id),
					current[1].filter((item) => item !== id),
				];
				if (!current[activeRegion].includes(id)) {
					if (next[activeRegion].length >= 10) return current;
					next[activeRegion].push(id);
				}
				return next;
			});
		},
		[activeRegion],
	);
	const pending = useRef<AbortController | null>(null);
	useEffect(() => () => pending.current?.abort(), []);

	useEffect(() => {
		const syncShortlist = () => {
			try {
				setShortlistIds(
					readShortlist(localStorage.getItem("investor-shortlist")),
				);
			} catch {
				setShortlistIds([]);
			}
		};
		syncShortlist();
		window.addEventListener("investor-shortlist-change", syncShortlist);
		window.addEventListener("storage", syncShortlist);
		return () => {
			window.removeEventListener("investor-shortlist-change", syncShortlist);
			window.removeEventListener("storage", syncShortlist);
		};
	}, []);

	useEffect(() => {
		const request = new AbortController();
		void fetch("/api/map/layers", { signal: request.signal })
			.then(async (response) => {
				if (!response.ok) throw new Error("Layer request failed");
				const result: { data: MapLayers } = await response.json();
				if (!request.signal.aborted) setLayers(result.data);
			})
			.catch(() => {
				if (!request.signal.aborted) setLayerError(true);
			});
		return () => request.abort();
	}, []);

	const openProfile = useCallback((id: string) => {
		pending.current?.abort();
		const request = new AbortController();
		pending.current = request;
		setRequestedPlace(id);
		setProfileError(false);
		void fetch(`/api/geographies/${encodeURIComponent(id)}`, {
			signal: request.signal,
		})
			.then(async (response) => {
				if (!response.ok) throw new Error("Profile request failed");
				const result: { data: Profile } = await response.json();
				if (!request.signal.aborted) setProfile(result.data);
			})
			.catch(() => {
				if (!request.signal.aborted) setProfileError(true);
			})
			.finally(() => {
				if (!request.signal.aborted) setRequestedPlace("");
			});
	}, []);

	const selectSearchResult = useCallback((result: Profile) => {
		pending.current?.abort();
		setRequestedPlace("");
		setProfileError(false);
		setProfile(result);
	}, []);

	const [restored, setRestored] = useState(false);
	useEffect(() => {
		const restore = () => {
			const state = readMapState(window.location.search);
			const sharedRegions = readRegionIds(window.location.search);
			setLayerId(state.layer);
			setShowAirports(state.airports);
			setFilterMin(state.filter.min === null ? "" : String(state.filter.min));
			setFilterMax(state.filter.max === null ? "" : String(state.filter.max));
			if (sharedRegions[0].length > 0 || sharedRegions[1].length > 0) {
				setRegions(sharedRegions);
				setRegionMode(true);
			} else {
				setRegions([[], []]);
			}
			setProfile(null);
			setProfileError(false);
			if (state.province) openProfile(state.province);
			else {
				pending.current?.abort();
				setRequestedPlace("");
			}
			setRestored(true);
		};
		restore();
		window.addEventListener("popstate", restore);
		return () => window.removeEventListener("popstate", restore);
	}, [openProfile]);

	const selectedProvince =
		profile?.level === "province"
			? profile.id
			: profile?.level === "commune"
				? profile.parentId
				: null;
	const activeLayer =
		layerId && layerId !== BOUNDARIES_LAYER
			? (layers?.indicators.find((layer) => layer.id === layerId) ?? null)
			: null;
	const displayLayer = useMemo(() => {
		if (layerId === BOUNDARIES_LAYER) return null;
		if (activeLayer) return activeLayer;
		return (
			layers?.indicators.find((item) => item.indicator === "POP_AVG") ??
			layers?.indicators[0] ??
			null
		);
	}, [activeLayer, layerId, layers]);

	const activeFamily: IndicatorFamily | null = displayLayer
		? layerFamily(displayLayer.indicator)
		: null;

	const province =
		selectedProvince && profile
			? {
					id: selectedProvince,
					name:
						profile.level === "province"
							? profile.displayName
							: (profile.parentName ?? t("common.vietnam")),
				}
			: null;
	const filterInputs = readFilterInputs(filterMin, filterMax);
	const filterReady = !filterInputs.invalid && !filterInputs.inverted;
	const filterSummary = useMemo(
		() =>
			displayLayer
				? summarizeLayerValues(
						displayLayer.values,
						readFilterInputs(filterMin, filterMax).filter,
					)
				: null,
		[displayLayer, filterMin, filterMax],
	);
	const matchIds =
		filterSummary?.active && filterReady ? filterSummary.matchedIds : null;

	useEffect(() => {
		if (!restored) return;
		const inputs = readFilterInputs(filterMin, filterMax);
		const validFilter =
			inputs.invalid || inputs.inverted
				? { min: null, max: null }
				: inputs.filter;
		const hasFilterBound = validFilter.min !== null || validFilter.max !== null;
		const urlLayer =
			layerId || (hasFilterBound && displayLayer ? displayLayer.id : "");
		const query = mapStateQuery({
			layer: urlLayer,
			province: requestedPlace || selectedProvince || "",
			filter: validFilter,
			airports: showAirports,
		});
		const url = new URL(window.location.href);
		const next = new URLSearchParams(query);
		for (const key of ["layer", "province", "min", "max", "airports"]) {
			const value = next.get(key);
			if (value === null) url.searchParams.delete(key);
			else url.searchParams.set(key, value);
		}
		const { regionA, regionB } = regionQueryParams(regions);
		if (regionA === null) url.searchParams.delete("regionA");
		else url.searchParams.set("regionA", regionA);
		if (regionB === null) url.searchParams.delete("regionB");
		else url.searchParams.set("regionB", regionB);
		if (url.href !== window.location.href)
			window.history.replaceState(window.history.state, "", url);
	}, [
		restored,
		layerId,
		displayLayer,
		requestedPlace,
		selectedProvince,
		filterMin,
		filterMax,
		showAirports,
		regions,
	]);

	const selectLayer = useCallback((id: string) => {
		setLayerId(id);
		setFilterMin("");
		setFilterMax("");
	}, []);
	const selectFamily = useCallback(
		(family: IndicatorFamily) => {
			if (!layers) return;
			const match = layers.indicators.find(
				(item) => layerFamily(item.indicator) === family,
			);
			if (match) {
				setLayerId(match.id);
				setFilterMin("");
				setFilterMax("");
			}
		},
		[layers],
	);
	const changeFilter = useCallback((min: string, max: string) => {
		setFilterMin(min);
		setFilterMax(max);
	}, []);
	const clearFilter = useCallback(() => {
		setFilterMin("");
		setFilterMax("");
	}, []);

	const activeInfraKinds = useMemo<InfrastructureKind[]>(
		() => (showAirports ? ["airport", ...extraKinds] : extraKinds),
		[showAirports, extraKinds],
	);
	const visibleInfrastructure = useMemo(
		() =>
			filterInfrastructureByKinds(
				layers?.infrastructure ?? null,
				activeInfraKinds,
			),
		[layers, activeInfraKinds],
	);
	const provinceInfrastructure = useMemo<ProvinceInfrastructureItem[]>(
		() =>
			selectedProvince && layers?.infrastructure
				? layers.infrastructure.points.features
						.filter((feature) => feature.properties.geoId === selectedProvince)
						.map((feature) => ({
							...feature.properties,
							longitude: feature.geometry.coordinates[0],
							latitude: feature.geometry.coordinates[1],
						}))
				: [],
		[layers, selectedProvince],
	);
	const regionIds = useMemo(
		() => (regionMode ? regions.flat() : []),
		[regionMode, regions],
	);

	const maxLayerValue = useMemo(() => {
		if (!displayLayer) return 0;
		return Object.values(displayLayer.values).reduce<number>(
			(max, val) => (typeof val === "number" && val > max ? val : max),
			0,
		);
	}, [displayLayer]);

	const coveredCount = displayLayer
		? Object.values(displayLayer.values).filter((value) => value != null).length
		: 0;

	return (
		<section
			className="workspace database-map-workspace"
			aria-label={t("map.workspace")}
		>
			<div className="stage-head">
				<h2 className="stage-indicator-title overprint-transition">
					{displayLayer
						? `${indicatorLabel(locale, displayLayer.indicator, displayLayer.label)}, ${displayLayer.period}`
						: t("layers.boundaries")}
				</h2>
				<div className="stage-sub">
					{displayLayer && (
						<span>
							{unitLabel(locale, displayLayer.unit)} ·{" "}
							{t("layers.covered", { count: coveredCount })} ·{" "}
						</span>
					)}
					<aside
						className="stage-coverage-aside"
						aria-label={t("map.coverageAria")}
					>
						{coverage.publicBoundaryAvailable
							? t("map.coverage", {
									ready: coverage.boundaryReady,
									total: coverage.total,
								})
							: t("map.coverageNone")}
					</aside>
				</div>
			</div>

			<div className="workspace-search">
				<GeoSearch onSelect={selectSearchResult} />
			</div>

			<div className="stage-family-slot">
				<div
					className="family-switch"
					role="group"
					aria-label={t("layers.familyAria")}
				>
					{familyOrder.map((family) => {
						const active = activeFamily === family;
						const available =
							layers?.indicators.some(
								(item) => layerFamily(item.indicator) === family,
							) ?? true;
						return (
							<button
								key={family}
								type="button"
								className="family-switch-btn"
								aria-pressed={active}
								disabled={!available}
								onClick={() => selectFamily(family)}
							>
								<span
									className="family-swatch"
									style={{ backgroundColor: familyLeadColors[family] }}
									aria-hidden="true"
								/>
								<span>{t(`layers.family.${family}` as MessageKey)}</span>
							</button>
						);
					})}
				</div>
			</div>

			<div className="map-stage-body">
				<div className="map-stage database-map-stage">
					<ProvinceMap
						selectedId={regionMode ? null : selectedProvince}
						hoveredId={hoveredId}
						shortlistIds={shortlistIds}
						regionIds={regionIds}
						onSelect={regionMode ? toggleRegion : openProfile}
						layer={displayLayer}
						matchIds={matchIds}
						infrastructure={visibleInfrastructure}
					/>
				</div>
				<div className="stage-legend-column">
					{(displayLayer || layers) && (
						<LayerLegend
							layer={displayLayer}
							province={province}
							provinceCount={coverage.total}
						/>
					)}
				</div>
			</div>

			<aside className="workspace-panel" aria-label={t("map.railAria")}>
				<div className="action-row">
					<button
						type="button"
						className="btn btn-secondary btn-sm"
						onClick={() => setRegionMode((value) => !value)}
						aria-expanded={regionMode}
					>
						{t(regionMode ? "region.close" : "region.details")}
					</button>
				</div>
				{regionMode && (
					<RegionPanel
						regions={regions}
						restore={setRegions}
						active={activeRegion}
						setActive={setActiveRegion}
						remove={(index, id) =>
							setRegions(
								(current) =>
									current.map((ids, i) =>
										i === index ? ids.filter((value) => value !== id) : ids,
									) as RegionIds,
							)
						}
						clear={() => setRegions([[], []])}
						addCurrent={() => {
							if (selectedProvince) toggleRegion(selectedProvince);
						}}
						canAddCurrent={
							!!selectedProvince &&
							regions[activeRegion].length < 10 &&
							!regions[activeRegion].includes(selectedProvince)
						}
					/>
				)}

				{profileError && (
					<p className="banner banner--error" role="status">
						{t("map.profileError")}
					</p>
				)}
				{profile ? (
					<div className="form-stack">
						<GeoProfilePanel
							profile={profile}
							infrastructure={provinceInfrastructure}
						/>
						<ShortlistButton geo={profile} />
					</div>
				) : (
					<div className="banner banner--info">
						<span>{t("map.emptyPrompt")}</span>
					</div>
				)}
				<ShortlistTray />

				{provinces.length > 0 && (
					<section
						className="province-list-section"
						aria-label={t("map.provinceListAria")}
					>
						<div className="province-list-header">
							<span>
								{t("map.provinceListHeader", { count: provinces.length })}
							</span>
							<span>
								{displayLayer ? unitLabel(locale, displayLayer.unit) : ""}
							</span>
						</div>
						<ul className="province-list">
							{provinces.map((item) => {
								const rawValue = displayLayer?.values[item.id];
								const pct =
									typeof rawValue === "number" &&
									rawValue > 0 &&
									maxLayerValue > 0
										? Math.min(
												100,
												Math.round((rawValue / maxLayerValue) * 100),
											)
										: 0;
								const isCurrent = selectedProvince === item.id;
								const isSaved = shortlistIds.includes(item.id);
								return (
									<li key={item.id}>
										<button
											type="button"
											className="province-row"
											aria-current={isCurrent ? "true" : undefined}
											onMouseEnter={() => setHoveredId(item.id)}
											onMouseLeave={() => setHoveredId(null)}
											onFocus={() => setHoveredId(item.id)}
											onBlur={() => setHoveredId(null)}
											onClick={() => openProfile(item.id)}
										>
											<span className="province-row-name">
												{isSaved && (
													<span
														className="province-saved-dot"
														aria-hidden="true"
														title={t("shortlist.saved")}
													/>
												)}
												<span>{item.displayName}</span>
											</span>
											<span className="province-row-value tabular-nums">
												{typeof rawValue === "number"
													? formatNumber(rawValue)
													: "—"}
											</span>
											{pct > 0 && (
												<span
													className="province-row-bar overprint-transition"
													style={{
														width: `${pct}%`,
														backgroundColor:
															familyLeadColors[activeFamily ?? "population"],
													}}
													aria-hidden="true"
												/>
											)}
										</button>
									</li>
								);
							})}
						</ul>
					</section>
				)}
			</aside>

			<div className="stage-controls-slot">
				{layerError && (
					<p className="banner banner--error" role="status">
						{t("map.layersUnavailable")}
					</p>
				)}
				{layers && (
					<LayerControls
						data={layers}
						selectValue={layerId || displayLayer?.id || BOUNDARIES_LAYER}
						layer={displayLayer}
						setLayer={selectLayer}
						airports={showAirports}
						setAirports={setShowAirports}
						enabledKinds={extraKinds}
						onToggleKind={toggleExtraKind}
						province={province}
						filterMin={filterMin}
						filterMax={filterMax}
						onFilterChange={changeFilter}
						onClearFilter={clearFilter}
						filterSummary={filterSummary}
						filterInvalid={filterInputs.invalid}
						filterInverted={filterInputs.inverted}
					/>
				)}
			</div>
		</section>
	);
}
