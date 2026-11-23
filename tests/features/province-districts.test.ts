import { expect, test } from "bun:test";
import type { Polygon } from "geojson";
import { curatedProvinceMicroLocations } from "../../src/features/map/province-detail-locations";
import administration from "../../data/sprint1/administration.json";
import { canonicalInfrastructurePois } from "../../src/features/map/proximity";
import { canonicalInvestmentOpportunities } from "../../src/features/decision/investment-opportunities";
import { canonicalIpaContacts } from "../../src/features/inquiries/ipa-directory";
import {
	classifyDistrict,
	getProvinceDistricts,
	toDistrictBoundaryGeoJson,
} from "../../src/features/map/province-districts";

const province = { id: "province", code: "01", name: "Hà Nội" };

test("published province codes and curated district links agree", () => {
	const provinces = administration.filter((unit) => unit.parent === "VN");
	const codes = new Set(provinces.map((unit) => unit.code));
	const locations = new Map(
		curatedProvinceMicroLocations.map((item) => [item.id, item]),
	);
	expect(codes.size).toBe(34);
	for (const item of [
		...canonicalInfrastructurePois,
		...canonicalInvestmentOpportunities,
		...canonicalIpaContacts,
	]) {
		if (item.provinceCode !== null)
			expect(codes.has(item.provinceCode)).toBeTrue();
	}
	for (const location of locations.values())
		expect(codes.has(location.provinceCode)).toBeTrue();
	const districts = provinces.flatMap((unit) =>
		getProvinceDistricts({ ...unit, id: unit.code }, []),
	);
	expect(districts.length).toBeGreaterThanOrEqual(25);
	for (const district of districts) {
		expect(district.demographics.purchasingPower).not.toBeNull();
		expect(district.recommendedSectors.length).toBeGreaterThanOrEqual(2);
		for (const id of district.linkedMicroLocationIds)
			expect(locations.get(id)?.provinceCode).toBe(district.provinceCode);
	}
});
const ward = {
	id: "ward",
	code: "001",
	parentId: province.id,
	name: "Cầu Giấy",
	displayName: "Phường Cầu Giấy",
	longitude: 105.8,
	latitude: 21,
};

test("distinguishes official communes from advisory investment areas", () => {
	expect(classifyDistrict("current", "manufacturing")).toBe("ward_cluster");
	expect(classifyDistrict("advisory", "manufacturing")).toBe("industrial");
	expect(classifyDistrict("advisory", "logistics")).toBe("gateway");
});

test("scopes catalogue children and curated profiles to one province", () => {
	const profiles = getProvinceDistricts(province, [
		ward,
		{ ...ward, id: "other", parentId: "elsewhere" },
	]);
	expect(
		profiles.filter((item) => item.scope === "current").map((item) => item.id),
	).toEqual(["ward"]);
	expect(
		profiles.every((item) => item.provinceCode === province.code),
	).toBeTrue();
	expect(
		profiles.find((item) => item.id === "ward")?.demographics.population,
	).toBeNull();
});

test("emits only sourced polygon geometry, never a synthetic boundary", () => {
	const geometry: Polygon = {
		type: "Polygon",
		coordinates: [
			[
				[105, 21],
				[106, 21],
				[106, 22],
				[105, 21],
			],
		],
	};
	const wardProfile = getProvinceDistricts(province, [ward]).find(
		(item) => item.id === "ward",
	);
	const advisory = getProvinceDistricts(province, []).at(0);
	expect(
		toDistrictBoundaryGeoJson(wardProfile, geometry).features[0]?.geometry,
	).toEqual(geometry);
	expect(toDistrictBoundaryGeoJson(advisory, geometry).features).toEqual([]);
	expect(toDistrictBoundaryGeoJson(wardProfile, null).features).toEqual([]);
});
