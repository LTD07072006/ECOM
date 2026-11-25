"use client";

import { useEffect, useState } from "react";

type Metrics = {
	windowHours: number;
	summary: {
		requests: number;
		errors: number;
		quota: number;
		fallbacks: number;
		p50: number;
		p95: number;
		routes: Array<{
			route: string;
			requests: number;
			p50: number;
			p95: number;
		}>;
	};
};

export function ObservabilityDashboard() {
	const [hours, setHours] = useState("6");
	const [metrics, setMetrics] = useState<Metrics | null>(null);
	const [state, setState] = useState<"loading" | "ready" | "error">("loading");
	useEffect(() => {
		const controller = new AbortController();
		setState("loading");
		fetch(`/api/internal/observability?hours=${hours}`, {
			signal: controller.signal,
		})
			.then(async (response) => {
				if (!response.ok) throw new Error("metrics unavailable");
				const payload = (await response.json()) as { data?: Metrics };
				if (!payload.data) throw new Error("metrics unavailable");
				setMetrics(payload.data);
				setState("ready");
			})
			.catch((error: unknown) => {
				if (error instanceof DOMException && error.name === "AbortError")
					return;
				setState("error");
			});
		return () => controller.abort();
	}, [hours]);
	return (
		<main className="internal-page" id="observability-main" tabIndex={-1}>
			<header className="internal-page-header">
				<p className="eyebrow">Operations</p>
				<h1>Production observability</h1>
				<p>
					Aggregated API latency, provider reliability and quota pressure. No
					request contents are stored here.
				</p>
			</header>
			<section aria-labelledby="observability-controls">
				<h2 id="observability-controls">Window</h2>
				<label htmlFor="observability-hours">Hours</label>
				<select
					id="observability-hours"
					value={hours}
					onChange={(event) => setHours(event.target.value)}
				>
					<option value="1">1</option>
					<option value="6">6</option>
					<option value="12">12</option>
					<option value="24">24</option>
				</select>
			</section>
			{state === "loading" && <p role="status">Loading metrics…</p>}
			{state === "error" && <p role="alert">Metrics are unavailable.</p>}
			{state === "ready" && metrics && (
				<>
					<section
						className="internal-metric-grid"
						aria-label="Summary metrics"
					>
						<strong>Requests: {metrics.summary.requests}</strong>
						<strong>P50: {metrics.summary.p50} ms</strong>
						<strong>P95: {metrics.summary.p95} ms</strong>
						<strong>5xx: {metrics.summary.errors}</strong>
						<strong>429: {metrics.summary.quota}</strong>
						<strong>Fallbacks: {metrics.summary.fallbacks}</strong>
					</section>
					<table>
						<caption>Latency by API route</caption>
						<thead>
							<tr>
								<th>Route</th>
								<th>Requests</th>
								<th>P50</th>
								<th>P95</th>
							</tr>
						</thead>
						<tbody>
							{metrics.summary.routes.map((row) => (
								<tr key={row.route}>
									<th scope="row">{row.route}</th>
									<td>{row.requests}</td>
									<td>{row.p50} ms</td>
									<td>{row.p95} ms</td>
								</tr>
							))}
						</tbody>
					</table>
				</>
			)}
		</main>
	);
}
