import { expect, test } from "bun:test";
import {
	parseScenarioParams,
	serializeScenarioParams,
} from "../../src/features/decision/scenario-url";

test("scenario link round-trips valid options and explicit zero", () => {
	const state = {
		geos: ["24", "31"],
		sector: "logistics",
		region: "II",
		rent: 0,
		elec: 2300,
		area: 500,
		rentShock: -10,
		elecShock: 15,
	} as const;
	expect(parseScenarioParams(serializeScenarioParams(state))).toEqual(state);
});

test("scenario link drops malformed, duplicated and out-of-range fields", () => {
	expect(
		parseScenarioParams(
			new URLSearchParams(
				"geos=24,24&sector=constructor&area=&rent=Infinity&elec=-1&rentShock=17&elecShock=-25&region=I&region=II",
			),
		),
	).toEqual({});
});
