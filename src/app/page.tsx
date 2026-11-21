import { MapWorkspace } from "../features/map/MapWorkspace";
import { loadPublicCatalog } from "../features/geography/catalog";
import { summarizeGeometryCoverage } from "../features/geography/domain";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const catalog = await loadPublicCatalog();
  const coverage = summarizeGeometryCoverage(catalog.geographies.filter((place) => place.level === "province"));

  return (
    <main className="app-shell" id="map-workspace">
      <aside className="intro-panel">
        <p className="eyebrow">Invest in Vietnam</p>
        <h1>Vietnam Market Intelligence</h1>
        <p className="lede">
          Explore verified context, places, and investment signals across Vietnam —
          starting with the map.
        </p>
        <a href="/decision" className="decision-link">Explore a retail scenario</a>
        {catalog.dataset && <p className="catalog-release">Administrative catalog effective <time dateTime={catalog.dataset.dataAsOf}>{catalog.dataset.dataAsOf}</time></p>}
        <div className="trust-note">
          <span className="status-dot" aria-hidden="true" />
          <span>Every figure shows its source, period, and limitations.</span>
        </div>
      </aside>
      <MapWorkspace coverage={coverage} />
    </main>
  );
}
