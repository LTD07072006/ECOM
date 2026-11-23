if (typeof window !== "undefined") {
	throw new Error("src/lib/mail.ts cannot be used in browser code.");
}

export type MailMessage = { to: string; subject: string; text: string };

export type MailResult =
	| { ok: true }
	| { ok: false; error: string; retryable: boolean };

export type MailTransport = "log" | "resend" | "disabled";

export function redactEmail(email: string): string {
	const at = email.lastIndexOf("@");
	if (at <= 0) return "***";
	return `${email.slice(0, 1)}***${email.slice(at)}`;
}

/**
 * Transactional mail is opt-in. Without a configured provider, local runs log a redacted line and
 * production keeps notifications pending for `bun run mail:flush` instead of pretending to send.
 */
export function mailTransport(): MailTransport {
	const configured = process.env.ECOM_MAIL_TRANSPORT?.trim().toLowerCase();
	if (
		configured === "log" ||
		configured === "resend" ||
		configured === "disabled"
	)
		return configured;
	return process.env.NODE_ENV === "production" ? "disabled" : "log";
}

export function mailRecipientConfigured(): boolean {
	return Boolean(process.env.ECOM_STEWARD_NOTIFY_EMAIL?.trim());
}

export async function sendMail(
	message: MailMessage,
	options: { fetchImpl?: typeof fetch; signal?: AbortSignal } = {},
): Promise<MailResult> {
	const transport = mailTransport();
	if (transport === "disabled")
		return { ok: false, error: "transport disabled", retryable: true };
	if (transport === "log") {
		console.info(
			JSON.stringify({
				event: "mail",
				transport,
				to: redactEmail(message.to),
				subject: message.subject,
			}),
		);
		return { ok: true };
	}
	const from = process.env.ECOM_MAIL_FROM?.trim();
	const apiKey = process.env.RESEND_API_KEY?.trim();
	if (!from || !apiKey)
		return { ok: false, error: "transport not configured", retryable: true };
	try {
		const response = await (options.fetchImpl ?? fetch)(
			"https://api.resend.com/emails",
			{
				method: "POST",
				headers: {
					authorization: `Bearer ${apiKey}`,
					"content-type": "application/json",
				},
				body: JSON.stringify({
					from,
					to: [message.to],
					subject: message.subject,
					text: message.text,
				}),
				signal: options.signal ?? AbortSignal.timeout(8000),
			},
		);
		if (response.ok) return { ok: true };
		return {
			ok: false,
			error: `provider ${response.status}`,
			retryable: response.status === 429 || response.status >= 500,
		};
	} catch (cause) {
		const name = cause instanceof Error ? cause.name : "network error";
		return { ok: false, error: name, retryable: true };
	}
}
