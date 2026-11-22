import { expect, test } from "bun:test";
import {
	buildFunnelBars,
	buildWeeklyBars,
	countSlaOverdue,
	isInquirySlaOverdue,
} from "../../src/features/inquiries/dashboard/sla";

test("SLA detector flags only new inquiries older than 48 hours", () => {
	const now = Date.parse("2026-11-22T12:00:00.000Z");
	const rows = [
		{ status: "new", created_at: "2026-11-20T10:00:00.000Z" }, // 50h -> overdue
		{ status: "new", created_at: "2026-11-20T13:00:00.000Z" }, // 47h -> ok
		{ status: "contacted", created_at: "2026-11-18T00:00:00.000Z" }, // already contacted -> ok
		{ status: "closed", created_at: "2026-11-10T00:00:00.000Z" }, // closed -> ok
	];

	expect(isInquirySlaOverdue(rows[0], now)).toBe(true);
	expect(isInquirySlaOverdue(rows[1], now)).toBe(false);
	expect(isInquirySlaOverdue(rows[2], now)).toBe(false);
	expect(countSlaOverdue(rows, now)).toBe(1);
});

test("buildFunnelBars and buildWeeklyBars compute chart proportions cleanly", () => {
	const funnel = buildFunnelBars({
		total: 20,
		byStatus: { new: 5, contacted: 8, qualified: 4, closed: 3 },
		byCloseReason: { resolved: 3 },
		contactedRate: 0.75,
		qualifiedRate: 0.35,
		averageHoursToContacted: 12.5,
		averageHoursToQualified: 24,
		weeklyTrend: { "2026-W46": 4, "2026-W47": 10, "2026-W45": 2 },
		byGeography: {},
		byCountry: {},
		bySector: {},
	});

	expect(funnel).toEqual([
		{ stage: "new", count: 5, percent: 25 },
		{ stage: "contacted", count: 8, percent: 40 },
		{ stage: "qualified", count: 4, percent: 20 },
		{ stage: "closed", count: 3, percent: 15 },
	]);

	const weekly = buildWeeklyBars({
		"2026-W46": 4,
		"2026-W47": 10,
		"2026-W45": 2,
	});
	expect(weekly.map((b) => b.week)).toEqual([
		"2026-W45",
		"2026-W46",
		"2026-W47",
	]);
	expect(weekly[2]).toEqual({
		week: "2026-W47",
		count: 10,
		heightPercent: 100,
	});
	expect(weekly[1]).toEqual({ week: "2026-W46", count: 4, heightPercent: 40 });
});
