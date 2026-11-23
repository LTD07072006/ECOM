import { describe, expect, test } from "bun:test";
import {
	estimateTimelineSummary,
	getRoadmapForTrack,
	sanitizeCompletedByTrack,
} from "../../src/features/guide/licensing-roadmap";

describe("FDI licensing roadmap & timeline estimation", () => {
	test("outside-IP manufacturing includes Investment Policy Approval while inside-IP skips it", () => {
		const outsideIp = getRoadmapForTrack("manufacturing_outside_ip");
		const insideIp = getRoadmapForTrack("manufacturing_in_ip");

		expect(outsideIp.some((s) => s.id === "investment-policy-approval")).toBe(
			true,
		);
		expect(insideIp.some((s) => s.id === "investment-policy-approval")).toBe(
			false,
		);
		expect(outsideIp.length).toBe(6);
		expect(insideIp.length).toBe(5);
	});

	test("retail track focuses on IRC, ERC, and retail licensing/ENT without industrial EIA or FPT", () => {
		const retail = getRoadmapForTrack("retail");
		expect(retail.map((s) => s.id)).toEqual([
			"irc",
			"erc",
			"construction-or-retail-license",
		]);
	});

	test("logistics track includes EIA and Fire Prevention appraisal", () => {
		const logistics = getRoadmapForTrack("logistics");
		expect(logistics.map((s) => s.id)).toEqual([
			"irc",
			"erc",
			"eia-env-permit",
			"fire-safety",
			"construction-or-retail-license",
		]);
	});

	test("estimateTimelineSummary calculates completion percentage and subtracts completed days accurately", () => {
		const initial = estimateTimelineSummary("manufacturing_in_ip", []);
		expect(initial.totalSteps).toBe(5);
		expect(initial.completedSteps).toBe(0);
		expect(initial.progressPercent).toBe(0);
		expect(initial.totalMinDays).toBe(78);
		expect(initial.totalMaxDays).toBe(110);
		expect(initial.remainingMinDays).toBe(78);
		expect(initial.remainingMaxDays).toBe(110);

		const partial = estimateTimelineSummary("manufacturing_in_ip", [
			"irc",
			"erc",
			"non-existent-step",
		]);
		expect(partial.completedSteps).toBe(2);
		expect(partial.progressPercent).toBe(40);
		expect(partial.remainingMinDays).toBe(60);
		expect(partial.remainingMaxDays).toBe(90);

		const allIds = getRoadmapForTrack("manufacturing_in_ip").map((s) => s.id);
		const done = estimateTimelineSummary("manufacturing_in_ip", allIds);
		expect(done.progressPercent).toBe(100);
		expect(done.remainingMinDays).toBe(0);
		expect(done.remainingMaxDays).toBe(0);
	});

	test("sanitizeCompletedByTrack discards malformed tracks, non-arrays, and unknown step IDs", () => {
		expect(sanitizeCompletedByTrack(null)).toEqual({});
		expect(sanitizeCompletedByTrack([])).toEqual({});
		expect(
			sanitizeCompletedByTrack({
				manufacturing_in_ip: [
					"irc",
					123,
					null,
					"irc",
					"investment-policy-approval",
				],
				retail: "corrupted-string",
				unknown_track: ["irc"],
				logistics: ["eia-env-permit", "fire-safety"],
			}),
		).toEqual({
			manufacturing_in_ip: ["irc"],
			logistics: ["eia-env-permit", "fire-safety"],
		});
	});
});
