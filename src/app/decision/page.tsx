import { loadPublicCatalog } from "../../features/geography/catalog";
import { getProfile } from "../../features/geography/domain";
import { RetailScenario } from "../../features/decision/RetailScenario";
import { criteria } from "../../features/decision/model";
import { getI18n } from "../../lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function DecisionPage() {
  const [{ t }, catalog] = await Promise.all([getI18n(), loadPublicCatalog()]);
  const provinces = catalog.geographies.filter((place) => place.level === "province")
    .map((place) => getProfile(catalog, place.id)).filter((profile) => profile !== null)
    .map((profile) => ({ ...profile, observations: profile.observations.filter((item) =>
      criteria.some((criterion) => criterion.code === item.indicator)) }));
  return <main className="decision-page">
    <a href="/">{t("common.backToMap")}</a>
    <h1>{t("decision.title")}</h1>
    <p>{t("decision.lede")}</p>
    {catalog.mode !== "database" || catalog.publicationStatus !== "published"
      ? <p role="alert">{t("decision.unavailable")}</p>
      : <RetailScenario provinces={provinces} />}
  </main>;
}
