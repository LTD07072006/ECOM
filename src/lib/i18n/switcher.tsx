"use client";

import { useRouter } from "next/navigation";
import { useI18n } from "./provider";
import { LOCALE_COOKIE, LOCALES, type Locale } from "./locale";

export function LocaleSwitcher() {
	const { locale, t } = useI18n();
	const router = useRouter();

	function select(next: Locale) {
		if (next === locale) return;
		// biome-ignore lint/suspicious/noDocumentCookie: non-sensitive UI locale cookie read by Next.js server rendering
		document.cookie = `${LOCALE_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
		router.refresh();
	}

	return (
		<fieldset className="locale-switcher">
			<legend className="locale-switcher-legend">{t("common.language")}</legend>
			{LOCALES.map((item) => (
				<button
					key={item}
					type="button"
					lang={item}
					aria-pressed={item === locale}
					onClick={() => select(item)}
					title={t(item === "vi" ? "common.languageVi" : "common.languageEn")}
				>
					{item.toUpperCase()}
				</button>
			))}
		</fieldset>
	);
}
