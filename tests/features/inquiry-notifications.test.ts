import { expect, test } from "bun:test";
import {
	buildNotificationMail,
	MAX_NOTIFICATION_ATTEMPTS,
	nextNotificationState,
	parseRequestLocale,
} from "../../src/features/inquiries/notifications";
import { mailTransport, redactEmail, sendMail } from "../../src/lib/mail";

test("parseRequestLocale reads ecom_locale cookie before accept-language header", () => {
	const fromCookie = new Request("http://localhost/api/inquiries", {
		headers: { cookie: "other=1; ecom_locale=vi", "accept-language": "en-US" },
	});
	expect(parseRequestLocale(fromCookie)).toBe("vi");

	const fromHeader = new Request("http://localhost/api/inquiries", {
		headers: { "accept-language": "vi-VN,vi;q=0.9" },
	});
	expect(parseRequestLocale(fromHeader)).toBe("vi");

	const fallback = new Request("http://localhost/api/inquiries");
	expect(parseRequestLocale(fallback)).toBe("en");
});

test("buildNotificationMail formats bilingual acknowledgements and non-PII steward alerts", () => {
	const base = {
		referenceCode: "INQ-2026-ABCDEF12",
		email: "investor@example.test",
		country: "Japan",
		sector: "Retail",
		geographyCount: 2,
		anonymizedAt: null,
	};

	const viAck = buildNotificationMail("acknowledgement", "vi", base);
	expect(viAck.ok).toBe(true);
	if (viAck.ok) {
		expect(viAck.message.to).toBe("investor@example.test");
		expect(viAck.message.subject).toContain("INQ-2026-ABCDEF12");
		expect(viAck.message.text).toContain("Số địa bàn đính kèm: 2");
	}

	const enAck = buildNotificationMail("acknowledgement", "en", base);
	expect(enAck.ok).toBe(true);
	if (enAck.ok) {
		expect(enAck.message.subject).toContain("INQ-2026-ABCDEF12");
		expect(enAck.message.text).toContain("Attached geographies: 2");
	}

	const anonymized = buildNotificationMail("acknowledgement", "en", {
		...base,
		email: null,
		anonymizedAt: new Date(),
	});
	expect(anonymized.ok).toBe(false);

	const missingSteward = buildNotificationMail("steward_alert", "en", base, "");
	expect(missingSteward.ok).toBe(false);

	const stewardAlert = buildNotificationMail(
		"steward_alert",
		"en",
		base,
		"steward@example.test",
	);
	expect(stewardAlert.ok).toBe(true);
	if (stewardAlert.ok) {
		expect(stewardAlert.message.to).toBe("steward@example.test");
		expect(stewardAlert.message.text).toContain("INQ-2026-ABCDEF12");
		expect(stewardAlert.message.text).not.toContain("investor@example.test");
	}
});

test("nextNotificationState preserves pending state when transport is disabled and caps attempts", () => {
	expect(nextNotificationState(0, { ok: true }, "log")).toEqual({
		status: "sent",
		attempts: 1,
		lastError: null,
		sent: true,
	});

	expect(
		nextNotificationState(
			0,
			{ ok: false, error: "transport disabled", retryable: true },
			"disabled",
		),
	).toEqual({
		status: "pending",
		attempts: 0,
		lastError: "transport disabled",
		sent: false,
	});

	expect(
		nextNotificationState(
			MAX_NOTIFICATION_ATTEMPTS,
			{ ok: false, error: "provider 500", retryable: true },
			"resend",
		),
	).toEqual({
		status: "failed",
		attempts: MAX_NOTIFICATION_ATTEMPTS,
		lastError: "provider 500",
		sent: false,
	});
});

test("redactEmail hides local-part characters and sendMail handles resend responses safely", async () => {
	expect(redactEmail("investor@example.test")).toBe("i***@example.test");
	expect(redactEmail("invalid")).toBe("***");

	const prevTransport = process.env.ECOM_MAIL_TRANSPORT;
	const prevFrom = process.env.ECOM_MAIL_FROM;
	const prevKey = process.env.RESEND_API_KEY;
	try {
		process.env.ECOM_MAIL_TRANSPORT = "resend";
		process.env.ECOM_MAIL_FROM = "noreply@example.test";
		process.env.RESEND_API_KEY = "re_test_key";

		const ok = await sendMail(
			{ to: "investor@example.test", subject: "Test", text: "Body" },
			{
				fetchImpl: (async () =>
					new Response("{}", { status: 200 })) as unknown as typeof fetch,
			},
		);
		expect(ok).toEqual({ ok: true });

		const retryable = await sendMail(
			{ to: "investor@example.test", subject: "Test", text: "Body" },
			{
				fetchImpl: (async () =>
					new Response("rate limit", {
						status: 429,
					})) as unknown as typeof fetch,
			},
		);
		expect(retryable).toEqual({
			ok: false,
			error: "provider 429",
			retryable: true,
		});
	} finally {
		if (prevTransport === undefined) delete process.env.ECOM_MAIL_TRANSPORT;
		else process.env.ECOM_MAIL_TRANSPORT = prevTransport;
		if (prevFrom === undefined) delete process.env.ECOM_MAIL_FROM;
		else process.env.ECOM_MAIL_FROM = prevFrom;
		if (prevKey === undefined) delete process.env.RESEND_API_KEY;
		else process.env.RESEND_API_KEY = prevKey;
	}
});

test("package.json exposes mail:flush and mail:scheduler scripts", async () => {
	const pkg = (await Bun.file("package.json").json()) as {
		scripts: Record<string, string>;
	};
	expect(pkg.scripts["mail:flush"]).toBe("bun run src/db/flush-mail.ts");
	expect(pkg.scripts["mail:scheduler"]).toBe(
		"bun run src/db/mail-scheduler.ts",
	);
});

test("mailTransport only enables resend when ECOM_MAIL_TRANSPORT=resend", () => {
	const prevTransport = process.env.ECOM_MAIL_TRANSPORT;
	const prevKey = process.env.RESEND_API_KEY;
	const prevNodeEnv = process.env.NODE_ENV;
	const mutableEnv = process.env as Record<string, string | undefined>;
	try {
		delete process.env.ECOM_MAIL_TRANSPORT;
		process.env.RESEND_API_KEY = "re_test_key";
		mutableEnv.NODE_ENV = "test";
		expect(mailTransport()).toBe("log");

		mutableEnv.NODE_ENV = "production";
		expect(mailTransport()).toBe("disabled");

		process.env.ECOM_MAIL_TRANSPORT = "resend";
		expect(mailTransport()).toBe("resend");
	} finally {
		if (prevTransport === undefined) delete process.env.ECOM_MAIL_TRANSPORT;
		else process.env.ECOM_MAIL_TRANSPORT = prevTransport;
		if (prevKey === undefined) delete process.env.RESEND_API_KEY;
		else process.env.RESEND_API_KEY = prevKey;
		if (prevNodeEnv === undefined) delete mutableEnv.NODE_ENV;
		else mutableEnv.NODE_ENV = prevNodeEnv;
	}
});
