import { z } from "zod";
import { INQUIRY_NOTICE_VERSION } from "./privacy";

export const inquiryStatuses = [
	"new",
	"contacted",
	"qualified",
	"closed",
] as const;
export type InquiryStatus = (typeof inquiryStatuses)[number];
export const closeReasons = [
	"spam",
	"duplicate",
	"out_of_scope",
	"resolved",
] as const;
export type InquiryCloseReason = (typeof closeReasons)[number];

const optionalText = (max: number) =>
	z
		.string()
		.trim()
		.max(max)
		.optional()
		.transform((value) => (value ? value : undefined));
const email = z
	.string()
	.trim()
	.email()
	.max(254)
	.transform((value) => value.toLowerCase());

export const scenarioSnapshotSchema = z
	.strictObject({
		advisoryOnly: z.literal(true),
		provinceCodes: z
			.array(z.string().regex(/^\d{2}$/))
			.min(2)
			.max(3)
			.refine((codes) => new Set(codes).size === codes.length),
		sector: z.enum(["retail", "manufacturing", "logistics", "enterprise"]),
		districtId: z
			.string()
			.regex(/^[a-z0-9-]{1,80}$/i)
			.optional(),
		costs: z
			.array(
				z.strictObject({
					code: z.string().regex(/^\d{2}$/),
					net: z.number().min(0).max(Number.MAX_SAFE_INTEGER).nullable(),
				}),
			)
			.min(2)
			.max(3)
			.optional(),
	})
	.refine(
		({ costs, provinceCodes }) =>
			!costs ||
			(costs.length === provinceCodes.length &&
				new Set(costs.map(({ code }) => code)).size === costs.length &&
				costs.every(({ code }) => provinceCodes.includes(code))),
	);

export type ScenarioSnapshot = z.infer<typeof scenarioSnapshotSchema>;

export const inquirySubmissionSchema = z
	.strictObject({
		email,
		message: z.string().trim().min(10).max(5000),
		name: optionalText(160),
		organization: optionalText(200),
		country: optionalText(100),
		sector: optionalText(160),
		scenarioSnapshot: scenarioSnapshotSchema.optional(),
		geographyIds: z
			.array(z.string().uuid())
			.max(20)
			.default([])
			.transform((ids) => [...new Set(ids)]),
		consent: z.literal(true),
		noticeVersion: z.literal(INQUIRY_NOTICE_VERSION),
		honeypot: z.literal("").optional(),
	})
	.transform(
		({ honeypot: _honeypot, consent: _consent, ...submission }) => submission,
	);

export const inquiryReferencePattern = /^INQ-\d{4}-[A-F0-9]{8}$/;

export const erasureReasons = ["erasure_request", "consent_withdrawn"] as const;
export type InquiryErasureReason = (typeof erasureReasons)[number];

export const inquiryTicketPattern = /^[A-Za-z0-9._:#/-]{3,64}$/;

export const inquiryErasureSchema = z.strictObject({
	reason: z.enum(erasureReasons),
	ticket: z.string().trim().regex(inquiryTicketPattern),
});

export const inquiryStatusLookupSchema = z.strictObject({
	referenceCode: z
		.string()
		.trim()
		.transform((value) => value.toUpperCase())
		.pipe(
			z
				.string()
				.regex(inquiryReferencePattern, "Invalid inquiry reference code."),
		),
	email,
});

export function nextInquiryStatus(
	current: InquiryStatus,
	next: InquiryStatus,
	reason?: InquiryCloseReason,
) {
	if (next === "closed" && !reason)
		return { ok: false as const, error: "A close reason is required." };
	if (current === "closed")
		return {
			ok: false as const,
			error: "Closed inquiries cannot be reopened.",
		};
	const transitions: Record<InquiryStatus, InquiryStatus[]> = {
		new: ["contacted", "qualified", "closed"],
		contacted: ["qualified", "closed"],
		qualified: ["closed"],
		closed: [],
	};
	return transitions[current].includes(next)
		? { ok: true as const }
		: {
				ok: false as const,
				error: `Cannot change inquiry from ${current} to ${next}.`,
			};
}

export function retentionCutoff(now = new Date()) {
	const cutoff = new Date(now);
	cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
	return cutoff;
}
