import Link from "next/link";
import { getI18n } from "../lib/i18n/server";

export default async function NotFound() {
	const { t } = await getI18n();
	return (
		<main id="main-content" className="site-error-page" tabIndex={-1}>
			<h1>{t("notFound.title")}</h1>
			<p>{t("notFound.body")}</p>
			<div className="action-row">
				<Link href="/" className="btn btn-primary">
					{t("common.returnToMap")}
				</Link>
			</div>
		</main>
	);
}
