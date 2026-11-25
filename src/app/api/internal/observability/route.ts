import { boundedQuery, observeApi } from "../../../../lib/api-operations";
import { error, json } from "../../../../lib/http";
import { releaseIdentity } from "../../../../features/releases/authorization";
import { parseObservabilityQuery } from "../../../../features/observability/metrics-query";
import {
	getTelemetryStore,
	summarizeTelemetry,
} from "../../../../lib/observability";
import { queryPersistedObservability } from "../../../../features/observability/repository";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
	return observeApi(
		"internal",
		request,
		async () => {
			const identity = releaseIdentity(request);
			if (!identity) return error("Unauthorized.", 401);
			const query = boundedQuery(request, "hours", "route");
			if (!query) return error("Invalid observability parameters.", 400);
			try {
				const filter = parseObservabilityQuery(query);
				const events = getTelemetryStore()
					.events({ hours: filter.hours })
					.filter((event) => !filter.route || event.route === filter.route);
				const persisted =
					process.env.NODE_ENV === "production"
						? await queryPersistedObservability(filter)
						: null;
				return json({
					data: {
						identity: identity.actor,
						windowHours: filter.hours,
						summary: persisted ?? summarizeTelemetry(events),
						events: events.length,
					},
				});
			} catch {
				return error("Invalid observability parameters.", 400);
			}
		},
		true,
	);
}
