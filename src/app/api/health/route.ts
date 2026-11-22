import { error, json } from "../../../lib/http";
import { checkPublicReadiness } from "../../../features/geography/catalog";
import { boundedQuery, observeApi } from "../../../lib/api-operations";

export function GET(request: Request) {
	return observeApi("health", request, () => health(request));
}

async function health(request: Request) {
	if (!boundedQuery(request)) return error("Invalid health parameters.", 400);
	const status = await checkPublicReadiness();
	const ready = status.mode === "database";
	return json({
		status:
			ready && status.publicationStatus === "published" ? "ok" : "degraded",
		database: ready ? "ready" : "unavailable",
		mode: status.mode,
		publicationStatus: status.publicationStatus,
	});
}
