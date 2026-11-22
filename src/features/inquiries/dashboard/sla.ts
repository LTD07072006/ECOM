import type { InquiryMetrics, InquiryRow } from "./types";

export const SLA_NEW_INQUIRY_HOURS = 48;

export function inquiryAgeHours(
	createdAt: string | undefined,
	nowMs = Date.now(),
): number | null {
	if (!createdAt) return null;
	const parsed = Date.parse(createdAt);
	if (!Number.isFinite(parsed)) return null;
	return Math.max(0, (nowMs - parsed) / (60 * 60 * 1000));
}

export function isInquirySlaOverdue(
	row: Pick<InquiryRow, "status" | "created_at">,
	nowMs = Date.now(),
	thresholdHours = SLA_NEW_INQUIRY_HOURS,
): boolean {
	if (row.status !== "new") return false;
	const age = inquiryAgeHours(row.created_at, nowMs);
	return age !== null && age > thresholdHours;
}

export function countSlaOverdue(
	rows: ReadonlyArray<Pick<InquiryRow, "status" | "created_at">>,
	nowMs = Date.now(),
	thresholdHours = SLA_NEW_INQUIRY_HOURS,
): number {
	return rows.filter((row) => isInquirySlaOverdue(row, nowMs, thresholdHours))
		.length;
}

export type FunnelStageBar = {
	stage: "new" | "contacted" | "qualified" | "closed";
	count: number;
	percent: number;
};

export function buildFunnelBars(metrics: InquiryMetrics): FunnelStageBar[] {
	const total = Math.max(metrics.total, 0);
	const stages: Array<FunnelStageBar["stage"]> = [
		"new",
		"contacted",
		"qualified",
		"closed",
	];
	return stages.map((stage) => {
		const count = metrics.byStatus[stage] ?? 0;
		const percent = total > 0 ? Math.round((count / total) * 100) : 0;
		return { stage, count, percent };
	});
}

export type WeeklyTrendBar = {
	week: string;
	count: number;
	heightPercent: number;
};

export function buildWeeklyBars(
	weeklyTrend: Record<string, number>,
	maxBars = 12,
): WeeklyTrendBar[] {
	const entries = Object.entries(weeklyTrend)
		.sort(([left], [right]) => left.localeCompare(right))
		.slice(-maxBars);
	const peak = entries.reduce((max, [, count]) => Math.max(max, count), 0);
	return entries.map(([week, count]) => ({
		week,
		count,
		heightPercent: peak > 0 ? Math.max(6, Math.round((count / peak) * 100)) : 0,
	}));
}
