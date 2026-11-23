"use client";

import { useId, useState, type FormEvent } from "react";
import { INQUIRY_NOTICE_VERSION } from "./privacy";
import { useI18n } from "../../lib/i18n/provider";
import type { ScenarioSnapshot } from "./validation";

export type InquiryFormProps = {
	geographyIds: string[];
	geographyLabels?: string[];
	onSubmitted?: (referenceCode: string) => void;
	defaultSector?: string;
	scenarioSnapshot?: ScenarioSnapshot;
};

export function InquiryForm({
	geographyIds,
	geographyLabels = [],
	onSubmitted,
	defaultSector = "",
	scenarioSnapshot,
}: InquiryFormProps) {
	const { t } = useI18n();
	const privacySummary = useId();
	const errorId = useId();
	const [error, setError] = useState<string | null>(null);
	const [referenceCode, setReferenceCode] = useState<string | null>(null);
	const [pending, setPending] = useState(false);

	async function submit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (pending) return;
		const form = new FormData(event.currentTarget);
		setError(null);
		setPending(true);
		try {
			const response = await fetch("/api/inquiries", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					email: form.get("email"),
					message: form.get("message"),
					name: form.get("name"),
					organization: form.get("organization"),
					country: form.get("country"),
					sector: form.get("sector"),
					geographyIds,
					scenarioSnapshot: form.has("attachScenario")
						? scenarioSnapshot
						: undefined,
					honeypot: form.get("website"),
					consent: form.has("consent"),
					noticeVersion: INQUIRY_NOTICE_VERSION,
				}),
			});
			const body = (await response.json().catch(() => ({}))) as {
				referenceCode?: string;
				error?: string;
			};
			if (!response.ok || !body.referenceCode) {
				setError(body.error ?? t("inquiry.errorDefault"));
				return;
			}
			setReferenceCode(body.referenceCode);
			onSubmitted?.(body.referenceCode);
		} catch {
			setError(t("inquiry.errorNetwork"));
		} finally {
			setPending(false);
		}
	}

	if (referenceCode)
		return (
			<div className="banner banner--success" role="status">
				<div className="form-stack">
					<p>{t("inquiry.received")}</p>
					<p className="tabular-nums">
						<strong>{t("inquiry.reference", { code: referenceCode })}</strong>
					</p>
					<p>{t("inquiry.keepCode")}</p>
					<p>
						<a
							href={`/inquiries/status?ref=${encodeURIComponent(referenceCode)}`}
						>
							{t("inquiry.trackLink")}
						</a>
					</p>
				</div>
			</div>
		);
	return (
		<form className="form-stack" onSubmit={submit}>
			<p className="muted">{t("inquiry.requiredNote")}</p>
			{geographyLabels.length > 0 && (
				<fieldset className="decision-places">
					<legend>{t("inquiry.places")}</legend>
					<ul>
						{geographyLabels.map((label) => (
							<li key={label}>{label}</li>
						))}
					</ul>
					<p className="muted">{t("inquiry.selfReported")}</p>
				</fieldset>
			)}
			<label className="form-field">
				{t("inquiry.email")} *
				<input
					className="control-input"
					name="email"
					type="email"
					required
					maxLength={254}
					autoComplete="email"
					aria-describedby={error ? errorId : undefined}
				/>
			</label>
			<label className="form-field">
				{t("inquiry.message")} *
				<textarea
					className="control-textarea"
					name="message"
					required
					minLength={10}
					maxLength={5000}
					aria-describedby={error ? errorId : undefined}
				/>
			</label>
			<label className="form-field">
				{t("inquiry.name")}
				<input
					className="control-input"
					name="name"
					maxLength={160}
					autoComplete="name"
				/>
			</label>
			<label className="form-field">
				{t("inquiry.organization")}
				<input
					className="control-input"
					name="organization"
					maxLength={200}
					autoComplete="organization"
				/>
			</label>
			<label className="form-field">
				{t("inquiry.country")}
				<input
					className="control-input"
					name="country"
					maxLength={100}
					autoComplete="country-name"
				/>
			</label>
			<label className="form-field">
				{t("inquiry.sector")}
				<input
					className="control-input"
					name="sector"
					maxLength={160}
					defaultValue={defaultSector}
				/>
			</label>
			{scenarioSnapshot && (
				<label>
					<input name="attachScenario" type="checkbox" /> {t("site.attach")}
				</label>
			)}
			<label className="inquiry-honeypot" aria-hidden="true">
				Website
				<input name="website" tabIndex={-1} autoComplete="off" />
			</label>
			<p className="muted" id={privacySummary}>
				{t("inquiry.privacyBefore")}{" "}
				<a href="/privacy/inquiries" target="_blank" rel="noopener noreferrer">
					{t("inquiry.privacyLink")}
				</a>{" "}
				{t("inquiry.privacyAfter")}
			</p>
			<label className="checkbox-field">
				<input
					type="checkbox"
					name="consent"
					required
					aria-describedby={privacySummary}
				/>
				<span>{t("inquiry.consent")}</span>
			</label>
			{error && (
				<p id={errorId} className="banner banner--error" role="alert">
					{error}
				</p>
			)}
			<div>
				<button type="submit" className="btn btn-cta" disabled={pending}>
					{pending ? t("inquiry.sending") : t("inquiry.send")}
				</button>
			</div>
		</form>
	);
}
