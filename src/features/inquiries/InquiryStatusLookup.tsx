"use client";

import { useState, type FormEvent } from "react";
import { useI18n } from "../../lib/i18n/provider";
import type { PublicInquiryStatus } from "./repository";
import type { MessageKey } from "../../lib/i18n";

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

export function InquiryStatusLookup({
	initialReference = "",
}: {
	initialReference?: string;
}) {
	const { t, formatDate } = useI18n();
	const [referenceCode, setReferenceCode] = useState(initialReference);
	const [email, setEmail] = useState("");
	const [pending, setPending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [result, setResult] = useState<PublicInquiryStatus | null>(null);

	function statusLabel(value: string | null) {
		const match = stages.find((stage) => stage.value === value);
		return match ? t(match.key) : (value ?? "");
	}

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (pending) return;
		setError(null);
		setResult(null);
		setPending(true);
		try {
			const response = await fetch("/api/inquiries/status", {
				method: "POST",
				cache: "no-store",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					referenceCode: referenceCode.trim(),
					email: email.trim(),
				}),
			});
			const body = (await response.json().catch(() => null)) as {
				data?: PublicInquiryStatus;
				error?: string;
			} | null;
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
			setError(t("status.errorNetwork"));
		} finally {
			setPending(false);
		}
	}

	const currentStageIndex = result
		? stages.findIndex((stage) => stage.value === result.status)
		: -1;

	return (
		<div>
			<form className="status-lookup-form" onSubmit={onSubmit}>
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

			{result && (
				<section aria-live="polite">
					<h2>{result.referenceCode}</h2>
					<ol className="status-stepper" aria-label={t("status.progressAria")}>
						{stages.map((stage, index) => {
							const state =
								index < currentStageIndex
									? "done"
									: index === currentStageIndex
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
