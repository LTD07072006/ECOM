import { MapWorkspace } from "../features/map/MapWorkspace";
import { loadPublicCatalogSummary } from "../features/geography/catalog";
import { getI18n } from "../lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
	const [{ t, formatDate }, summary] = await Promise.all([
		getI18n(),
		loadPublicCatalogSummary(),
	]);

	return (
		<main className="app-shell" id="map-workspace">
			<aside className="intro-panel">
				<p className="eyebrow">{t("home.eyebrow")}</p>
				<h1>{t("home.title")}</h1>
				<p className="lede">{t("home.lede")}</p>
				<a href="/decision" className="decision-link">
					{t("home.decisionLink")}
				</a>
				<p>
					<a href="/investor-guide">{t("guide.link")}</a> ·{" "}
					<a href="/inquiries/status">{t("status.pageLink")}</a>
				</p>
				{summary.dataset && (
					<p className="catalog-release">
						{t("home.catalogEffective", {
							date: formatDate(summary.dataset.dataAsOf),
						})}
						<time dateTime={summary.dataset.dataAsOf} hidden>
							{summary.dataset.dataAsOf}
						</time>
					</p>
				)}
				<div className="trust-note">
					<span className="status-dot" aria-hidden="true" />
					<span>{t("home.trustNote")}</span>
				</div>
			</aside>
			<MapWorkspace coverage={summary.coverage} />
		</main>
	);
}
