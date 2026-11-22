import { expect, test } from "bun:test";
import {
	en,
	formatDate,
	formatNumber,
	messages,
	translate,
} from "../../src/lib/i18n";
import { vi } from "../../src/lib/i18n/vi";
import {
	defaultLocaleForPath,
	intlLocale,
	isLocale,
	parseLocale,
} from "../../src/lib/i18n/locale";

const placeholders = (value: string) =>
	[...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

test("every English message has a Vietnamese translation with the same placeholders", () => {
	for (const key of Object.keys(en) as Array<keyof typeof en>) {
		expect(vi[key]?.length).toBeGreaterThan(0);
		expect(placeholders(vi[key])).toEqual(placeholders(en[key]));
	}
	expect(Object.keys(vi).sort()).toEqual(Object.keys(en).sort());
});

test("translate interpolates parameters and keeps unknown placeholders", () => {
	expect(translate("en", "map.coverage", { ready: 34, total: 34 })).toBe(
		"34 of 34 provincial boundaries published.",
	);
	expect(translate("vi", "map.coverage", { ready: 34, total: 34 })).toBe(
		"Đã công bố 34/34 ranh giới tỉnh.",
	);
	expect(translate("en", "map.coverage", { ready: 1 })).toBe(
		"1 of {total} provincial boundaries published.",
	);
	expect(translate("vi", "search.none")).toBe("Không có địa bàn phù hợp.");
});

test("locale resolution falls back to the route default and ignores unknown values", () => {
	expect(isLocale("vi")).toBe(true);
	expect(isLocale("fr")).toBe(false);
	expect(parseLocale("vi")).toBe("vi");
	expect(parseLocale("fr")).toBe("en");
	expect(parseLocale(undefined, "vi")).toBe("vi");
	expect(defaultLocaleForPath("/")).toBe("en");
	expect(defaultLocaleForPath("/decision")).toBe("en");
	expect(defaultLocaleForPath("/internal/inquiries")).toBe("vi");
	expect(defaultLocaleForPath("/internal/releases")).toBe("vi");
	expect(messages.vi).toBe(vi);
});

test("number and date formatting follow the active locale", () => {
	expect(intlLocale("vi")).toBe("vi-VN");
	expect(intlLocale("en")).toBe("en-US");
	expect(formatNumber("en", 8857526)).toBe("8,857,526");
	expect(formatNumber("vi", 8857526)).toBe("8.857.526");
	expect(formatDate("en", "2026-11-20")).toContain("2026");
	expect(formatDate("vi", "2026-11-20")).toContain("2026");
});
