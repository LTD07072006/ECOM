"use client";

import Link from "next/link";
import { useI18n } from "../lib/i18n/provider";

export default function GlobalError({
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	const { t } = useI18n();
	return (
		<main id="main-content" className="site-error-page" tabIndex={-1}>
			<h1>{t("error.title")}</h1>
			<p>{t("error.body")}</p>
			<div className="action-row">
				<button type="button" className="btn btn-primary" onClick={reset}>
					{t("error.retry")}
				</button>
				<Link href="/" className="btn btn-secondary">
					{t("common.returnToMap")}
				</Link>
			</div>
		</main>
	);
}
