import type { Metadata } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
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
		<html lang={locale} data-type="software">
			<head>
				<meta name="theme-color" content="#f2efe7" />
				<link rel="preconnect" href="https://fonts.googleapis.com" />
				<link
					rel="preconnect"
					href="https://fonts.gstatic.com"
					crossOrigin="anonymous"
				/>
				<link
					rel="stylesheet"
					href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
				/>
			</head>
			<body>
				<LocaleProvider locale={locale}>
					<LocaleSwitcher />
					{children}
				</LocaleProvider>
			</body>
		</html>
	);
}
