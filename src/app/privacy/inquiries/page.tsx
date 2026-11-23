import Link from "next/link";
import {
	INQUIRY_NOTICE_VERSION,
	inquiryPrivacyContact,
} from "../../../features/inquiries/privacy";
import { getI18n } from "../../../lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function InquiryPrivacyPage() {
	const [{ t }, contact] = await Promise.all([
		getI18n(),
		Promise.resolve(inquiryPrivacyContact()),
	]);

	return (
		<main id="main-content" className="read-page" tabIndex={-1}>
			<article className="read-sheet">
				<div className="read-column">
					<p>
						<Link href="/" className="btn btn-quiet btn-sm">
							{t("common.returnToMap")}
						</Link>
					</p>
					<h1>{t("privacy.title")}</h1>
					<p className="read-meta-line">
						{t("privacy.version", { version: INQUIRY_NOTICE_VERSION })}
					</p>
					{contact ? (
						<p>
							{t("privacy.controllerBefore", {
								controller: contact.controller,
							})}{" "}
							<a href={`mailto:${contact.email}`}>{contact.email}</a>
							{t("privacy.controllerAfter")}
						</p>
					) : (
						<p className="banner banner--info">{t("privacy.noContact")}</p>
					)}
					<h2>{t("privacy.purposeTitle")}</h2>
					<p>{t("privacy.purposeBody")}</p>
					<h2>{t("privacy.retentionTitle")}</h2>
					<p>{t("privacy.retentionBody")}</p>
					<h2>{t("privacy.requestsTitle")}</h2>
					<p>{t("privacy.requestsBody")}</p>
				</div>
			</article>
		</main>
	);
}
