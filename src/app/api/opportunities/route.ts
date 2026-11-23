import { z } from "zod";
import { loadInvestmentOpportunities } from "../../../features/decision/investment-opportunities-repository";
import { boundedQuery, observeApi } from "../../../lib/api-operations";
import { error, json } from "../../../lib/http";

export const dynamic = "force-dynamic";

const sectorSchema = z.enum([
	"retail",
	"manufacturing",
	"logistics",
	"enterprise",
]);

export function GET(request: Request) {
	return observeApi("profile", request, async () => {
		const params = boundedQuery(request, "sector", "provinceCodes");
		if (!params) return error("Invalid opportunities query parameters.", 400);

		const sectorRaw = params.get("sector")?.trim() || undefined;
		const parsedSector = sectorRaw ? sectorSchema.safeParse(sectorRaw) : null;
		if (parsedSector && !parsedSector.success) {
			return error("Invalid sector parameter.", 400);
		}

		const codesRaw = params.get("provinceCodes")?.trim();
		const provinceCodes = codesRaw
			? codesRaw
					.split(",")
					.map((code) => code.trim())
					.filter(Boolean)
			: undefined;
		if (
			provinceCodes &&
			(provinceCodes.length > 34 ||
				provinceCodes.some((code) => !/^[0-9]{2}$/.test(code)))
		) {
			return error("Invalid provinceCodes parameter.", 400);
		}

		const opportunities = await loadInvestmentOpportunities({
			sector: parsedSector?.success ? parsedSector.data : undefined,
			provinceCodes,
		});

		return json({
			data: opportunities,
			meta: {
				sector: parsedSector?.success ? parsedSector.data : null,
				provinceCodes: provinceCodes ?? [],
				count: opportunities.length,
			},
		});
	});
}
