import type { Metadata } from "next";
import { ReleaseDashboard } from "../../../features/releases/ReleaseDashboard";
import { getI18n } from "../../../lib/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
	const { t } = await getI18n();
	return {
		title: t("meta.releaseTitle"),
		robots: { index: false, follow: false },
	};
}

export default function ReleaseOperationsPage() {
	return <ReleaseDashboard />;
}
