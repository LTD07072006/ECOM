import { z } from "zod";
import { loadPublishedSurveyStudies } from "../../../../features/decision/survey-evidence-repository";
import {
	boundedQuery,
	observeApi,
	uuidPattern,
} from "../../../../lib/api-operations";
import { error, json } from "../../../../lib/http";

export const dynamic = "force-dynamic";

const sectorSchema = z.enum([
	"retail",
	"manufacturing",
	"logistics",
	"enterprise",
]);

export function GET(request: Request) {
	return observeApi("profile", request, async () => {
		const params = boundedQuery(request, "sector", "geoIds");
		if (!params) return error("Invalid evidence query parameters.", 400);

		const sectorRaw = params.get("sector")?.trim() || undefined;
		const parsedSector = sectorRaw ? sectorSchema.safeParse(sectorRaw) : null;
		if (parsedSector && !parsedSector.success) {
			return error("Invalid sector parameter.", 400);
		}

		const geoIdsRaw = params.get("geoIds")?.trim();
		const geoIds = geoIdsRaw
			? geoIdsRaw
					.split(",")
					.map((id) => id.trim().toLowerCase())
					.filter(Boolean)
			: undefined;
		if (
			geoIds &&
			(geoIds.length > 10 || geoIds.some((id) => !uuidPattern.test(id)))
		) {
			return error("Invalid geography IDs.", 400);
		}

		const studies = await loadPublishedSurveyStudies(
			parsedSector?.success ? parsedSector.data : undefined,
			geoIds,
		);
		return json({
			data: {
				status: studies.length > 0 ? "available" : "unavailable",
				reason: studies.length > 0 ? null : "no_published_survey",
				studies,
			},
			meta: {
				sector: parsedSector?.success ? parsedSector.data : null,
				geoIds: geoIds ?? [],
			},
		});
	});
}
