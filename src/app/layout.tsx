import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import "./styles/shell.css";
import "./styles/map.css";
import "./styles/decision.css";
import "./styles/read.css";
import "./styles/internal.css";
import { SiteHeader } from "../components/SiteHeader";
import { LocaleProvider } from "../lib/i18n/provider";
import { getI18n } from "../lib/i18n/server";

const beVietnamPro = Be_Vietnam_Pro({
	subsets: ["latin", "vietnamese"],
	weight: ["400", "500", "600", "700", "800"],
	display: "swap",
	variable: "--font-sans",
});

export async function generateMetadata(): Promise<Metadata> {
	const { t } = await getI18n();
	return { title: t("meta.appTitle"), description: t("meta.appDescription") };
}

export default async function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	const { locale } = await getI18n();
	return (
		<html
			lang={locale}
			className={`${beVietnamPro.variable} ${beVietnamPro.className}`}
		>
			<body className={beVietnamPro.className}>
				<LocaleProvider locale={locale}>
					<SiteHeader />
					{children}
				</LocaleProvider>
			</body>
		</html>
	);
}
