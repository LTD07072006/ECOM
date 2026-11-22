import type { RegionIds } from "./RegionPanel";

export type SavedRegionComparison = {
	name: string;
	regions: RegionIds;
	savedAt: string;
};
const uuid =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function readSavedRegions(raw: string | null): SavedRegionComparison[] {
	try {
		const parsed: unknown = JSON.parse(raw ?? "[]");
		if (!Array.isArray(parsed)) return [];
		return parsed
			.filter((item): item is SavedRegionComparison => {
				if (!item || typeof item !== "object") return false;
				const v = item as Record<string, unknown>;
				if (
					typeof v.name !== "string" ||
					!v.name.trim() ||
					v.name.length > 80 ||
					typeof v.savedAt !== "string" ||
					!Array.isArray(v.regions) ||
					v.regions.length !== 2
				)
					return false;
				if (
					!v.regions.every(
						(group: unknown) =>
							Array.isArray(group) &&
							group.length <= 10 &&
							group.every(
								(id: unknown) => typeof id === "string" && uuid.test(id),
							),
					)
				)
					return false;
				const ids = v.regions.flat();
				return new Set(ids).size === ids.length && ids.length > 0;
			})
			.slice(0, 20);
	} catch {
		return [];
	}
}
