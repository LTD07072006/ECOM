"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LogisticsDestination } from "../map/logistics-network";
import { selectLogisticsDestinations } from "../map/logistics-network";
import type {
	LogisticsOverviewLeg,
	LogisticsRouteResponse,
} from "../map/logistics-overview";
import {
	buildLogisticsOverview,
	normalizeLogisticsRouteResponse,
} from "../map/logistics-overview";
import { LogisticsMatrix } from "./LogisticsMatrix";
import type { SiteVisitCandidate } from "./site-visit-state";

type Props = {
	candidate: SiteVisitCandidate | null;
	destinations: readonly LogisticsDestination[];
	onOverviewChange: (
		overview: ReturnType<typeof buildLogisticsOverview> | null,
	) => void;
	onDestinationSelect?: (destinationCode: string) => void;
};

export function LogisticsNetworkPanel({
	candidate,
	destinations,
	onOverviewChange,
	onDestinationSelect,
}: Props) {
	const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
	const [legs, setLegs] = useState<LogisticsOverviewLeg[]>([]);
	const [pending, setPending] = useState(false);
	const [error, setError] = useState(false);
	const activeRequest = useRef<AbortController | null>(null);
	const selected = selectLogisticsDestinations(destinations, selectedCodes);
	const candidateKey = candidate
		? `${candidate.longitude}:${candidate.latitude}:${candidate.label}`
		: "none";
	useEffect(() => {
		void candidateKey;
		setLegs([]);
		setPending(false);
		setError(false);
		onOverviewChange(null);
		return () => activeRequest.current?.abort();
	}, [candidateKey, onOverviewChange]);

	const toggle = (code: string) => {
		activeRequest.current?.abort();
		setLegs([]);
		setPending(false);
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
		activeRequest.current?.abort();
		const request = new AbortController();
		activeRequest.current = request;
		setPending(true);
		setError(false);
		const next: LogisticsOverviewLeg[] = [];
		let hadFailure = false;
		let cursor = 0;
		const worker = async () => {
			while (!request.signal.aborted && cursor < selected.length) {
				const destination = selected[cursor++];
				if (!destination) continue;
				try {
					const response = await fetch(
						`/api/site-visit/route?lng=${candidate.longitude}&lat=${candidate.latitude}&destination=${encodeURIComponent(destination.code)}`,
						{ signal: request.signal },
					);
					if (!response.ok) throw new Error("route");
					const payload = (await response.json()) as {
						data?: LogisticsRouteResponse;
					};
					const route = payload.data;
					if (!route) throw new Error("route");
					next.push(normalizeLogisticsRouteResponse(destination.code, route));
				} catch {
					if (request.signal.aborted) return;
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
		if (request.signal.aborted) return;
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
			{overview && (
				<LogisticsMatrix
					destinations={selected}
					legs={legs}
					onDestinationSelect={onDestinationSelect}
				/>
			)}
		</section>
	);
}
