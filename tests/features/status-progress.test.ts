import { describe, expect, test } from "bun:test";
import { buildInquiryStatusSummary } from "../../src/features/inquiries/status-progress";

describe("Inquiry public status tracker summary", () => {
	test("computes stage progress, SLA badge, and elapsed hours across all 4 stages", () => {
		const nowMs = Date.parse("2026-11-23T12:00:00Z");

		const freshNew = buildInquiryStatusSummary(
			{ status: "new", submittedAt: "2026-11-23T00:00:00Z" },
			nowMs,
		);
		expect(freshNew.stageIndex).toBe(0);
		expect(freshNew.progressPercent).toBe(25);
		expect(freshNew.elapsedHours).toBe(12);
		expect(freshNew.slaBadge).toBe("on_track");
		expect(freshNew.nextStepKey).toBe("awaiting_ipa_triage");

		const overdueNew = buildInquiryStatusSummary(
			{ status: "new", submittedAt: "2026-11-20T00:00:00Z" },
			nowMs,
		);
		expect(overdueNew.elapsedHours).toBe(84);
		expect(overdueNew.slaBadge).toBe("attention");

		const contacted = buildInquiryStatusSummary(
			{ status: "contacted", submittedAt: "2026-11-20T00:00:00Z" },
			nowMs,
		);
		expect(contacted.stageIndex).toBe(1);
		expect(contacted.progressPercent).toBe(50);
		expect(contacted.slaBadge).toBe("on_track");
		expect(contacted.nextStepKey).toBe("ipa_contacted");

		const qualified = buildInquiryStatusSummary(
			{ status: "qualified", submittedAt: "2026-11-20T00:00:00Z" },
			nowMs,
		);
		expect(qualified.stageIndex).toBe(2);
		expect(qualified.progressPercent).toBe(75);
		expect(qualified.nextStepKey).toBe("qualified_review");

		const closed = buildInquiryStatusSummary(
			{ status: "closed", submittedAt: "2026-11-10T00:00:00Z" },
			nowMs,
		);
		expect(closed.stageIndex).toBe(3);
		expect(closed.progressPercent).toBe(100);
		expect(closed.slaBadge).toBe("completed");
		expect(closed.nextStepKey).toBe("case_closed");
	});

	test("returns null elapsedHours for malformed or future timestamps", () => {
		const nowMs = Date.parse("2026-11-23T12:00:00Z");
		const badDate = buildInquiryStatusSummary(
			{ status: "new", submittedAt: "not-a-date" },
			nowMs,
		);
		expect(badDate.elapsedHours).toBeNull();
		expect(badDate.slaBadge).toBe("on_track");

		const futureDate = buildInquiryStatusSummary(
			{ status: "new", submittedAt: "2026-11-24T00:00:00Z" },
			nowMs,
		);
		expect(futureDate.elapsedHours).toBeNull();
		expect(futureDate.slaBadge).toBe("on_track");
	});
});
