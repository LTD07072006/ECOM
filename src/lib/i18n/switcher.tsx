"use client";

import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, LOCALES, type Locale } from "./locale";
import { useI18n } from "./provider";

export function LocaleSwitcher() {
	const { locale, t } = useI18n();
	const router = useRouter();

	function select(next: Locale) {
		if (next === locale) return;
		const secure = window.location.protocol === "https:" ? "; Secure" : "";
		// biome-ignore lint/suspicious/noDocumentCookie: non-sensitive UI locale cookie read by Next.js server rendering
		document.cookie = `${LOCALE_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
		router.refresh();
	}

	return (
		<fieldset className="locale-switcher">
			<legend className="sr-only">{t("common.language")}</legend>
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
