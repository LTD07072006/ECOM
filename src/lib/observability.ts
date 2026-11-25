export type TelemetryOutcome = "success" | "error" | "quota" | "fallback";
export type CacheState = "hit" | "miss" | "bypass";

export type ApiTelemetryEvent = {
	route: string;
	status: number;
	durationMs: number;
	outcome: TelemetryOutcome;
	provider?: string;
	fallback: boolean;
	cache: CacheState;
	occurredAt?: number;
};

export type TelemetrySummary = {
	requests: number;
	errors: number;
	quota: number;
	fallbacks: number;
	p50: number;
	p95: number;
	routes: Array<{ route: string; requests: number; p50: number; p95: number }>;
};

function percentile(values: number[], fraction: number): number {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((left, right) => left - right);
	return sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)] ?? 0;
}

export function summarizeTelemetry(
	events: readonly ApiTelemetryEvent[],
): TelemetrySummary {
	const durations = events.map((event) => event.durationMs);
	const routeMap = new Map<string, ApiTelemetryEvent[]>();
	for (const event of events) {
		const routeEvents = routeMap.get(event.route) ?? [];
		routeEvents.push(event);
		routeMap.set(event.route, routeEvents);
	}
	return {
		requests: events.length,
		errors: events.filter(
			(event) => event.status >= 500 || event.outcome === "error",
		).length,
		quota: events.filter(
			(event) => event.status === 429 || event.outcome === "quota",
		).length,
		fallbacks: events.filter(
			(event) => event.fallback || event.outcome === "fallback",
		).length,
		p50: percentile(durations, 0.5),
		p95: percentile(durations, 0.95),
		routes: [...routeMap.entries()].map(([route, routeEvents]) => ({
			route,
			requests: routeEvents.length,
			p50: percentile(
				routeEvents.map((event) => event.durationMs),
				0.5,
			),
			p95: percentile(
				routeEvents.map((event) => event.durationMs),
				0.95,
			),
		})),
	};
}

export function createTelemetryStore(maxEvents = 1_000) {
	const events: ApiTelemetryEvent[] = [];
	return {
		clear() {
			events.length = 0;
		},
		record(event: ApiTelemetryEvent) {
			events.push({ ...event, occurredAt: event.occurredAt ?? Date.now() });
			if (events.length > maxEvents)
				events.splice(0, events.length - maxEvents);
		},
		events(options: { hours?: number; now?: number } = {}) {
			const cutoff = options.hours
				? (options.now ?? Date.now()) - options.hours * 60 * 60 * 1000
				: undefined;
			return events.filter(
				(event) => cutoff === undefined || (event.occurredAt ?? 0) >= cutoff,
			);
		},
		summary() {
			return summarizeTelemetry(events);
		},
	};
}

const telemetryStore = createTelemetryStore();

export function getTelemetryStore() {
	return telemetryStore;
}
