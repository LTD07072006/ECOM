import { z } from "zod";
import { INQUIRY_NOTICE_VERSION } from "./privacy";

export const inquiryStatuses = ["new", "contacted", "qualified", "closed"] as const;
export type InquiryStatus = typeof inquiryStatuses[number];
export const closeReasons = ["spam", "duplicate", "out_of_scope", "resolved"] as const;
export type InquiryCloseReason = typeof closeReasons[number];

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(""));
const email = z.string().trim().email().max(254).transform((value) => value.toLowerCase());

export const inquirySubmissionSchema = z.strictObject({
  email,
  message: z.string().trim().min(10).max(5000),
  name: optionalText(160),
  organization: optionalText(200),
  country: optionalText(100),
  sector: optionalText(160),
  geographyIds: z.array(z.string().uuid()).max(20).default([]).transform((ids) => [...new Set(ids)]),
  consent: z.literal(true),
  noticeVersion: z.literal(INQUIRY_NOTICE_VERSION),
  honeypot: z.literal("").optional(),
}).transform(({ honeypot: _honeypot, consent: _consent, ...submission }) => submission);

export function nextInquiryStatus(current: InquiryStatus, next: InquiryStatus, reason?: InquiryCloseReason) {
  if (next === "closed" && !reason) return { ok: false as const, error: "A close reason is required." };
  if (current === "closed") return { ok: false as const, error: "Closed inquiries cannot be reopened." };
  const transitions: Record<InquiryStatus, InquiryStatus[]> = {
    new: ["contacted", "qualified", "closed"],
    contacted: ["qualified", "closed"],
    qualified: ["closed"],
    closed: [],
  };
  return transitions[current].includes(next)
    ? { ok: true as const }
    : { ok: false as const, error: `Cannot change inquiry from ${current} to ${next}.` };
}

export function retentionCutoff(now = new Date()) {
  const cutoff = new Date(now);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1);
  return cutoff;
}
