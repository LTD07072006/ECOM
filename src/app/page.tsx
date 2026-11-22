import { MapWorkspace } from "../features/map/MapWorkspace";
import { loadPublicCatalog } from "../features/geography/catalog";
import { summarizeGeometryCoverage } from "../features/geography/domain";
import { getI18n } from "../lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [{ t, formatDate }, catalog] = await Promise.all([getI18n(), loadPublicCatalog()]);
  const coverage = summarizeGeometryCoverage(catalog.geographies.filter((place) => place.level === "province"));

  return (
    <main className="app-shell" id="map-workspace">
      <aside className="intro-panel">
        <p className="eyebrow">{t("home.eyebrow")}</p>
        <h1>{t("home.title")}</h1>
        <p className="lede">{t("home.lede")}</p>
        <a href="/decision" className="decision-link">{t("home.decisionLink")}</a>
        <p><a href="/investor-guide">{t("guide.link")}</a></p>
        {catalog.dataset && <p className="catalog-release">
          {t("home.catalogEffective", { date: formatDate(catalog.dataset.dataAsOf) })}
          <time dateTime={catalog.dataset.dataAsOf} hidden>{catalog.dataset.dataAsOf}</time>
        </p>}
        <div className="trust-note">
          <span className="status-dot" aria-hidden="true" />
          <span>{t("home.trustNote")}</span>
        </div>
      </aside>
      <MapWorkspace coverage={coverage} />
    </main>
  );
}
