import type { DatasetMetadata, Profile } from "../geography/types";
import { indicatorGroups } from "../map/layers";
import { InquiryForm } from "../inquiries/InquiryForm";
import { useI18n } from "../../lib/i18n/provider";
import { indicatorLabel, levelLabel, qualityLabel, scopeLabel, unitLabel } from "../../lib/i18n/data-labels";

function DatasetDetails({ dataset }: { dataset: DatasetMetadata }) {
  const { t } = useI18n();
  return <dl className="dataset-details">
    <div><dt>{t("profile.dataset")}</dt><dd>{dataset.version}</dd></div>
    <div><dt>{t("profile.owner")}</dt><dd>{dataset.owner}</dd></div>
    <div><dt>{t("profile.dataAsOf")}</dt><dd>{dataset.dataAsOf}</dd></div>
    <div><dt>{t("profile.reviewDue")}</dt><dd>{dataset.reviewDueAt.slice(0, 10)}</dd></div>
    <div><dt>{t("profile.status")}</dt><dd>{t("profile.published")} · {dataset.freshness === "current" ? t("profile.reviewCurrent") : t("profile.reviewDueShort")}</dd></div>
  </dl>;
}

export function GeoProfilePanel({ profile }: { profile: Profile }) {
  const { t, locale, formatNumber } = useI18n();
  return <article className="profile-panel" data-testid="geo-profile">
    <div className="profile-heading"><div><span className="map-label">{levelLabel(locale, profile.level)}</span><h2>{profile.displayName}</h2><p>{profile.parentName ?? t("common.vietnam")} · {profile.geographyVersion}</p></div><span className="profile-code">{profile.code}</span></div>
    <p className="muted">{t("profile.contextOnly")}</p>
    <details className="inquiry-entry">
      <summary>{t("profile.requestSupport")}</summary>
      <InquiryForm geographyIds={[profile.id]} geographyLabels={[profile.displayName]} />
    </details>
    <h3>{t("profile.investorOverview")}</h3>
    {([ ["profile.market", ["population", "economy"]], ["profile.investment", ["investment"]], ["profile.workforce", ["workforce"]], ["profile.otherIndicators", ["other"]] ] as const).map(([title, groups]) => {
      const observations = profile.observations.filter((item) => (groups as readonly string[]).includes(indicatorGroups[item.indicator] ?? "other"));
      if (title === "profile.otherIndicators" && observations.length === 0) return null;
      return <section key={title} className="profile-category"><h4>{t(title)}</h4>
        {observations.length === 0 && <p className="muted">{t("profile.noCategoryData")}</p>}
        {observations.map((observation) => <div className="observation" key={observation.id}>
      <div className="observation-title"><strong>{indicatorLabel(locale, observation.indicator, observation.label)}</strong><span>{qualityLabel(locale, observation.quality)}</span></div>
      <div className="observation-value">{observation.value === null ? <span className="unavailable">{t("common.noData")}</span> : `${formatNumber(observation.value)} ${unitLabel(locale, observation.unit)}`}</div>
      <p>{observation.period} · {unitLabel(locale, observation.unit)}</p>
      <details>
        <summary>{t("profile.sourceLimitations")}</summary>
        <p>{observation.source.url ? <a href={observation.source.url}>{observation.source.citation}</a> : observation.source.citation}</p>
        <dl className="dataset-details">
          <div><dt>{t("profile.definition")}</dt><dd>{observation.definition}</dd></div>
          <div><dt>{t("profile.period")}</dt><dd>{observation.periodStart} – {observation.periodEnd}</dd></div>
          <div><dt>{t("profile.licenseAccess")}</dt><dd>{observation.source.license} / {observation.source.access}</dd></div>
          <div><dt>{t("profile.updated")}</dt><dd>{observation.source.updatedAt}</dd></div>
          <div><dt>{t("profile.datasetVersion")}</dt><dd>{observation.datasetVersion}</dd></div>
          <div><dt>{t("profile.scope")}</dt><dd>{scopeLabel(locale, observation.scope)}</dd></div>
          {observation.missingReason && <div><dt>{t("profile.missingReason")}</dt><dd>{observation.missingReason}</dd></div>}
        </dl>
        <p>{observation.method}</p>
        <p>{observation.limitations}</p>
        {observation.dataset && <DatasetDetails dataset={observation.dataset} />}
      </details>
    </div>)}
      </section>;
    })}
    <section className="profile-category"><h4>{t("profile.industrialParks")}</h4><p className="muted">{t("profile.parksUnavailable")}</p></section>
    <p><a href="/investor-guide">{t("guide.link")}</a></p>
    {profile.administrativeDataset && <details className="catalog-provenance">
      <summary>{t("profile.adminSource")}</summary>
      <p><a href={profile.administrativeDataset.source.url ?? undefined}>{profile.administrativeDataset.source.publisher}</a></p>
      <DatasetDetails dataset={profile.administrativeDataset} />
    </details>}
  </article>;
}
