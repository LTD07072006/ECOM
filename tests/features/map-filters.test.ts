import { expect, test } from "bun:test";
import {
	readFilterInputs,
	summarizeLayerValues,
} from "../../src/features/map/filters";

const values = {
	a: 10,
	b: 20,
	c: 30,
	d: null,
	e: 40,
};

test("reads filter inputs and flags invalid or inverted bounds", () => {
	expect(readFilterInputs("", "")).toEqual({
		filter: { min: null, max: null },
		active: false,
		invalid: false,
		inverted: false,
	});
	expect(readFilterInputs("20", "")).toEqual({
		filter: { min: 20, max: null },
		active: true,
		invalid: false,
		inverted: false,
	});
	expect(readFilterInputs("", "20")).toEqual({
		filter: { min: null, max: 20 },
		active: true,
		invalid: false,
		inverted: false,
	});
	expect(readFilterInputs(" 20 ", " 40 ")).toEqual({
		filter: { min: 20, max: 40 },
		active: true,
		invalid: false,
		inverted: false,
	});
	expect(readFilterInputs("abc", "")).toMatchObject({
		invalid: true,
		active: false,
	});
	expect(readFilterInputs("40", "20")).toMatchObject({
		inverted: true,
		active: true,
	});
});

test("summarizes matches, missing values and values outside the bounds", () => {
	const summary = summarizeLayerValues(values, { min: 20, max: 30 });
	expect(summary.total).toBe(5);
	expect(summary.matchedIds.sort()).toEqual(["b", "c"]);
	expect(summary.matched).toBe(2);
	expect(summary.missing).toBe(1);
	expect(summary.below).toBe(1);
	expect(summary.above).toBe(1);
	expect(summary.active).toBe(true);
});

test("treats bounds as inclusive and reports an inactive filter without dropping values", () => {
	const inclusive = summarizeLayerValues(values, { min: 30, max: 30 });
	expect(inclusive.matchedIds).toEqual(["c"]);
	const inactive = summarizeLayerValues(values, { min: null, max: null });
	expect(inactive.active).toBe(false);
	expect(inactive.matched).toBe(4);
	expect(inactive.missing).toBe(1);
});

test("counts a layer with no values as fully missing", () => {
	const summary = summarizeLayerValues(
		{ a: null, b: null },
		{ min: 0, max: null },
	);
	expect(summary).toMatchObject({
		matched: 0,
		missing: 2,
		total: 2,
		below: 0,
		above: 0,
	});
});
