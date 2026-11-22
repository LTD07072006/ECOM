import { error, json } from "../../../../lib/http";
import { loadPublicCatalog } from "../../../../features/geography/catalog";
import { getProfile } from "../../../../features/geography/domain";
import {
	boundedQuery,
	observeApi,
	uuidPattern,
} from "../../../../lib/api-operations";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
	return observeApi("profile", request, () => batchProfiles(request));
}

async function batchProfiles(request: Request) {
	const params = boundedQuery(request, "ids");
	if (!params) return error("Invalid batch parameters.", 400);
	const raw = (params.get("ids") ?? "").trim();
	if (!raw) return error("Select between 1 and 20 places.", 400);
	const ids = raw.split(",").map((id) => id.trim().toLowerCase());
	if (ids.length < 1 || ids.length > 20)
		return error("Select between 1 and 20 places.", 400);
	if (new Set(ids).size !== ids.length)
		return error("A place can only appear once in a batch request.", 400);
	if (ids.some((id) => !uuidPattern.test(id)))
		return error("Batch IDs must be valid geography IDs.", 400);

	const catalog = await loadPublicCatalog(ids);
	if (catalog.mode === "unavailable")
		return error("The geography catalog is temporarily unavailable.", 503);

	const profiles = ids
		.map((id) => getProfile(catalog, id))
		.filter(
			(profile): profile is NonNullable<typeof profile> => profile !== null,
		);

	if (profiles.length !== ids.length)
		return error("One or more geography units were not found.", 404);

	return json({
		data: profiles,
		meta: {
			dataStatus: catalog.mode,
			requested: ids.length,
			found: profiles.length,
		},
	});
}
