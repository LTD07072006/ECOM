import { loadPublicCatalog } from "../../features/geography/catalog";
import { getProfile } from "../../features/geography/domain";
import { RetailScenario } from "../../features/decision/RetailScenario";
import { criteria } from "../../features/decision/model";

export const dynamic = "force-dynamic";

export default async function DecisionPage() {
  const catalog = await loadPublicCatalog();
  const provinces = catalog.geographies.filter((place) => place.level === "province")
    .map((place) => getProfile(catalog, place.id)).filter((profile) => profile !== null)
    .map((profile) => ({ ...profile, observations: profile.observations.filter((item) =>
      criteria.some((criterion) => criterion.code === item.indicator)) }));
  return <main className="decision-page">
    <a href="/">Back to map</a>
    <h1>Explore a retail market</h1>
    <p>Compare published provincial context and check whether evidence is sufficient for a weighted assessment.</p>
    {catalog.mode !== "database" || catalog.publicationStatus !== "published"
      ? <p role="alert">Published data is temporarily unavailable. Try again later.</p>
      : <RetailScenario provinces={provinces} />}
  </main>;
}
