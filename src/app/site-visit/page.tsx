import { SiteVisitWorkspace } from "../../features/site-visit/SiteVisitWorkspace";
import { parseSiteVisitState } from "../../features/site-visit/site-visit-state";
import {
	wemapBrowserToken,
	wemapMapToken,
} from "../../features/site-visit/wemap-config";

export const dynamic = "force-dynamic";

export default async function SiteVisitPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
	const query = new URLSearchParams();
	for (const [key, value] of Object.entries(await searchParams)) {
		const first = Array.isArray(value) ? value[0] : value;
		if (first !== undefined) query.set(key, first);
	}
	return (
		<SiteVisitWorkspace
			initialState={parseSiteVisitState(query)}
			wemapToken={wemapBrowserToken()}
			wemapEnabled={Boolean(wemapMapToken())}
		/>
	);
}
