import { InquiryStatusLookup } from "../../../features/inquiries/InquiryStatusLookup";
import { getI18n } from "../../../lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function InquiryStatusPage({
	searchParams,
}: {
	searchParams: Promise<{ ref?: string }>;
}) {
	const [{ t }, params] = await Promise.all([getI18n(), searchParams]);
	const initialReference =
		typeof params.ref === "string" &&
		/^INQ-\d{4}-[A-F0-9]{8}$/i.test(params.ref.trim())
			? params.ref.trim().toUpperCase()
			: "";

	return (
		<main className="decision-page">
			<a href="/">{t("common.backToMap")}</a>
			<h1>{t("status.title")}</h1>
			<p>{t("status.intro")}</p>
			<InquiryStatusLookup initialReference={initialReference} />
		</main>
	);
}
