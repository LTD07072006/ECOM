import Link from "next/link";
import { INQUIRY_NOTICE_VERSION, inquiryPrivacyContact } from "../../../features/inquiries/privacy";

export const dynamic = "force-dynamic";

export default function InquiryPrivacyPage() {
  const contact = inquiryPrivacyContact();

  return <main className="inquiry-page inquiry-privacy-page">
    <h1>Inquiry privacy notice</h1>
    <p>Notice version {INQUIRY_NOTICE_VERSION}</p>
    {contact
      ? <p>{contact.controller} is responsible for inquiry data. Contact <a href={`mailto:${contact.email}`}>{contact.email}</a>.</p>
      : <p>This installation has no configured privacy contact. Use synthetic inquiries for local testing.</p>}
    <h2>Purpose and consent</h2>
    <p>We use your email, message, selected places and any optional details you provide to review your request and respond to you. By selecting the consent box and sending the form, you agree to this use. The form records the notice version and submission time.</p>
    <h2>Access and retention</h2>
    <p>Authorized stewards can read your inquiry and record its handling. The inquiry is due for anonymization 12 months after its last steward update or submission, whichever is later. Aggregate activity and audit timestamps can be kept for reporting. Backup copies expire under the operator’s backup schedule.</p>
    <h2>Privacy requests</h2>
    <p>Use the privacy contact above to request access, correction or deletion, or to withdraw your consent. Include your inquiry reference code if available. Please avoid sending sensitive documents or credentials.</p>
    <Link href="/">Return to the map</Link>
  </main>;
}
