import { loadPublicCatalog } from "../../features/geography/catalog";
import { getProfile } from "../../features/geography/domain";
import { RetailScenario } from "../../features/decision/RetailScenario";
import { decisionIndicatorCodes } from "../../features/decision/model";
import { loadLegalChecklistBySector } from "../../features/decision/legal-readiness-repository";
import { loadInvestmentIncentives } from "../../features/decision/investment-incentives-repository";
import { loadInvestmentOpportunities } from "../../features/decision/investment-opportunities-repository";
import { loadPublishedSurveyStudies } from "../../features/decision/survey-evidence-repository";
import { getI18n } from "../../lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function DecisionPage() {
	const [
		{ t },
		catalog,
		legalChecklistBySector,
		surveyStudies,
		investmentIncentives,
		investmentOpportunities,
	] = await Promise.all([
		getI18n(),
		loadPublicCatalog(undefined, true, "province"),
		loadLegalChecklistBySector(),
		loadPublishedSurveyStudies(),
		loadInvestmentIncentives(),
		loadInvestmentOpportunities(),
	]);
	const provinces = catalog.geographies
		.filter((place) => place.level === "province")
		.map((place) => getProfile(catalog, place.id))
		.filter((profile) => profile !== null)
		.map((profile) => ({
			...profile,
			observations: profile.observations.filter((item) =>
				decisionIndicatorCodes.has(item.indicator),
			),
		}));
	return (
		<main className="decision-page">
			<a href="/">{t("common.backToMap")}</a>
			<h1>{t("decision.title")}</h1>
			<p>{t("decision.lede")}</p>
			{catalog.mode !== "database" ||
			catalog.publicationStatus !== "published" ? (
				<p role="alert">{t("decision.unavailable")}</p>
			) : (
				<RetailScenario
					provinces={provinces}
					legalChecklistBySector={legalChecklistBySector}
					surveyStudies={surveyStudies}
					investmentIncentives={investmentIncentives}
					investmentOpportunities={investmentOpportunities}
				/>
			)}
		</main>
	);
}
