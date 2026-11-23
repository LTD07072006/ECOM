import { z } from "zod";
import { matchIncentivesForSectorAndProvinces } from "../../../../features/decision/investment-incentives";
import { loadInvestmentIncentives } from "../../../../features/decision/investment-incentives-repository";
import { loadPublicCatalog } from "../../../../features/geography/catalog";
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
		if (!params) return error("Invalid incentive query parameters.", 400);

		const sectorRaw = params.get("sector")?.trim() || "manufacturing";
		const parsedSector = sectorSchema.safeParse(sectorRaw);
		if (!parsedSector.success) {
			return error("Invalid sector parameter.", 400);
		}

		const geoIdsRaw = params.get("geoIds")?.trim();
		const geoIds = geoIdsRaw
			? geoIdsRaw
					.split(",")
					.map((id) => id.trim().toLowerCase())
					.filter(Boolean)
			: [];
		if (geoIds.length > 10 || geoIds.some((id) => !uuidPattern.test(id))) {
			return error("Invalid geography IDs.", 400);
		}

		const [allIncentives, catalog] = await Promise.all([
			loadInvestmentIncentives(parsedSector.data),
			geoIds.length > 0
				? loadPublicCatalog(geoIds, false)
				: Promise.resolve(null),
		]);
		const provinces =
			catalog?.geographies.map((geo) => ({
				id: geo.id,
				code: geo.code,
				displayName: geo.displayName,
			})) ?? [];

		const matched = matchIncentivesForSectorAndProvinces(
			allIncentives,
			parsedSector.data,
			provinces,
		);

		return json({
			data: matched,
			meta: {
				sector: parsedSector.data,
				geoIds,
				incentiveCount: matched.incentives.length,
			},
		});
	});
}
