import type { Metadata } from "next";
import { InquiryDashboard } from "../../../features/inquiries/InquiryDashboard";
import { getI18n } from "../../../lib/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
	const { t } = await getI18n();
	return {
		title: t("meta.adminInquiriesTitle"),
		robots: { index: false, follow: false },
	};
}

export default async function InternalInquiriesPage() {
	const { t } = await getI18n();
	return (
		<main className="internal-page inquiry-page">
			<h1>{t("meta.adminInquiriesTitle")}</h1>
			<InquiryDashboard />
		</main>
	);
}
