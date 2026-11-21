"use client";

import { useId, useState, type FormEvent } from "react";
import { INQUIRY_NOTICE_VERSION } from "./privacy";

export type InquiryFormProps = {
  geographyIds: string[];
  geographyLabels?: string[];
  onSubmitted?: (referenceCode: string) => void;
};

export function InquiryForm({ geographyIds, geographyLabels = [], onSubmitted }: InquiryFormProps) {
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
          email: form.get("email"), message: form.get("message"), name: form.get("name"),
          organization: form.get("organization"), country: form.get("country"), sector: form.get("sector"),
          geographyIds, honeypot: form.get("website"), consent: form.has("consent"), noticeVersion: INQUIRY_NOTICE_VERSION,
        }),
      });
      const body = await response.json().catch(() => ({})) as { referenceCode?: string; error?: string };
      if (!response.ok || !body.referenceCode) {
        setError(body.error ?? "Unable to submit your request.");
        return;
      }
      setReferenceCode(body.referenceCode);
      onSubmitted?.(body.referenceCode);
    } catch {
      setError("The request could not be sent. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  if (referenceCode) return <div role="status"><p>Your request has been received.</p><p>Reference code: <strong>{referenceCode}</strong></p><p>Keep this code when communicating with the steward.</p></div>;
  return <form className="inquiry-form" onSubmit={submit}>
    <p>Required fields are marked <span aria-hidden="true">*</span>.</p>
    {geographyLabels.length > 0 && <fieldset><legend>Places of interest</legend><ul>{geographyLabels.map((label) => <li key={label}>{label}</li>)}</ul><p className="muted">Country and sector are self-reported and are not verified by this form.</p></fieldset>}
    <label>Email *<input name="email" type="email" required maxLength={254} autoComplete="email" /></label>
    <label>Message *<textarea name="message" required minLength={10} maxLength={5000} /></label>
    <label>Name<input name="name" maxLength={160} autoComplete="name" /></label>
    <label>Organization<input name="organization" maxLength={200} autoComplete="organization" /></label>
    <label>Country<input name="country" maxLength={100} autoComplete="country-name" /></label>
    <label>Sector<input name="sector" maxLength={160} /></label>
    <label className="inquiry-honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
    <p id={privacySummary}>Stewards use your details to review and respond to this inquiry. It is due for anonymization 12 months after the last update. See the <a href="/privacy/inquiries" target="_blank" rel="noopener noreferrer">inquiry privacy notice (opens in a new tab)</a> for the privacy contact and your options.</p>
    <label className="inquiry-consent"><input type="checkbox" name="consent" required aria-describedby={privacySummary} /> I consent to the use of my data to handle this inquiry.</label>
    {error && <p role="alert">{error}</p>}
    <button type="submit" disabled={pending}>{pending ? "Sending…" : "Send inquiry"}</button>
  </form>;
}
