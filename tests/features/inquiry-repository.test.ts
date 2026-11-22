import { expect, test } from "bun:test";
import { makeInquiryReference } from "../../src/features/inquiries/repository";

test("inquiry references are non-sequential and use the public format", () => {
	const first = makeInquiryReference(new Date("2026-11-21T12:34:56.000Z"));
	const second = makeInquiryReference(new Date("2026-11-21T12:34:56.000Z"));

	expect(first).toMatch(/^INQ-2026-[A-Z0-9]{8}$/);
	expect(second).toMatch(/^INQ-2026-[A-Z0-9]{8}$/);
	expect(first).not.toBe(second);
});
