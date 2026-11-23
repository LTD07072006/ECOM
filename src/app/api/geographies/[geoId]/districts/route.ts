import {
	loadDatabaseCatalog,
	loadPublishedCommuneBoundary,
} from "../../../../../features/geography/database-repository";
import { getProvinceDistricts } from "../../../../../features/map/province-districts";
import {
	boundedQuery,
	observeApi,
	uuidPattern,
} from "../../../../../lib/api-operations";
import { error, json } from "../../../../../lib/http";

export function GET(
	request: Request,
	context: { params: Promise<{ geoId: string }> },
) {
	return observeApi("profile", request, async () => {
		const { geoId } = await context.params;
		const params = boundedQuery(request, "unit");
		const unit = params?.get("unit");
		if (
			!params ||
			(unit !== null && (unit === undefined || !uuidPattern.test(unit)))
		)
			return error("Invalid sub-area parameters.", 400);
		if (!uuidPattern.test(geoId)) return error("Province not found.", 404);
		try {
			const id = geoId.toLowerCase();
			const catalog = await loadDatabaseCatalog([id], false, "province");
			const province = catalog.geographies[0];
			if (!province) return error("Province not found.", 404);
			if (unit)
				return json({
					data: await loadPublishedCommuneBoundary(id, unit.toLowerCase()),
				});
			const children = await loadDatabaseCatalog(
				undefined,
				false,
				"commune",
				id,
			);
			return json({
				data: getProvinceDistricts(province, children.geographies),
			});
		} catch {
			return error("Sub-area data is temporarily unavailable.", 503);
		}
	});
}
