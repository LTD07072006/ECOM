import Link from "next/link";
import {
	LAW_ENTERPRISES_2020,
	LAW_INVESTMENT_2020,
} from "../../features/decision/legal-readiness";
import { getI18n } from "../../lib/i18n/server";

function sentenceCase(label: string, locale: string): string {
	if (!label) return label;
	return label[0].toLocaleUpperCase(locale) + label.slice(1);
}

export default async function InvestorGuidePage() {
	const { t, locale } = await getI18n();
	const intlTag = locale === "vi" ? "vi-VN" : "en-US";
	return (
		<main id="main-content" className="read-page" tabIndex={-1}>
			<article className="read-sheet">
				<div className="read-column">
					<p>
						<Link href="/" className="btn btn-quiet btn-sm">
							{t("common.backToMap")}
						</Link>
					</p>
					<h1>{t("guide.title")}</h1>
					<p>{t("guide.intro")}</p>
					<ol>
						<li>{t("guide.step1")}</li>
						<li>{t("guide.step2")}</li>
						<li>{t("guide.step3")}</li>
						<li>{t("guide.step4")}</li>
						<li>{t("guide.step5")}</li>
					</ol>
					<p>
						<Link href="/" className="btn btn-primary">
							{t("guide.explore")}
						</Link>
					</p>
					<section className="read-glossary" aria-labelledby="guide-glossary">
						<h2 id="guide-glossary">{t("guide.glossaryTitle")}</h2>
						<dl>
							<dt>{sentenceCase(t("quality.verified"), intlTag)}</dt>
							<dd>{t("guide.termVerifiedBody")}</dd>
							<dt>{sentenceCase(t("quality.supported"), intlTag)}</dt>
							<dd>{t("guide.termSupportedBody")}</dd>
							<dt>{sentenceCase(t("quality.unavailable"), intlTag)}</dt>
							<dd>{t("guide.termUnavailableBody")}</dd>
							<dt>{t("guide.termGrdpTitle")}</dt>
							<dd>{t("guide.termGrdpBody")}</dd>
							<dt>{t("guide.termIrcErcTitle")}</dt>
							<dd>
								{t("guide.termIrcPrefix")}
								<a href={LAW_INVESTMENT_2020.officialUrl}>
									{LAW_INVESTMENT_2020.title[locale]} (
									{LAW_INVESTMENT_2020.documentCode})
								</a>
								{t("guide.termIrcMid")}
								<a href={LAW_ENTERPRISES_2020.officialUrl}>
									{LAW_ENTERPRISES_2020.title[locale]} (
									{LAW_ENTERPRISES_2020.documentCode})
								</a>
								{t("guide.termIrcSuffix")}
							</dd>
							<dt>{t("guide.termCatalogTitle")}</dt>
							<dd>{t("guide.termCatalogBody")}</dd>
						</dl>
					</section>
					<section aria-labelledby="guide-sources">
						<h2 id="guide-sources">{t("guide.sources")}</h2>
						<p>{t("guide.sourceCaution")}</p>
						<ul>
							<li>
								<a href="https://investvietnam.gov.vn/en/investment-guide.hhdtl.html">
									{t("guide.investVietnam")}
								</a>
							</li>
							<li>
								<a href="https://investvietnam.gov.vn/en/establishment-of-company.nd/procedures-of-establishment-of-foreign-invested-company.html">
									{t("guide.company")}
								</a>
							</li>
							<li>
								<a href="https://investvietnam.gov.vn/en/land.nd/land-for-investment-project.html">
									{t("guide.land")}
								</a>
							</li>
						</ul>
						<p className="read-meta-line">{t("guide.date")}</p>
					</section>
				</div>
			</article>
		</main>
	);
}
