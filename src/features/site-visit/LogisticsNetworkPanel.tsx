"use client";

import { useCallback, useEffect, useState } from "react";
import type { LogisticsDestination } from "../map/logistics-network";
import type { LogisticsOverviewLeg } from "../map/logistics-overview";
import { selectLogisticsDestinations } from "../map/logistics-network";
import { buildLogisticsOverview } from "../map/logistics-overview";
import { normalizeLogisticsRouteResponse } from "../map/logistics-overview";
import { LogisticsMatrix } from "./LogisticsMatrix";
import type { SiteVisitCandidate } from "./site-visit-state";

type Props = {
	candidate: SiteVisitCandidate | null;
	destinations: readonly LogisticsDestination[];
	onOverviewChange: (
		overview: ReturnType<typeof buildLogisticsOverview> | null,
	) => void;
};

type RouteResponse = {
	data?: {
		mode: "live" | "baseline" | "unavailable";
		distanceMeters: number;
		durationSeconds: number;
		provider: string;
		fallback: boolean;
		geometry: LogisticsOverviewLeg["geometry"];
		observedOn?: string;
		sourceUrl?: string;
		errorCategory?: "provider_error" | "timeout" | "quota" | "invalid_response";
	};
};

export function LogisticsNetworkPanel({
	candidate,
	destinations,
	onOverviewChange,
}: Props) {
	const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
	const [legs, setLegs] = useState<LogisticsOverviewLeg[]>([]);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState(false);
	const selected = selectLogisticsDestinations(destinations, selectedCodes);
	const candidateKey = candidate
		? `${candidate.longitude}:${candidate.latitude}:${candidate.label}`
		: "none";
	useEffect(() => {
		void candidateKey;
		setLegs([]);
		setError(false);
		onOverviewChange(null);
	}, [candidateKey, onOverviewChange]);

	const toggle = (code: string) => {
		setLegs([]);
		setError(false);
		onOverviewChange(null);
		setSelectedCodes((current) =>
			current.includes(code)
				? current.filter((item) => item !== code)
				: current.length >= 20
					? current
					: [...current, code],
		);
	};

	const calculate = useCallback(async () => {
		if (!candidate || selected.length === 0) return;
		setPending(true);
		setError(false);
		const next: LogisticsOverviewLeg[] = [];
		let hadFailure = false;
		let cursor = 0;
		const worker = async () => {
			while (cursor < selected.length) {
				const destination = selected[cursor++];
				if (!destination) continue;
				try {
					const response = await fetch(
						`/api/site-visit/route?lng=${candidate.longitude}&lat=${candidate.latitude}&destination=${encodeURIComponent(destination.code)}`,
					);
					if (!response.ok) throw new Error("route");
					const payload = (await response.json()) as RouteResponse;
					const route = payload.data;
					if (!route) throw new Error("route");
					next.push(normalizeLogisticsRouteResponse(destination.code, route));
				} catch {
					hadFailure = true;
					next.push({
						destinationCode: destination.code,
						status: "unavailable",
						distanceMeters: null,
						durationSeconds: null,
						provider: "none",
						fallback: false,
					});
				}
			}
		};
		await Promise.all([worker(), worker(), worker()]);
		setLegs(next);
		setError(hadFailure);
		onOverviewChange(
			buildLogisticsOverview(
				{ longitude: candidate.longitude, latitude: candidate.latitude },
				selected,
				next,
			),
		);
		setPending(false);
	}, [candidate, onOverviewChange, selected]);

	const overview = candidate
		? buildLogisticsOverview(
				{ longitude: candidate.longitude, latitude: candidate.latitude },
				selected,
				legs,
			)
		: null;

	return (
		<section
			className="site-visit-network"
			aria-labelledby="site-visit-network-title"
		>
			<div className="site-visit-network-heading">
				<div>
					<p className="site-visit-kicker">Logistics network</p>
					<h2 id="site-visit-network-title">Connections from this site</h2>
					<p>
						Select up to 20 catalogue destinations. Results are advisory and may
						be partial.
					</p>
				</div>
				<strong>{selected.length}/20</strong>
			</div>
			<div className="site-visit-network-destinations">
				{destinations.slice(0, 20).map((destination) => (
					<label key={destination.code}>
						<input
							type="checkbox"
							checked={selectedCodes.includes(destination.code)}
							onChange={() => toggle(destination.code)}
						/>
						<span>{destination.name}</span>
						<small>{destination.kind}</small>
					</label>
				))}
			</div>
			<button
				type="button"
				className="btn btn-cta"
				disabled={!candidate || !selected.length || pending}
				onClick={() => void calculate()}
			>
				{pending ? "Calculating connections…" : "Calculate logistics network"}
			</button>
			{error && (
				<p className="site-visit-error" role="alert">
					Some route requests were unavailable.
				</p>
			)}
			{overview && (
				<div className="site-visit-network-summary" role="status">
					<strong>{overview.summary.live} live</strong>
					<span>{overview.summary.baseline} baseline</span>
					<span>{overview.summary.unavailable} unavailable</span>
				</div>
			)}
			{overview && <LogisticsMatrix destinations={selected} legs={legs} />}
		</section>
	);
}
