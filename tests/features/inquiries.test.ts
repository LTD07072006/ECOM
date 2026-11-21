import { expect, test } from "bun:test";
import {
  closeReasons,
  inquirySubmissionSchema,
  nextInquiryStatus,
  retentionCutoff,
} from "../../src/features/inquiries/validation";

test("validates the minimal public inquiry and strips the honeypot", () => {
  const result = inquirySubmissionSchema.parse({
    email: "  Investor@Example.com ",
    message: "Please share investment setup information.",
    name: "A. Investor",
    organization: "Example Group",
    country: "Singapore",
    sector: "Logistics",
    geographyIds: [
      "11111111-1111-4111-8111-111111111111",
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
    ],
    honeypot: "",
  });

  expect(result.email).toBe("investor@example.com");
  expect(result.geographyIds).toEqual([
    "11111111-1111-4111-8111-111111111111",
    "22222222-2222-4222-8222-222222222222",
  ]);
  expect("honeypot" in result).toBe(false);
});

test("requires a valid email, message, and empty honeypot", () => {
  expect(inquirySubmissionSchema.safeParse({ email: "bad", message: "Hello" }).success).toBe(false);
  expect(inquirySubmissionSchema.safeParse({ email: "a@example.com", message: "" }).success).toBe(false);
  expect(inquirySubmissionSchema.safeParse({ email: "a@example.com", message: "Hello", honeypot: "filled" }).success).toBe(false);
});

test("allows only forward inquiry transitions and requires a close reason", () => {
  expect(nextInquiryStatus("new", "contacted")).toEqual({ ok: true });
  expect(nextInquiryStatus("new", "closed")).toEqual({ ok: false, error: "A close reason is required." });
  expect(nextInquiryStatus("new", "closed", "spam")).toEqual({ ok: true });
  expect(nextInquiryStatus("contacted", "qualified")).toEqual({ ok: true });
  expect(nextInquiryStatus("closed", "contacted")).toEqual({ ok: false, error: "Closed inquiries cannot be reopened." });
  expect(closeReasons).toContain("out_of_scope");
});

test("retention cutoff is twelve months before the current date", () => {
  const now = new Date("2026-11-21T12:00:00.000Z");
  expect(retentionCutoff(now).toISOString()).toBe("2025-11-21T12:00:00.000Z");
});
