import type { Catalog, Geography, Profile } from "./types";

export function summarizeGeometryCoverage(geographies: Geography[]) {
	const boundaryReady = geographies.filter(
		(geo) =>
			geo.geometryStatus === "boundary_available" ||
			geo.geometryStatus === "boundary_verified",
	).length;
	const pointOnly = geographies.filter(
		(geo) => geo.geometryStatus === "point_only",
	).length;
	return {
		total: geographies.length,
		pointOnly,
		boundaryReady,
		publicBoundaryAvailable: boundaryReady > 0,
	};
}

export function normalizeSearch(value: string): string {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/đ/g, "d")
		.replace(/Đ/g, "D")
		.toLowerCase()
		.trim()
		.replace(/\s+/g, " ");
}

export function getPublicCatalog(catalog: Catalog): Catalog {
	if (
		catalog.publicationStatus !== "published" ||
		catalog.source?.access !== "public" ||
		catalog.source.status !== "active"
	) {
		return { ...catalog, geographies: [], observations: [] };
	}
	return {
		...catalog,
		observations: catalog.observations.filter(
			(o) => o.source.access === "public" && o.source.status === "active",
		),
	};
}

export type SearchFilter = {
	indicator?: string;
	min?: number;
	max?: number;
};

export function searchGeographies(
	catalog: Catalog,
	query: string,
	level?: Geography["level"],
	filter?: SearchFilter,
): Geography[] {
	const publicCatalog = getPublicCatalog(catalog);
	const normalized = query ? normalizeSearch(query) : "";
	const hasNumericFilter = Boolean(
		filter?.indicator && (filter.min !== undefined || filter.max !== undefined),
	);
	const observationsByGeo = hasNumericFilter
		? new Map(
				publicCatalog.observations
					.filter(
						(o) =>
							o.indicator === filter?.indicator &&
							o.quality !== "unavailable" &&
							o.value !== null,
					)
					.map((o) => [o.geoId, o.value as number]),
			)
		: null;

	return publicCatalog.geographies
		.filter((geo) => {
			if (level && geo.level !== level) return false;
			if (
				normalized &&
				!normalizeSearch(
					`${geo.name} ${geo.displayName} ${geo.normalizedName} ${geo.code}`,
				).includes(normalized)
			) {
				return false;
			}
			if (observationsByGeo) {
				const value = observationsByGeo.get(geo.id);
				if (value === undefined) return false;
				if (filter?.min !== undefined && value < filter.min) return false;
				if (filter?.max !== undefined && value > filter.max) return false;
			}
			return true;
		})
		.sort(
			(left, right) =>
				Number(normalized !== "" && right.code.toLowerCase() === normalized) -
				Number(normalized !== "" && left.code.toLowerCase() === normalized),
		)
		.slice(0, 50);
}

export function getProfile(catalog: Catalog, id: string): Profile | null {
	const publicCatalog = getPublicCatalog(catalog);
	const geography = publicCatalog.geographies.find((geo) => geo.id === id);
	if (!geography) return null;
	return {
		...geography,
		administrativeDataset: publicCatalog.dataset,
		observations: publicCatalog.observations.filter((o) => o.geoId === id),
	};
}

export function compareProfiles(profiles: Profile[]) {
	const failure = (reasonCode: string, reason: string) => ({
		compatible: false,
		reason,
		reasonCode,
		rows: [],
	});

	if (profiles.length < 2 || profiles.length > 3)
		return failure(
			"compare.selectTwoOrThree",
			"Select between two and three places to compare.",
		);
	if (new Set(profiles.map((profile) => profile.id)).size !== profiles.length)
		return failure(
			"compare.duplicatePlace",
			"A place can only appear once in a comparison.",
		);
	if (new Set(profiles.map((profile) => profile.level)).size !== 1)
		return failure(
			"compare.sameLevel",
			"Places must use the same geography level.",
		);
	if (new Set(profiles.map((profile) => profile.geographyVersion)).size !== 1)
		return failure(
			"compare.geographyVersion",
			"Places use different geography versions.",
		);

	const indicatorOrder = [
		...new Set(
			profiles.flatMap((profile) =>
				profile.observations.map((observation) => observation.indicator),
			),
		),
	];
	const observationsByProfile = profiles.map(
		(profile) =>
			new Map(
				profile.observations.map((observation) => [
					observation.indicator,
					observation,
				]),
			),
	);
	if (
		profiles.some(
			(_, index) =>
				observationsByProfile[index].size !==
				profiles[index].observations.length,
		)
	) {
		return failure(
			"compare.duplicateIndicators",
			"A place contains duplicate indicator observations.",
		);
	}

	const rows = indicatorOrder.map((indicator) => {
		const observations = observationsByProfile.map((map) => map.get(indicator));
		const present = observations.filter(
			(observation): observation is NonNullable<typeof observation> =>
				Boolean(observation),
		);
		const reference = present[0];
		const mismatch =
			!reference || present.length !== observations.length
				? {
						code: "compare.missingIndicator",
						reason: "Missing indicator for at least one place.",
					}
				: present.some(
							(o) =>
								o.source.id !== reference.source.id ||
								o.datasetVersion !== reference.datasetVersion ||
								o.dataset?.code !== reference.dataset?.code ||
								o.dataset?.id !== reference.dataset?.id,
						)
					? {
							code: "compare.differentSource",
							reason: "Different source or dataset snapshot.",
						}
					: present.some(
								(o) =>
									o.periodStart !== reference.periodStart ||
									o.periodEnd !== reference.periodEnd,
							)
						? {
								code: "compare.differentPeriod",
								reason: "Different observation periods.",
							}
						: present.some((o) => o.unit !== reference.unit)
							? { code: "compare.differentUnit", reason: "Different units." }
							: present.some(
										(o) =>
											o.definition !== reference.definition ||
											o.scope !== reference.scope,
									)
								? {
										code: "compare.differentDefinition",
										reason: "Different definitions or scope.",
									}
								: null;
		const metadataMatches = mismatch === null;
		return {
			indicator,
			label: reference?.label ?? indicator,
			unit: reference?.unit ?? "",
			metadataMatches,
			reason: mismatch?.reason ?? null,
			reasonCode: mismatch?.code ?? null,
			values: observations.map((observation) =>
				metadataMatches && observation?.quality !== "unavailable"
					? (observation?.value ?? null)
					: null,
			),
		};
	});
	const compatible =
		rows.length > 0 && rows.every((row) => row.metadataMatches);
	return {
		compatible,
		reason: compatible
			? null
			: "Some indicators have different dataset snapshots, periods, scopes, units or definitions, or are missing. See each row for details.",
		reasonCode: compatible ? null : "compare.incompatibleSummary",
		rows,
	};
}
