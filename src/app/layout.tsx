import type { Metadata } from "next";
import "./globals.css";
import { getI18n } from "../lib/i18n/server";
import { LocaleProvider } from "../lib/i18n/provider";
import { LocaleSwitcher } from "../lib/i18n/switcher";

export async function generateMetadata(): Promise<Metadata> {
	const { t } = await getI18n();
	return { title: t("meta.appTitle"), description: t("meta.appDescription") };
}

export default async function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	const { locale } = await getI18n();
	return (
		<html lang={locale}>
			<body>
				<LocaleProvider locale={locale}>
					<LocaleSwitcher />
					{children}
				</LocaleProvider>
			</body>
		</html>
	);
}
