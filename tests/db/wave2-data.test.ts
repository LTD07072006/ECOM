import { expect, test } from "bun:test";
import { loadWave2 } from "../../src/db/wave2-data";

test("Wave 2 airport records require classification, operational status and evidence source", async () => {
	const release = await loadWave2("data/sprint3/manifest.json");

	expect(release.points).toHaveLength(24);
	expect(release.points.find((point) => point.id === "VVCI")).toMatchObject({
		airportClassification: "international",
		airportOperationalStatus: "operational",
		classificationSourceUrl: "https://acv.vn/vi/ve-acv",
	});
	expect(release.points.find((point) => point.id === "VVNS")).toMatchObject({
		airportClassification: "domestic",
		airportOperationalStatus: "not_operational",
		longitude: null,
		latitude: null,
	});
	expect(release.ports).toHaveLength(8);
	expect(release.ports.find((port) => port.id === "VNHPH-LH")).toMatchObject({
		kind: "seaport",
		portType: "deep_sea",
		operationalStatus: "operational",
		classificationSourceUrl: "https://vinamarine.gov.vn/",
	});
	expect(release.ports.find((port) => port.id === "VNVCA-CP")).toMatchObject({
		portType: "river",
	});
});
