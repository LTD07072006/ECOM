import type { PublicInquiryStatus } from "./repository";
import type { InquiryStatus } from "./validation";

export const STATUS_ORDER: readonly InquiryStatus[] = [
	"new",
	"contacted",
	"qualified",
	"closed",
] as const;

export type SlaBadgeState = "on_track" | "attention" | "completed";

export type NextStepGuidanceKey =
	| "awaiting_ipa_triage"
	| "ipa_contacted"
	| "qualified_review"
	| "case_closed"
	| "unknown";

export type InquiryStatusSummary = {
	stageIndex: number;
	progressPercent: number;
	elapsedHours: number | null;
	slaBadge: SlaBadgeState;
	nextStepKey: NextStepGuidanceKey;
};

const HOUR_MS = 60 * 60 * 1000;
const NEW_INQUIRY_SLA_HOURS = 48;

export function buildInquiryStatusSummary(
	inquiry: Pick<PublicInquiryStatus, "status" | "submittedAt">,
	nowMs = Date.now(),
): InquiryStatusSummary {
	const stageIndex = STATUS_ORDER.indexOf(inquiry.status);
	const progressPercent =
		stageIndex >= 0
			? Math.round(((stageIndex + 1) / STATUS_ORDER.length) * 100)
			: 0;

	const submittedMs = Date.parse(inquiry.submittedAt);
	const elapsedHours =
		Number.isFinite(submittedMs) &&
		Number.isFinite(nowMs) &&
		submittedMs <= nowMs
			? Math.round(((nowMs - submittedMs) / HOUR_MS) * 10) / 10
			: null;

	let slaBadge: SlaBadgeState = "on_track";
	if (inquiry.status === "closed") {
		slaBadge = "completed";
	} else if (
		inquiry.status === "new" &&
		elapsedHours !== null &&
		elapsedHours > NEW_INQUIRY_SLA_HOURS
	) {
		slaBadge = "attention";
	}

	let nextStepKey: NextStepGuidanceKey = "unknown";
	switch (inquiry.status) {
		case "new":
			nextStepKey = "awaiting_ipa_triage";
			break;
		case "contacted":
			nextStepKey = "ipa_contacted";
			break;
		case "qualified":
			nextStepKey = "qualified_review";
			break;
		case "closed":
			nextStepKey = "case_closed";
			break;
	}

	return {
		stageIndex,
		progressPercent,
		elapsedHours,
		slaBadge,
		nextStepKey,
	};
}
