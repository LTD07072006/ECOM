import { SurveyAdminDashboard } from "../../../features/decision/SurveyAdminDashboard";
import { loadPublicCatalog } from "../../../features/geography/catalog";
import { getI18n } from "../../../lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function InternalSurveysPage() {
	const [{ t }, catalog] = await Promise.all([
		getI18n(),
		loadPublicCatalog(undefined, false, "province"),
	]);
	const provinces = catalog.geographies.map((geo) => ({
		id: geo.id,
		code: geo.code,
		displayName: geo.displayName,
	}));

	return (
		<main className="decision-page">
			<a href="/internal/inquiries">{t("common.backToMap")}</a>
			<h1>{t("surveys.pageTitle")}</h1>
			<p>{t("surveys.pageLede")}</p>
			<SurveyAdminDashboard provinces={provinces} />
		</main>
	);
}
