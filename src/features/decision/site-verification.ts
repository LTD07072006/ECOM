import { curatedProvinceMicroLocations } from "../map/province-detail-locations";
import type { WageRegion } from "./site-screening";

export type VerificationStatus =
	| "unverified"
	| "pending_review"
	| "verified"
	| "expired";

export type VerificationAction = "approve" | "reject" | "revalidate";

export function transitionVerificationStatus(
	current: VerificationStatus,
	action: VerificationAction,
): VerificationStatus {
	if (action === "approve" && current === "pending_review") return "verified";
	if (action === "reject" && current === "pending_review") return "unverified";
	if (
		action === "revalidate" &&
		(current === "verified" || current === "expired")
	)
		return "pending_review";
	return current;
}

export type Evidence<T> = {
	value: T;
	sourceUrl: string;
	verifiedOn: string;
	scope: string;
	reviewer?: string;
	expiresOn?: string;
	status?: VerificationStatus;
};

export function createVerificationEvidence<T>({
	field,
	value,
	sourceUrl,
	verifiedOn,
	reviewer,
	expiresOn,
	status = "verified",
}: {
	field: string;
	value: T;
	sourceUrl: string;
	verifiedOn: string;
	reviewer: string;
	expiresOn?: string;
	status?: VerificationStatus;
}): Evidence<T> & {
	field: string;
	reviewer: string;
	status: VerificationStatus;
} {
	return {
		field,
		value,
		sourceUrl,
		verifiedOn,
		scope: "individual industrial park evidence",
		reviewer,
		expiresOn,
		status,
	};
}

export function verificationStatus(
	evidence: Pick<Evidence<unknown>, "status" | "expiresOn">,
	asOf = new Date().toISOString().slice(0, 10),
): VerificationStatus {
	if (evidence.status === "unverified" || evidence.status === "pending_review")
		return evidence.status;
	if (evidence.expiresOn && evidence.expiresOn < asOf) return "expired";
	return "verified";
}

type ParkFields = {
	area: Evidence<number> | null;
	region: Evidence<WageRegion> | null;
	power: Evidence<number> | null;
	wastewater: Evidence<number> | null;
};

const unknownFields: ParkFields = {
	area: null,
	region: null,
	power: null,
	wastewater: null,
};

// Homepage links and cluster-wide figures in the research dossier are leads,
// not evidence of availability or of conditions at an individual parcel.
const pilotFields: Readonly<Record<string, ParkFields>> = {
	"BN-IZ-YENPHONG": unknownFields,
	"BN-IZ-VSIP": unknownFields,
	"HP-IZ-DEEPC": unknownFields,
	"HP-IZ-VSIP": unknownFields,
	"HP-IZ-TRANGDUE": unknownFields,
	"DNA-IZ-LONGTHANH": unknownFields,
	"DNA-IZ-NHONTRACH": unknownFields,
};

export function pilotParksForDistrict(
	provinceCode: string,
	linkedIds: readonly string[],
) {
	return curatedProvinceMicroLocations.flatMap((site) => {
		const fields = pilotFields[site.id];
		return fields &&
			site.provinceCode === provinceCode &&
			linkedIds.includes(site.id)
			? [
					{
						id: site.id,
						name: site.name,
						longitude: site.longitude,
						latitude: site.latitude,
						contactUrl: site.officialUrl,
						fields,
					},
				]
			: [];
	});
}

export type VerificationField = keyof ParkFields | "sector" | "infrastructure";

export function verificationFields(
	missing: readonly VerificationField[],
	park?: ReturnType<typeof pilotParksForDistrict>[number],
) {
	const questions = new Set(missing);
	if (park) {
		for (const field of ["area", "region", "power", "wastewater"] as const) {
			if (park.fields[field] === null) questions.add(field);
		}
	}
	return [...questions];
}
