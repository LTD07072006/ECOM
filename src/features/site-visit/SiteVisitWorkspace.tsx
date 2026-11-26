"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "../../lib/i18n/provider";
import { canonicalInfrastructurePois } from "../map/proximity";
import { CandidateSearch } from "./CandidateSearch";
import { compareCandidateRoutes, limitCandidates } from "./compare";
import {
	type ItineraryLeg,
	itinerarySummary,
	parseItinerary,
} from "./itinerary";
import type { RouteAssessment } from "./route-assessment";
import { SiteVisitMap } from "./SiteVisitMap";
import { LogisticsNetworkPanel } from "./LogisticsNetworkPanel";
import type { LogisticsOverview } from "../map/logistics-overview";
import { selectLogisticsDestinations } from "../map/logistics-network";
import { type SiteContextProperties, toSiteVisitContext } from "./site-context";
import {
	parseSiteVisitState,
	type SiteVisitCandidate,
	serializeSiteVisitState,
} from "./site-visit-state";

export function SiteVisitWorkspace() {
	const { t, formatNumber } = useI18n();
	const [candidate, setCandidate] = useState<SiteVisitCandidate | null>(
		() =>
			parseSiteVisitState(
				typeof window === "undefined" ? "" : window.location.search,
			).candidate,
	);
	const [destination, setDestination] = useState(
		() =>
			parseSiteVisitState(
				typeof window === "undefined" ? "" : window.location.search,
			).destination ?? "VNHPH-LH",
	);
	const [route, setRoute] = useState<RouteAssessment | null>(null);
	const [selectedContext, setSelectedContext] =
		useState<SiteContextProperties | null>(null);
	const [pending, setPending] = useState(false);
	const [routeError, setRouteError] = useState<string | null>(null);
	const [networkOverview, setNetworkOverview] =
		useState<LogisticsOverview | null>(null);
	const [compareCandidates, setCompareCandidates] = useState<
		SiteVisitCandidate[]
	>(
		() =>
			(typeof window === "undefined"
				? null
				: parseSiteVisitState(window.location.search).compareCandidates) ?? [],
	);
	const [compareResults, setCompareResults] = useState<
		Array<{
			candidateId: string;
			destinationCode: string;
			distanceMeters: number;
			durationSeconds: number;
		}>
	>([]);
	const [itineraryStops, setItineraryStops] = useState<SiteVisitCandidate[]>(
		() => {
			if (typeof window === "undefined") return [];
			const state = parseSiteVisitState(window.location.search);
			if (state.itineraryStops) return state.itineraryStops;
			const ids = parseItinerary(window.location.search);
			return ids
				.map((id) => {
					const [label, longitude, latitude] = id.split("|");
					return {
						label: label ?? id,
						longitude: Number(longitude),
						latitude: Number(latitude),
					};
				})
				.filter(
					(stop) =>
						Number.isFinite(stop.longitude) && Number.isFinite(stop.latitude),
				);
		},
	);
	const [itineraryLegs, setItineraryLegs] = useState<ItineraryLeg[]>([]);
	const context = useMemo(
		() =>
			toSiteVisitContext(
				candidate ?? { longitude: 105.8542, latitude: 21.0285 },
			),
		[candidate],
	);
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
	const sync = useCallback(
		(next: SiteVisitCandidate | null, nextDestination = destination) => {
			setCandidate(next);
			setNetworkOverview(null);
			const query = serializeSiteVisitState({
				candidate: next,
				destination: nextDestination,
			});
			window.history.replaceState(
				null,
				"",
				query ? `/site-visit?${query}` : "/site-visit",
			);
		},
		[destination],
	);
	useEffect(() => {
		if (typeof window === "undefined") return;
		const current = parseSiteVisitState(window.location.search);
		const query = serializeSiteVisitState({
			candidate: current.candidate ?? candidate,
			destination: current.destination ?? destination,
			compareCandidates,
			itineraryStops,
		});
		const nextUrl = query ? `/site-visit?${query}` : "/site-visit";
		if (`${window.location.pathname}${window.location.search}` !== nextUrl)
			window.history.replaceState(null, "", nextUrl);
	}, [candidate, compareCandidates, destination, itineraryStops]);
	const calculateRoute = useCallback(async () => {
		if (!candidate) return;
		const target = destinations.find((item) => item.code === destination);
		if (!target) return;
		setPending(true);
		setRouteError(null);
		try {
			const response = await fetch(
				`/api/site-visit/route?lng=${candidate.longitude}&lat=${candidate.latitude}&destination=${encodeURIComponent(target.code)}`,
			);
			if (!response.ok)
				throw new Error(response.status === 429 ? "quota" : "route");
			const payload = (await response.json()) as { data?: RouteAssessment };
			if (!payload.data) throw new Error("route");
			setRoute(payload.data);
		} catch (error) {
			setRouteError(
				error instanceof Error && error.message === "quota"
					? t("siteVisit.quota")
					: t("siteVisit.unavailable"),
			);
			setRoute(null);
		} finally {
			setPending(false);
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
						const response = await fetch(
							`/api/site-visit/route?lng=${item.longitude}&lat=${item.latitude}&destination=${encodeURIComponent(target.code)}`,
						);
						if (!response.ok) return null;
						const payload = (await response.json()) as {
							data?: RouteAssessment;
						};
						const data = payload.data;
						return data
							? {
									candidateId: item.label,
									destinationCode: target.code,
									distanceMeters: data.distanceMeters,
									durationSeconds: data.durationSeconds,
								}
							: null;
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
	const shareItinerary = () => {
		const query = serializeSiteVisitState({
			candidate,
			destination,
			compareCandidates,
			itineraryStops,
		});
		window.history.replaceState(null, "", `/site-visit?${query}`);
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
					if (!payload.data) throw new Error("unavailable");
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
					<CandidateSearch onSelect={(value) => sync(value)} />
					<div className="site-visit-field">
						<label htmlFor="site-visit-destination">
							{t("siteVisit.destination")}
						</label>
						<select
							id="site-visit-destination"
							value={destination}
							onChange={(event) => {
								const value = event.target.value;
								setDestination(value);
								sync(candidate, value);
								setRoute(null);
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
						disabled={!candidate || pending}
						onClick={() => void calculateRoute()}
					>
						{pending
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
									: route.mode === "unavailable"
										? t("siteVisit.unavailable")
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
						candidate={candidate}
						context={context}
						route={route}
						network={networkOverview}
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
					<button type="button" className="btn" onClick={shareItinerary}>
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
