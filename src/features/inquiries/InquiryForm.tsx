"use client";

import { useId, useState, type FormEvent } from "react";
import { INQUIRY_NOTICE_VERSION } from "./privacy";
import { useI18n } from "../../lib/i18n/provider";

export type InquiryFormProps = {
	geographyIds: string[];
	geographyLabels?: string[];
	onSubmitted?: (referenceCode: string) => void;
	defaultSector?: string;
};

export function InquiryForm({
	geographyIds,
	geographyLabels = [],
	onSubmitted,
	defaultSector = "",
}: InquiryFormProps) {
	const { t } = useI18n();
	const privacySummary = useId();
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
			<div role="status">
				<p>{t("inquiry.received")}</p>
				<p>{t("inquiry.reference", { code: referenceCode })}</p>
				<p>{t("inquiry.keepCode")}</p>
				<p>
					<a
						href={`/inquiries/status?ref=${encodeURIComponent(referenceCode)}`}
					>
						{t("inquiry.trackLink")}
					</a>
				</p>
			</div>
		);
	return (
		<form className="inquiry-form" onSubmit={submit}>
			<p>{t("inquiry.requiredNote")}</p>
			{geographyLabels.length > 0 && (
				<fieldset>
					<legend>{t("inquiry.places")}</legend>
					<ul>
						{geographyLabels.map((label) => (
							<li key={label}>{label}</li>
						))}
					</ul>
					<p className="muted">{t("inquiry.selfReported")}</p>
				</fieldset>
			)}
			<label>
				{t("inquiry.email")} *
				<input
					name="email"
					type="email"
					required
					maxLength={254}
					autoComplete="email"
				/>
			</label>
			<label>
				{t("inquiry.message")} *
				<textarea name="message" required minLength={10} maxLength={5000} />
			</label>
			<label>
				{t("inquiry.name")}
				<input name="name" maxLength={160} autoComplete="name" />
			</label>
			<label>
				{t("inquiry.organization")}
				<input
					name="organization"
					maxLength={200}
					autoComplete="organization"
				/>
			</label>
			<label>
				{t("inquiry.country")}
				<input name="country" maxLength={100} autoComplete="country-name" />
			</label>
			<label>
				{t("inquiry.sector")}
				<input name="sector" maxLength={160} defaultValue={defaultSector} />
			</label>
			<label className="inquiry-honeypot" aria-hidden="true">
				Website
				<input name="website" tabIndex={-1} autoComplete="off" />
			</label>
			<p id={privacySummary}>
				{t("inquiry.privacyBefore")}{" "}
				<a href="/privacy/inquiries" target="_blank" rel="noopener noreferrer">
					{t("inquiry.privacyLink")}
				</a>{" "}
				{t("inquiry.privacyAfter")}
			</p>
			<label className="inquiry-consent">
				<input
					type="checkbox"
					name="consent"
					required
					aria-describedby={privacySummary}
				/>{" "}
				{t("inquiry.consent")}
			</label>
			{error && <p role="alert">{error}</p>}
			<button type="submit" disabled={pending}>
				{pending ? t("inquiry.sending") : t("inquiry.send")}
			</button>
		</form>
	);
}
