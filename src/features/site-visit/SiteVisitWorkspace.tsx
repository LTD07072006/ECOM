"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../../lib/i18n/provider";
import { selectLogisticsDestinations } from "../map/logistics-network";
import type { LogisticsOverview } from "../map/logistics-overview";
import { canonicalInfrastructurePois } from "../map/proximity";
import { CandidateSearch } from "./CandidateSearch";
import { compareCandidateRoutes, limitCandidates } from "./compare";
import { type ItineraryLeg, itinerarySummary } from "./itinerary";
import { LogisticsNetworkPanel } from "./LogisticsNetworkPanel";
import type { RouteAssessment } from "./route-assessment";
import { SiteVisitMap } from "./SiteVisitMap";
import {
	countSiteVisitContextByKind,
	filterSiteVisitContext,
	SITE_CONTEXT_KINDS,
	SITE_CONTEXT_RADIUS_KM,
	type SiteContextKind,
	type SiteContextProperties,
	toSiteVisitContext,
} from "./site-context";
import {
	type SiteVisitCandidate,
	type SiteVisitState,
	serializeSiteVisitState,
} from "./site-visit-state";

export function SiteVisitWorkspace({
	initialState,
	wemapToken,
	wemapEnabled,
}: {
	initialState: SiteVisitState;
	wemapToken?: string;
	wemapEnabled: boolean;
}) {
	const { t, formatNumber } = useI18n();
	const [candidate, setCandidate] = useState(initialState.candidate);
	const [destination, setDestination] = useState(
		initialState.destination ?? "VNHPH-LH",
	);
	const [route, setRoute] = useState<RouteAssessment | null>(null);
	const routeRequest = useRef<AbortController | null>(null);
	const [routePending, setRoutePending] = useState(false);
	const [selectedContext, setSelectedContext] =
		useState<SiteContextProperties | null>(null);
	const [enabledContextKinds, setEnabledContextKinds] = useState<
		SiteContextKind[]
	>(() => [...SITE_CONTEXT_KINDS]);
	const [pending, setPending] = useState(false);
	const [routeError, setRouteError] = useState<string | null>(null);
	const [networkOverview, setNetworkOverview] =
		useState<LogisticsOverview | null>(null);
	const [selectedDestinationCode, setSelectedDestinationCode] = useState<
		string | null
	>(null);
	const [compareCandidates, setCompareCandidates] = useState<
		SiteVisitCandidate[]
	>(initialState.compareCandidates ?? []);
	const [compareResults, setCompareResults] = useState<
		Array<{
			candidateId: string;
			destinationCode: string;
			distanceMeters: number;
			durationSeconds: number;
		}>
	>([]);
	const [itineraryStops, setItineraryStops] = useState<SiteVisitCandidate[]>(
		initialState.itineraryStops ?? [],
	);
	const [itineraryLegs, setItineraryLegs] = useState<ItineraryLeg[]>([]);
	const nearbyContext = useMemo(
		() =>
			toSiteVisitContext(
				candidate ?? { longitude: 105.8542, latitude: 21.0285 },
			),
		[candidate],
	);
	const context = useMemo(
		() => filterSiteVisitContext(nearbyContext, enabledContextKinds),
		[enabledContextKinds, nearbyContext],
	);
	const contextCounts = useMemo(
		() =>
			candidate
				? countSiteVisitContextByKind(nearbyContext)
				: Object.fromEntries(SITE_CONTEXT_KINDS.map((kind) => [kind, 0])),
		[candidate, nearbyContext],
	);
	const toggleContextKind = useCallback((kind: SiteContextKind) => {
		setEnabledContextKinds((current) =>
			current.includes(kind)
				? current.filter((item) => item !== kind)
				: [...current, kind],
		);
	}, []);
	const setAllContextKinds = useCallback((enabled: boolean) => {
		setEnabledContextKinds(enabled ? [...SITE_CONTEXT_KINDS] : []);
	}, []);
	const destinations = useMemo(
		() =>
			canonicalInfrastructurePois.filter((poi) =>
				["airport", "seaport", "icd", "expressway_node"].includes(poi.kind),
			),
		[],
	);
	const logisticsDestinations = useMemo(
		() =>
			selectLogisticsDestinations(
				canonicalInfrastructurePois.filter((poi) =>
					["airport", "seaport", "icd", "expressway_node"].includes(poi.kind),
				),
				canonicalInfrastructurePois
					.filter((poi) =>
						["airport", "seaport", "icd", "expressway_node"].includes(poi.kind),
					)
					.map((poi) => poi.code),
			),
		[],
	);
	const clearRoute = useCallback(() => {
		routeRequest.current?.abort();
		setRoutePending(false);
		setRoute(null);
		setRouteError(null);
	}, []);
	const selectCandidate = useCallback(
		(nextCandidate: SiteVisitCandidate) => {
			clearRoute();
			setNetworkOverview(null);
			setSelectedDestinationCode(null);
			setCandidate(nextCandidate);
		},
		[clearRoute],
	);
	useEffect(() => () => routeRequest.current?.abort(), []);
	const updateShareUrl = useCallback(() => {
		const url = new URL(window.location.href);
		const shared = new URLSearchParams(
			serializeSiteVisitState({
				candidate,
				destination,
				compareCandidates,
				itineraryStops,
			}),
		);
		for (const key of [
			"label",
			"lng",
			"lat",
			"destination",
			"compare",
			"stops",
		]) {
			const value = shared.get(key);
			if (value === null) url.searchParams.delete(key);
			else url.searchParams.set(key, value);
		}
		if (url.href !== window.location.href)
			window.history.replaceState(window.history.state, "", url);
	}, [candidate, compareCandidates, destination, itineraryStops]);
	useEffect(() => updateShareUrl(), [updateShareUrl]);
	const calculateRoute = useCallback(async () => {
		if (!candidate) return;
		const target = destinations.find((item) => item.code === destination);
		if (!target) return;
		routeRequest.current?.abort();
		const request = new AbortController();
		routeRequest.current = request;
		setRoutePending(true);
		setRoute(null);
		setRouteError(null);
		try {
			const response = await fetch(
				`/api/site-visit/route?lng=${candidate.longitude}&lat=${candidate.latitude}&destination=${encodeURIComponent(target.code)}`,
				{ signal: request.signal },
			);
			if (!response.ok)
				throw new Error(response.status === 429 ? "quota" : "route");
			const payload = (await response.json()) as { data?: RouteAssessment };
			if (!payload.data || payload.data.mode === "unavailable")
				throw new Error("route");
			if (!request.signal.aborted) setRoute(payload.data);
		} catch (error) {
			if (request.signal.aborted) return;
			setRouteError(
				error instanceof Error && error.message === "quota"
					? t("siteVisit.quota")
					: t("siteVisit.unavailable"),
			);
			setRoute(null);
		} finally {
			if (!request.signal.aborted) setRoutePending(false);
		}
	}, [candidate, destination, destinations, t]);
	const addCompare = useCallback(() => {
		if (!candidate) return;
		setCompareCandidates((current) =>
			limitCandidates([
				...current.filter((item) => item.label !== candidate.label),
				candidate,
			]),
		);
	}, [candidate]);
	const addItinerary = useCallback(() => {
		if (!candidate) return;
		const target = destinations.find((item) => item.code === destination);
		if (!target) return;
		setItineraryStops((current) => {
			const stop = {
				label: target.code,
				longitude: target.longitude,
				latitude: target.latitude,
			};
			if (current.some((item) => item.label === stop.label)) return current;
			return [...current, stop].slice(0, 5);
		});
	}, [candidate, destination, destinations]);
	const calculateCompare = useCallback(async () => {
		setPending(true);
		try {
			const results = await Promise.all(
				compareCandidates.flatMap((item) =>
					destinations.map(async (target) => {
						try {
							const response = await fetch(
								`/api/site-visit/route?lng=${item.longitude}&lat=${item.latitude}&destination=${encodeURIComponent(target.code)}`,
							);
							if (!response.ok) return null;
							const { data } = (await response.json()) as {
								data?: RouteAssessment;
							};
							if (!data || data.mode === "unavailable") return null;
							return {
								candidateId: item.label,
								destinationCode: target.code,
								distanceMeters: data.distanceMeters,
								durationSeconds: data.durationSeconds,
							};
						} catch {
							return null;
						}
					}),
				),
			);
			setCompareResults(
				results.filter(
					(item): item is NonNullable<typeof item> => item !== null,
				),
			);
		} finally {
			setPending(false);
		}
	}, [compareCandidates, destinations]);
	const moveStop = (index: number, direction: -1 | 1) => {
		setItineraryStops((current) => {
			const next = [...current];
			const targetIndex = index + direction;
			if (targetIndex < 0 || targetIndex >= next.length) return current;
			[next[index], next[targetIndex]] = [next[targetIndex], next[index]];
			return next;
		});
	};
	const calculateItinerary = useCallback(async () => {
		if (itineraryStops.length < 2) return;
		setPending(true);
		const legs = await Promise.all(
			itineraryStops.slice(1).map(async (stop, index) => {
				const from = itineraryStops[index];
				if (!from) return null;
				try {
					const response = await fetch("/api/site-visit/route", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							origin: [from.longitude, from.latitude],
							destination: [stop.longitude, stop.latitude],
							destinationId: stop.label,
							destinationName: stop.label,
						}),
					});
					if (!response.ok) throw new Error("unavailable");
					const payload = (await response.json()) as { data?: RouteAssessment };
					if (!payload.data || payload.data.mode === "unavailable")
						throw new Error("unavailable");
					return {
						fromId: from.label,
						toId: stop.label,
						distanceMeters: payload.data.distanceMeters,
						durationSeconds: payload.data.durationSeconds,
						status: payload.data.mode === "baseline" ? "baseline" : "live",
					} satisfies ItineraryLeg;
				} catch {
					return {
						fromId: from.label,
						toId: stop.label,
						distanceMeters: 0,
						durationSeconds: 0,
						status: "unavailable",
					} satisfies ItineraryLeg;
				}
			}),
		);
		setItineraryLegs(legs.filter((leg): leg is ItineraryLeg => leg !== null));
		setPending(false);
	}, [itineraryStops]);
	const compareRows = compareCandidateRoutes(compareResults);
	const summary = itinerarySummary(itineraryLegs);
	return (
		<main className="site-visit-page" id="site-visit-main" tabIndex={-1}>
			<header className="site-visit-hero">
				<div>
					<p className="site-visit-kicker">{t("siteVisit.kicker")}</p>
					<h1>{t("siteVisit.title")}</h1>
					<p>{t("siteVisit.lede")}</p>
				</div>
				<div className="site-visit-status">
					{candidate ? (
						<>
							<strong>{candidate.label}</strong>
							<span>{t("siteVisit.candidateSelected")}</span>
						</>
					) : (
						<span>{t("siteVisit.noCandidate")}</span>
					)}
				</div>
			</header>
			<section className="site-visit-layout">
				<aside className="site-visit-panel">
					<fieldset className="site-visit-filter-group">
						<div className="site-visit-filter-heading">
							<legend>{t("siteVisit.infrastructureFilter")}</legend>
							<div className="site-visit-filter-actions">
								<button
									type="button"
									className="site-visit-inline-action"
									onClick={() => setAllContextKinds(true)}
								>
									{t("siteVisit.selectInfrastructureFilters")}
								</button>
								<button
									type="button"
									className="site-visit-inline-action"
									onClick={() => setAllContextKinds(false)}
								>
									{t("siteVisit.clearInfrastructureFilters")}
								</button>
							</div>
						</div>
						{SITE_CONTEXT_KINDS.map((kind) => (
							<label key={kind}>
								<input
									type="checkbox"
									checked={enabledContextKinds.includes(kind)}
									onChange={() => toggleContextKind(kind)}
								/>
								<span>
									{t(`siteVisit.infrastructureKind.${kind}`)} (
									{contextCounts[kind]})
								</span>
							</label>
						))}
						<p className="site-visit-filter-note">
							{candidate
								? t("siteVisit.infrastructureFilterNote", {
										radius: SITE_CONTEXT_RADIUS_KM,
									})
								: t("siteVisit.infrastructureChooseCandidate")}
						</p>
					</fieldset>
					{candidate && context.features.length === 0 && (
						<p className="site-visit-empty-state" role="status">
							{t("siteVisit.noNearbyInfrastructure")}
						</p>
					)}
					<CandidateSearch token={wemapToken} onSelect={selectCandidate} />
					<div className="site-visit-field">
						<label htmlFor="site-visit-destination">
							{t("siteVisit.destination")}
						</label>
						<select
							id="site-visit-destination"
							value={destination}
							onChange={(event) => {
								clearRoute();
								setDestination(event.target.value);
							}}
						>
							{destinations.map((item) => (
								<option key={item.code} value={item.code}>
									{item.name}
								</option>
							))}
						</select>
					</div>
					<button
						type="button"
						className="btn btn-cta"
						disabled={!candidate || routePending}
						onClick={() => void calculateRoute()}
					>
						{routePending
							? t("siteVisit.routeLoading")
							: t("siteVisit.calculateRoute")}
					</button>
					{route && (
						<div className="site-visit-route-result" role="status">
							<strong>
								{formatNumber(Math.round(route.distanceMeters / 100) / 10)} km
							</strong>
							<span>
								{formatNumber(Math.round(route.durationSeconds / 60))} min ·{" "}
								{route.provider}
							</span>
							<span>
								{route.mode === "baseline"
									? `${t("siteVisit.fallback")} · ${route.observedOn}`
									: `${t("siteVisit.calculated")} · ${new Date(route.calculatedOn).toLocaleString()}`}
							</span>
							{route.sourceUrl && (
								<a href={route.sourceUrl} target="_blank" rel="noreferrer">
									{t("siteVisit.source")}
								</a>
							)}
							<small>{t("siteVisit.advisory")}</small>
						</div>
					)}
					{routeError && (
						<p className="site-visit-error" role="alert">
							{routeError}
						</p>
					)}
					<div className="site-visit-actions">
						<button
							type="button"
							className="btn"
							disabled={!candidate || compareCandidates.length >= 3}
							onClick={addCompare}
						>
							{t("siteVisit.addCompare")}
						</button>
						<button
							type="button"
							className="btn"
							disabled={!candidate || itineraryStops.length >= 5}
							onClick={addItinerary}
						>
							{t("siteVisit.addStop")}
						</button>
					</div>
					{selectedContext && (
						<div className="site-visit-context-detail">
							<strong>{selectedContext.name}</strong>
							<span>
								{selectedContext.kind} · {selectedContext.province}
							</span>
							<a href={selectedContext.url} target="_blank" rel="noreferrer">
								{t("siteVisit.source")}
							</a>
						</div>
					)}
				</aside>
				<div className="site-visit-map-wrap">
					<SiteVisitMap
						wemapEnabled={wemapEnabled}
						candidate={candidate}
						context={context}
						route={route}
						network={networkOverview}
						selectedDestinationCode={selectedDestinationCode}
						onCandidateChange={selectCandidate}
						onDestinationSelect={setSelectedDestinationCode}
						onContextSelect={setSelectedContext}
					/>
					<div className="site-visit-legend">
						<span>
							<i className="site-visit-legend-dot site-visit-legend-dot--candidate" />
							{t("siteVisit.candidate")}
						</span>
						<span>
							<i className="site-visit-legend-dot" />
							{t("siteVisit.infrastructure")}
						</span>
					</div>
				</div>
			</section>
			{candidate && (
				<LogisticsNetworkPanel
					candidate={candidate}
					destinations={logisticsDestinations}
					onOverviewChange={setNetworkOverview}
					onDestinationSelect={setSelectedDestinationCode}
				/>
			)}
			{compareCandidates.length > 0 && (
				<section
					className="site-visit-secondary"
					aria-labelledby="site-visit-compare-title"
				>
					<h2 id="site-visit-compare-title">{t("siteVisit.compare")}</h2>
					<p>{t("siteVisit.compareNote")}</p>
					<div className="site-visit-candidate-list">
						{compareCandidates.map((item, index) => (
							<span key={`${item.label}-${index}`}>
								{item.label}
								<button
									type="button"
									aria-label={`${t("siteVisit.remove")} ${item.label}`}
									onClick={() =>
										setCompareCandidates((current) =>
											current.filter((_, position) => position !== index),
										)
									}
								>
									×
								</button>
							</span>
						))}
					</div>
					<button
						type="button"
						className="btn"
						disabled={pending}
						onClick={() => void calculateCompare()}
					>
						{t("siteVisit.calculateCompare")}
					</button>
					<div className="site-visit-compare-table">
						{compareRows.map((row) => (
							<div key={row.destinationCode}>
								<strong>
									{destinations.find(
										(item) => item.code === row.destinationCode,
									)?.name ?? row.destinationCode}
								</strong>
								<div>
									{row.routes.map((route) => (
										<span key={route.candidateId}>
											{route.candidateId}:{" "}
											{formatNumber(
												Math.round(route.distanceMeters / 100) / 10,
											)}{" "}
											km ·{" "}
											{formatNumber(Math.round(route.durationSeconds / 60))} min
										</span>
									))}
								</div>
							</div>
						))}
					</div>
				</section>
			)}
			{itineraryStops.length > 0 && (
				<section
					className="site-visit-secondary"
					aria-labelledby="site-visit-itinerary-title"
				>
					<h2 id="site-visit-itinerary-title">{t("siteVisit.itinerary")}</h2>
					<p>{t("siteVisit.itineraryNote")}</p>
					<ol className="site-visit-stops">
						{itineraryStops.map((stop, index) => (
							<li key={`${stop.label}-${index}`}>
								<span>{stop.label}</span>
								<button
									type="button"
									disabled={index === 0}
									onClick={() => moveStop(index, -1)}
									aria-label={t("siteVisit.moveUp")}
								>
									↑
								</button>
								<button
									type="button"
									disabled={index === itineraryStops.length - 1}
									onClick={() => moveStop(index, 1)}
									aria-label={t("siteVisit.moveDown")}
								>
									↓
								</button>
							</li>
						))}
					</ol>
					<div className="site-visit-itinerary-summary">
						{formatNumber(Math.round(summary.distanceMeters / 100) / 10)} km ·{" "}
						{formatNumber(Math.round(summary.durationSeconds / 60))} min ·{" "}
						{summary.unavailableLegs} {t("siteVisit.unavailableLegs")}
					</div>
					<button
						type="button"
						className="btn"
						disabled={pending || itineraryStops.length < 2}
						onClick={() => void calculateItinerary()}
					>
						{t("siteVisit.calculateItinerary")}
					</button>{" "}
					<button type="button" className="btn" onClick={updateShareUrl}>
						{t("siteVisit.share")}
					</button>
				</section>
			)}
			<div className="site-visit-attribution">
				{t("siteVisit.mapData")}{" "}
				<a href="https://wemap.asia/" target="_blank" rel="noreferrer">
					WeMap
				</a>{" "}
				·{" "}
				<a
					href="https://www.openstreetmap.org/copyright"
					target="_blank"
					rel="noreferrer"
				>
					OpenStreetMap
				</a>
			</div>
		</main>
	);
}
