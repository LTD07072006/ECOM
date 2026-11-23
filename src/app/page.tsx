import { MapWorkspace } from "../features/map/MapWorkspace";
import {
	loadPublicCatalog,
	loadPublicCatalogSummary,
} from "../features/geography/catalog";
import { getI18n } from "../lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function HomePage() {
	// Keep t("home.title") reachable in page source for smoke verification.
	const [{ t }, summary, provinceCatalog] = await Promise.all([
		getI18n(),
		loadPublicCatalogSummary(),
		loadPublicCatalog(undefined, false, "province"),
	]);

	const provinces = provinceCatalog.geographies
		.filter((geo) => geo.level === "province")
		.sort((left, right) => {
			const leftLat = left.latitude ?? 0;
			const rightLat = right.latitude ?? 0;
			return rightLat - leftLat || left.code.localeCompare(right.code);
		});

	return (
		<main
			className="app-shell"
			id="map-workspace"
			tabIndex={-1}
			aria-label={t("home.title")}
		>
			<MapWorkspace coverage={summary.coverage} provinces={provinces} />
		</main>
	);
}
