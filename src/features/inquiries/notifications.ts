import type postgres from "postgres";
import { databasePool } from "../../db/pool";
import {
	mailRecipientConfigured,
	mailTransport,
	sendMail,
	type MailMessage,
	type MailResult,
	type MailTransport,
} from "../../lib/mail";

export type NotificationKind = "acknowledgement" | "steward_alert";
export type NotificationLocale = "vi" | "en";
export type NotificationStatus = "pending" | "sent" | "failed" | "skipped";

export const MAX_NOTIFICATION_ATTEMPTS = 10;

export type NotificationInquiryContext = {
	referenceCode: string;
	email: string | null;
	country: string | null;
	sector: string | null;
	geographyCount: number;
	anonymizedAt: Date | string | null;
};

export type NotificationRow = {
	notification_id: string;
	inquiry_id: string;
	kind: NotificationKind;
	locale: NotificationLocale;
	status: NotificationStatus;
	attempts: number;
	reference_code: string;
	email: string | null;
	country: string | null;
	sector: string | null;
	geography_count: number;
	anonymized_at: Date | null;
};

export type FlushSummary = {
	transport: MailTransport;
	dryRun: boolean;
	processed: number;
	sent: number;
	failed: number;
	skipped: number;
	pending: number;
};

export function parseRequestLocale(request: Request): NotificationLocale {
	const cookie = request.headers.get("cookie") ?? "";
	const match = cookie.match(/(?:^|;\s*)ecom_locale=(vi|en)(?:;|$)/i);
	if (match) return match[1].toLowerCase() as NotificationLocale;
	const accept = request.headers.get("accept-language") ?? "";
	return /^vi\b/i.test(accept.trim()) ? "vi" : "en";
}

export function buildNotificationMail(
	kind: NotificationKind,
	locale: NotificationLocale,
	context: NotificationInquiryContext,
	stewardRecipient = process.env.ECOM_STEWARD_NOTIFY_EMAIL?.trim() ?? "",
): { ok: true; message: MailMessage } | { ok: false; reason: string } {
	if (kind === "acknowledgement") {
		if (context.anonymizedAt || !context.email) {
			return { ok: false, reason: "inquiry anonymized or missing recipient" };
		}
		if (locale === "vi") {
			return {
				ok: true,
				message: {
					to: context.email,
					subject: `[ECOM] Đã tiếp nhận yêu cầu hỗ trợ đầu tư ${context.referenceCode}`,
					text: [
						`Chúng tôi đã tiếp nhận yêu cầu hỗ trợ đầu tư của bạn với mã tham chiếu ${context.referenceCode}.`,
						`Số địa bàn đính kèm: ${context.geographyCount}.`,
						"Đội ngũ phụ trách sẽ xem xét và phản hồi qua email bạn đã cung cấp.",
						"Vui lòng giữ lại mã tham chiếu này khi cần trao đổi thêm.",
					].join("\n"),
				},
			};
		}
		return {
			ok: true,
			message: {
				to: context.email,
				subject: `[ECOM] Investment inquiry received (${context.referenceCode})`,
				text: [
					`We have received your investment support inquiry under reference code ${context.referenceCode}.`,
					`Attached geographies: ${context.geographyCount}.`,
					"Our steward team will review your request and follow up using the email address you provided.",
					"Please keep this reference code for future correspondence.",
				].join("\n"),
			},
		};
	}

	if (!stewardRecipient) {
		return { ok: false, reason: "steward recipient not configured" };
	}
	const summaryParts = [
		`Reference: ${context.referenceCode}`,
		`Geographies: ${context.geographyCount}`,
		`Country: ${context.country ?? "not provided"}`,
		`Sector: ${context.sector ?? "not provided"}`,
	];
	return {
		ok: true,
		message: {
			to: stewardRecipient,
			subject: `[ECOM Steward] New inquiry ${context.referenceCode}`,
			text: [
				"A new investor inquiry was submitted and is awaiting steward triage.",
				...summaryParts,
				"Open /internal/inquiries to review details and record follow-up actions.",
			].join("\n"),
		},
	};
}

export function nextNotificationState(
	currentAttempts: number,
	result: MailResult,
	transport: MailTransport,
): {
	status: NotificationStatus;
	attempts: number;
	lastError: string | null;
	sent: boolean;
} {
	if (result.ok) {
		return {
			status: "sent",
			attempts: Math.min(currentAttempts + 1, MAX_NOTIFICATION_ATTEMPTS),
			lastError: null,
			sent: true,
		};
	}
	if (transport === "disabled") {
		return {
			status: "pending",
			attempts: currentAttempts,
			lastError: result.error,
			sent: false,
		};
	}
	const nextAttempts = Math.min(currentAttempts + 1, MAX_NOTIFICATION_ATTEMPTS);
	return {
		status: "failed",
		attempts: nextAttempts,
		lastError: result.error,
		sent: false,
	};
}

export async function enqueueInquiryNotifications(
	tx: postgres.TransactionSql,
	inquiryId: string,
	locale: NotificationLocale = "en",
) {
	await tx`
    insert into market_entry.inquiry_notifications (inquiry_id, kind, locale, status)
    values
      (${inquiryId}, 'acknowledgement', ${locale}, 'pending'),
      (${inquiryId}, 'steward_alert', 'en', 'pending')
    on conflict (inquiry_id, kind) do nothing
  `;
}

export async function deliverInquiryNotifications(
	inquiryId: string,
	options: { sendImpl?: typeof sendMail; stewardRecipient?: string } = {},
): Promise<FlushSummary> {
	return flushPendingNotifications({
		inquiryId,
		limit: 10,
		dryRun: false,
		sendImpl: options.sendImpl,
		stewardRecipient: options.stewardRecipient,
	});
}

export async function flushPendingNotifications(
	options: {
		inquiryId?: string;
		limit?: number;
		dryRun?: boolean;
		sendImpl?: typeof sendMail;
		stewardRecipient?: string;
	} = {},
): Promise<FlushSummary> {
	const transport = mailTransport();
	const dryRun = options.dryRun ?? false;
	const limit = Math.min(Math.max(options.limit ?? 50, 1), 500);
	const sendImpl = options.sendImpl ?? sendMail;
	const stewardRecipient =
		options.stewardRecipient ??
		process.env.ECOM_STEWARD_NOTIFY_EMAIL?.trim() ??
		"";

	const summary: FlushSummary = {
		transport,
		dryRun,
		processed: 0,
		sent: 0,
		failed: 0,
		skipped: 0,
		pending: 0,
	};

	if (dryRun) {
		const sql = databasePool();
		const [row] = await sql<{ pending: number }[]>`
      select count(*)::int as pending
      from market_entry.inquiry_notifications
      where (status = 'pending' or (status = 'failed' and attempts < ${MAX_NOTIFICATION_ATTEMPTS}))
        and (${options.inquiryId ?? null}::uuid is null or inquiry_id = ${options.inquiryId ?? null}::uuid)
    `;
		summary.pending = row?.pending ?? 0;
		return summary;
	}

	if (transport === "disabled") {
		const sql = databasePool();
		const [row] = await sql<{ pending: number }[]>`
      select count(*)::int as pending
      from market_entry.inquiry_notifications
      where (status = 'pending' or (status = 'failed' and attempts < ${MAX_NOTIFICATION_ATTEMPTS}))
        and (${options.inquiryId ?? null}::uuid is null or inquiry_id = ${options.inquiryId ?? null}::uuid)
    `;
		summary.pending = row?.pending ?? 0;
		return summary;
	}

	const sql = databasePool();
	const lockKey = 7_042_026;
	const conn = await sql.reserve();
	try {
		const [lock] = await conn<{ acquired: boolean }[]>`
			select pg_try_advisory_lock(${lockKey}) as acquired
		`;
		if (!lock?.acquired) {
			return summary;
		}
		try {
			const claimed = await conn<NotificationRow[]>`
        select
          n.notification_id, n.inquiry_id, n.kind, n.locale, n.status, n.attempts,
          i.reference_code, i.email, i.country, i.sector,
          coalesce(array_length(i.geography_ids, 1), 0)::int as geography_count,
          i.anonymized_at
        from market_entry.inquiry_notifications n
        join market_entry.investor_inquiries i on i.inquiry_id = n.inquiry_id
        where (n.status = 'pending' or (n.status = 'failed' and n.attempts < ${MAX_NOTIFICATION_ATTEMPTS}))
          and (${options.inquiryId ?? null}::uuid is null or n.inquiry_id = ${options.inquiryId ?? null}::uuid)
        order by n.created_at asc
        limit ${limit}
      `;

			for (const row of claimed) {
				summary.processed += 1;
				const built = buildNotificationMail(
					row.kind,
					row.locale,
					{
						referenceCode: row.reference_code,
						email: row.email,
						country: row.country,
						sector: row.sector,
						geographyCount: row.geography_count,
						anonymizedAt: row.anonymized_at,
					},
					row.kind === "steward_alert" &&
						!options.stewardRecipient &&
						!mailRecipientConfigured()
						? ""
						: stewardRecipient,
				);

				if (!built.ok) {
					summary.skipped += 1;
					await conn`
            update market_entry.inquiry_notifications
            set status = 'skipped', last_error = ${built.reason}
            where notification_id = ${row.notification_id}
          `;
					continue;
				}

				// Perform external HTTP delivery outside any open DB transaction so
				// slow providers never hit idle_in_transaction_session_timeout or roll back sent mails.
				const result = await sendImpl(built.message);
				const next = nextNotificationState(row.attempts, result, transport);
				if (next.status === "sent") summary.sent += 1;
				else if (next.status === "failed") summary.failed += 1;
				else if (next.status === "pending") summary.pending += 1;

				await conn`
          update market_entry.inquiry_notifications
          set status = ${next.status},
              attempts = ${next.attempts},
              last_error = ${next.lastError},
              sent_at = case when ${next.sent} then now() else sent_at end
          where notification_id = ${row.notification_id}
        `;
			}

			if (claimed.length === 0) {
				summary.pending = 0;
			}
		} finally {
			await conn`select pg_advisory_unlock(${lockKey})`.catch(() => {});
		}
	} finally {
		conn.release();
	}
	return summary;
}
