"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import type { MessageKey } from "../../lib/i18n";
import { useI18n } from "../../lib/i18n/provider";
import type { PublicInquiryStatus } from "./repository";
import styles from "./status-lookup.module.css";
import {
	buildInquiryStatusSummary,
	type NextStepGuidanceKey,
	type SlaBadgeState,
} from "./status-progress";

const stages: Array<{ value: PublicInquiryStatus["status"]; key: MessageKey }> =
	[
		{ value: "new", key: "admin.new" },
		{ value: "contacted", key: "admin.contacted" },
		{ value: "qualified", key: "admin.qualified" },
		{ value: "closed", key: "admin.closed" },
	];

const closeReasonKeys: Record<string, MessageKey> = {
	spam: "admin.reasonSpam",
	duplicate: "admin.reasonDuplicate",
	out_of_scope: "admin.reasonOutOfScope",
	resolved: "admin.reasonResolved",
};

const COPY = {
	vi: {
		copyRef: "Sao chép mã",
		copied: "Đã sao chép",
		printReceipt: "In phiếu theo dõi",
		progressLabel: "Tiến độ xử lý",
		elapsedPrefix: "Đã tiếp nhận",
		hoursUnit: "giờ trước",
		sla: {
			on_track: "Đúng tiến độ SLA (<48h)",
			attention: "Đang ưu tiên phân bổ IPA (>48h)",
			completed: "Đã hoàn tất xử lý",
		} satisfies Record<SlaBadgeState, string>,
		guidance: {
			awaiting_ipa_triage:
				"Hồ sơ đang được điều phối tới chuyên viên xúc tiến đầu tư (IPA) cấp tỉnh phụ trách khu vực bạn chọn.",
			ipa_contacted:
				"Cơ quan IPA đã tiếp nhận và liên hệ trao đổi sơ bộ. Vui lòng kiểm tra email để cung cấp thông tin bổ sung nếu cần.",
			qualified_review:
				"Hồ sơ đã đạt điều kiện thẩm định chuyên sâu (quy hoạch quỹ đất, ưu đãi thuế & khảo sát hạ tầng KCN).",
			case_closed:
				"Yêu cầu tư vấn đã khép lại. Bạn có thể gửi yêu cầu mới kèm kịch bản CapEx/OpEx nếu mở rộng sang tỉnh khác.",
			unknown:
				"Theo dõi nhật ký mốc thời gian bên dưới để biết trạng thái mới nhất.",
		} satisfies Record<NextStepGuidanceKey, string>,
	},
	en: {
		copyRef: "Copy reference",
		copied: "Copied",
		printReceipt: "Print tracking receipt",
		progressLabel: "Processing progress",
		elapsedPrefix: "Submitted",
		hoursUnit: "hrs ago",
		sla: {
			on_track: "Within SLA (<48h)",
			attention: "Escalated for IPA triage (>48h)",
			completed: "Processing completed",
		} satisfies Record<SlaBadgeState, string>,
		guidance: {
			awaiting_ipa_triage:
				"Your inquiry is queued for routing to the provincial Investment Promotion Agency (IPA) desk for your selected geography.",
			ipa_contacted:
				"An IPA specialist has initiated outreach. Please check your inbox for follow-up questions or site-visit scheduling.",
			qualified_review:
				"Your project has passed initial screening for deeper site, utility, and statutory incentive evaluation.",
			case_closed:
				"This inquiry is closed. You may submit a new inquiry with updated CapEx/OpEx assumptions anytime.",
			unknown: "Check the timeline below for the latest status milestone.",
		} satisfies Record<NextStepGuidanceKey, string>,
	},
} as const;

export function InquiryStatusLookup({
	initialReference = "",
}: {
	initialReference?: string;
}) {
	const { t, locale, formatDate } = useI18n();
	const text = COPY[locale];
	const [referenceCode, setReferenceCode] = useState(initialReference);
	const [email, setEmail] = useState("");
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<PublicInquiryStatus | null>(null);
	const [copied, setCopied] = useState(false);

	const abortRef = useRef<AbortController | null>(null);
	const copyTimerRef = useRef<number | null>(null);

	useEffect(() => {
		return () => {
			abortRef.current?.abort();
			if (copyTimerRef.current !== null) {
				window.clearTimeout(copyTimerRef.current);
			}
		};
	}, []);

	function statusLabel(value: string | null) {
		const match = stages.find((stage) => stage.value === value);
		return match ? t(match.key) : (value ?? "");
	}

	async function handleCopyReference(code: string) {
		try {
			await navigator.clipboard.writeText(code);
			setCopied(true);
			if (copyTimerRef.current !== null) {
				window.clearTimeout(copyTimerRef.current);
			}
			copyTimerRef.current = window.setTimeout(() => setCopied(false), 2000);
		} catch {
			// Ignore clipboard permission errors in restricted contexts.
		}
	}

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (pending) return;
		abortRef.current?.abort();
		const controller = new AbortController();
		abortRef.current = controller;

		const normalizedRef = referenceCode.trim().toUpperCase();
		setReferenceCode(normalizedRef);
		setError(null);
		setResult(null);
		setCopied(false);
		setPending(true);
		try {
			const response = await fetch("/api/inquiries/status", {
				method: "POST",
				cache: "no-store",
				signal: controller.signal,
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					referenceCode: normalizedRef,
					email: email.trim(),
				}),
			});
			const body = (await response.json().catch(() => null)) as {
				data?: PublicInquiryStatus;
				error?: string;
			} | null;
			if (controller.signal.aborted) return;
			if (!response.ok || !body?.data) {
				setError(
					response.status === 404
						? t("status.notFound")
						: (body?.error ?? t("status.errorNetwork")),
				);
				return;
			}
			setResult(body.data);
		} catch {
			if (!controller.signal.aborted) {
				setError(t("status.errorNetwork"));
			}
		} finally {
			if (!controller.signal.aborted) {
				setPending(false);
			}
		}
	}

	const summary = result ? buildInquiryStatusSummary(result) : null;
	const slaClass =
		summary?.slaBadge === "attention"
			? `${styles.slaBadge} ${styles.slaAttention}`
			: summary?.slaBadge === "completed"
				? `${styles.slaBadge} ${styles.slaCompleted}`
				: `${styles.slaBadge} ${styles.slaOnTrack}`;

	return (
		<div>
			<form
				className={`status-lookup-form ${styles.lookupForm}`}
				onSubmit={onSubmit}
			>
				<label>
					{t("status.referenceCode")}
					<input
						name="referenceCode"
						value={referenceCode}
						onChange={(event) => setReferenceCode(event.target.value)}
						placeholder={t("status.referencePlaceholder")}
						required
						maxLength={32}
						autoComplete="off"
					/>
				</label>
				<label>
					{t("status.email")}
					<input
						name="email"
						type="email"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						required
						maxLength={254}
						autoComplete="email"
					/>
				</label>
				<button type="submit" disabled={pending}>
					{pending ? t("status.checking") : t("status.submit")}
				</button>
			</form>

			{error && <p role="alert">{error}</p>}

			{result && summary && (
				<section className={styles.statusCard} aria-live="polite">
					<div className={styles.cardHeader}>
						<div className={styles.badgeRow}>
							<h2 className={styles.refHeading}>{result.referenceCode}</h2>
							<span className={slaClass}>{text.sla[summary.slaBadge]}</span>
						</div>
						<div className={styles.actionsBar}>
							<button
								type="button"
								className={styles.actionBtn}
								onClick={() => void handleCopyReference(result.referenceCode)}
							>
								{copied ? text.copied : text.copyRef}
							</button>
							<button
								type="button"
								className={styles.actionBtn}
								onClick={() => window.print()}
							>
								{text.printReceipt}
							</button>
						</div>
					</div>

					<div className={styles.progressWrap}>
						<div className={styles.progressMeta}>
							<span>
								{text.progressLabel}:{" "}
								<strong>{summary.progressPercent}%</strong>
							</span>
							{summary.elapsedHours !== null && (
								<span>
									{text.elapsedPrefix} {summary.elapsedHours} {text.hoursUnit}
								</span>
							)}
						</div>
						<div
							className={styles.progressTrack}
							role="progressbar"
							aria-valuemin={0}
							aria-valuemax={100}
							aria-valuenow={summary.progressPercent}
						>
							<div
								className={styles.progressFill}
								style={{ width: `${summary.progressPercent}%` }}
							/>
						</div>
					</div>

					<ol className="status-stepper" aria-label={t("status.progressAria")}>
						{stages.map((stage, index) => {
							const state =
								index < summary.stageIndex
									? "done"
									: index === summary.stageIndex
										? "current"
										: "upcoming";
							return (
								<li
									key={stage.value}
									data-state={state}
									aria-current={state === "current" ? "step" : undefined}
								>
									{t(stage.key)}
								</li>
							);
						})}
					</ol>

					<p className={styles.guidanceBox}>
						{text.guidance[summary.nextStepKey]}
					</p>

					<dl className="inquiry-report-meta">
						<dt>{t("admin.statusLabel")}</dt>
						<dd>
							{statusLabel(result.status)}
							{result.closeReason && closeReasonKeys[result.closeReason]
								? ` · ${t(closeReasonKeys[result.closeReason])}`
								: ""}
						</dd>
						<dt>{t("status.submittedAt")}</dt>
						<dd>{formatDate(result.submittedAt, { includeTime: true })}</dd>
						<dt>{t("status.updatedAt")}</dt>
						<dd>{formatDate(result.updatedAt, { includeTime: true })}</dd>
						<dt>{t("status.placesAttached")}</dt>
						<dd>{result.geographyCount}</dd>
					</dl>

					<h3>{t("status.timelineTitle")}</h3>
					<ol>
						{result.timeline.map((event, index) => (
							<li key={`${event.happenedAt}-${index}`}>
								{formatDate(event.happenedAt, { includeTime: true })} —{" "}
								{event.action === "submitted"
									? t("status.eventSubmitted")
									: t("status.eventStatusChanged", {
											from: statusLabel(event.fromStatus),
											to: statusLabel(event.toStatus),
										})}
							</li>
						))}
					</ol>
					<p className="muted">{t("status.privacyNote")}</p>
				</section>
			)}
		</div>
	);
}
