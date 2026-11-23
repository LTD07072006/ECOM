import { z } from "zod";
import { findProvincesWithinInfrastructureRadius } from "../../../../features/map/proximity-repository";
import { boundedQuery, observeApi } from "../../../../lib/api-operations";
import { error, json } from "../../../../lib/http";

export const dynamic = "force-dynamic";

const querySchema = z.object({
	kind: z.enum([
		"airport",
		"seaport",
		"industrial_park",
		"icd",
		"expressway_node",
	]),
	maxKm: z.coerce
		.number()
		.finite("Radius must be a valid number in kilometers.")
		.min(1, "Radius must be between 1 and 1500 km.")
		.max(1500, "Radius must be between 1 and 1500 km."),
});

export function GET(request: Request) {
	return observeApi("search", request, async () => {
		const params = boundedQuery(request, "kind", "maxKm");
		if (!params) return error("Invalid proximity parameters.", 400);
		const parsed = querySchema.safeParse({
			kind: params.get("kind") ?? undefined,
			maxKm: params.get("maxKm") ?? undefined,
		});
		if (!parsed.success) {
			return error(
				parsed.error.issues[0]?.message ?? "Invalid proximity query.",
				400,
			);
		}
		const result = await findProvincesWithinInfrastructureRadius(
			parsed.data.kind,
			parsed.data.maxKm,
		);
		if (result.mode === "unavailable") {
			return error(
				"Spatial proximity service is temporarily unavailable.",
				503,
			);
		}
		return json({
			data: {
				matchedProvinceIds: result.matchedProvinceIds,
				provinces: result.provinces,
				pois: result.pois,
			},
			meta: {
				kind: result.kind,
				maxKm: result.maxKm,
				totalProvinces: result.totalProvinces,
				matchedCount: result.matchedCount,
				engine: "postgis_st_dwithin",
			},
		});
	});
}
