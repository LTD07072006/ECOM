import { getI18n } from "../../lib/i18n/server";

export default async function InvestorGuidePage() {
  const { t } = await getI18n();
  return <main className="decision-page">
    <a href="/">{t("common.backToMap")}</a>
    <h1>{t("guide.title")}</h1>
    <p>{t("guide.intro")}</p>
    <ol className="investor-guide-steps">
      <li>{t("guide.step1")}</li><li>{t("guide.step2")}</li><li>{t("guide.step3")}</li>
      <li>{t("guide.step4")}</li><li>{t("guide.step5")}</li>
    </ol>
    <p><a href="/">{t("guide.explore")}</a></p>
    <section aria-labelledby="guide-sources"><h2 id="guide-sources">{t("guide.sources")}</h2>
      <p>{t("guide.sourceCaution")}</p>
      <ul>
        <li><a href="https://investvietnam.gov.vn/en/investment-guide.hhdtl.html">{t("guide.investVietnam")}</a></li>
        <li><a href="https://investvietnam.gov.vn/en/establishment-of-company.nd/procedures-of-establishment-of-foreign-invested-company.html">{t("guide.company")}</a></li>
        <li><a href="https://investvietnam.gov.vn/en/land.nd/land-for-investment-project.html">{t("guide.land")}</a></li>
      </ul><p>{t("guide.date")}</p>
    </section>
  </main>;
}
