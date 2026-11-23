import type { DatasetMetadata, Profile } from "../geography/types";
import {
	haversineKm,
	indicatorGroups,
	type ProvinceInfrastructureItem,
} from "../map/layers";
import { InquiryForm } from "../inquiries/InquiryForm";
import { IndicatorTrend } from "./IndicatorTrend";
import { useI18n } from "../../lib/i18n/provider";
import {
	indicatorLabel,
	levelLabel,
	qualityLabel,
	scopeLabel,
	unitLabel,
} from "../../lib/i18n/data-labels";
import type { MessageKey } from "../../lib/i18n";

function DatasetDetails({ dataset }: { dataset: DatasetMetadata }) {
	const { t, formatDate } = useI18n();
	return (
		<dl className="dataset-details">
			<div>
				<dt>{t("profile.dataset")}</dt>
				<dd>
					{dataset.code} · {dataset.version}
				</dd>
			</div>
			<div>
				<dt>{t("profile.owner")}</dt>
				<dd>{dataset.owner}</dd>
			</div>
			<div>
				<dt>{t("profile.dataAsOf")}</dt>
				<dd>{formatDate(dataset.dataAsOf)}</dd>
			</div>
			<div>
				<dt>{t("profile.reviewDue")}</dt>
				<dd>{formatDate(dataset.reviewDueAt)}</dd>
			</div>
			<div>
				<dt>{t("profile.status")}</dt>
				<dd>
					{t("profile.published")} ·{" "}
					{dataset.freshness === "current"
						? t("profile.reviewCurrent")
						: t("profile.reviewDueShort")}
				</dd>
			</div>
		</dl>
	);
}

export function GeoProfilePanel({
	profile,
	infrastructure = [],
}: {
	profile: Profile;
	infrastructure?: ProvinceInfrastructureItem[];
}) {
	const { t, locale, formatNumber, formatDate } = useI18n();
	const industrialParks = infrastructure.filter(
		(item) => item.kind === "industrial_park",
	);
	const otherInfrastructure = infrastructure.filter(
		(item) => item.kind !== "industrial_park",
	);

	function distanceNote(item: ProvinceInfrastructureItem): string | null {
		if (profile.latitude === null || profile.longitude === null) return null;
		const km = haversineKm(
			profile.latitude,
			profile.longitude,
			item.latitude,
			item.longitude,
		);
		return t("infra.distanceKm", { km: formatNumber(km) });
	}

	return (
		<article className="profile-panel" data-testid="geo-profile">
			<div className="profile-heading">
				<div>
					<span className="status-badge status-badge--info">
						{levelLabel(locale, profile.level)}
					</span>
					<h2>{profile.displayName}</h2>
					<p>{profile.parentName ?? t("common.vietnam")}</p>
				</div>
				<span className="profile-code">{profile.code}</span>
			</div>
			<p className="muted">{t("profile.contextOnly")}</p>
			<p className="muted">{t("profile.defaultQualityNote")}</p>
			<details className="inquiry-entry">
				<summary>{t("profile.requestSupport")}</summary>
				<InquiryForm
					key={profile.id}
					geographyIds={[profile.id]}
					geographyLabels={[profile.displayName]}
				/>
			</details>
			<h3>{t("profile.investorOverview")}</h3>
			{(
				[
					["profile.market", ["population", "economy"]],
					["profile.investment", ["investment"]],
					["profile.workforce", ["workforce"]],
					["profile.otherIndicators", ["other"]],
				] as const
			).map(([title, groups]) => {
				const observations = profile.observations.filter((item) =>
					(groups as readonly string[]).includes(
						indicatorGroups[item.indicator] ?? "other",
					),
				);
				if (title === "profile.otherIndicators" && observations.length === 0)
					return null;
				return (
					<section key={title} className="profile-category">
						<h4>{t(title)}</h4>
						{observations.length === 0 && (
							<p className="muted">{t("profile.noCategoryData")}</p>
						)}
						{observations.map((observation) => (
							<div className="observation" key={observation.id}>
								<div className="observation-title">
									<strong>
										{indicatorLabel(
											locale,
											observation.indicator,
											observation.label,
										)}
									</strong>
									{observation.quality !== "supported" && (
										<span
											className={`status-badge ${
												observation.quality === "verified"
													? "status-badge--success"
													: "status-badge--warning"
											}`}
										>
											{qualityLabel(locale, observation.quality)}
										</span>
									)}
								</div>
								<div className="observation-value">
									{observation.value === null ? (
										<span className="unavailable">{t("common.noData")}</span>
									) : (
										`${formatNumber(observation.value)} ${unitLabel(locale, observation.unit)}`
									)}
								</div>
								<IndicatorTrend observation={observation} />
								<p>
									{observation.period} · {unitLabel(locale, observation.unit)}
								</p>
								<details>
									<summary>{t("profile.sourceLimitations")}</summary>
									<p>
										{observation.source.url ? (
											<a href={observation.source.url}>
												{observation.source.citation}
											</a>
										) : (
											observation.source.citation
										)}
									</p>
									<dl className="dataset-details">
										<div>
											<dt>{t("profile.definition")}</dt>
											<dd>{observation.definition}</dd>
										</div>
										<div>
											<dt>{t("profile.period")}</dt>
											<dd>
												{formatDate(observation.periodStart)} –{" "}
												{formatDate(observation.periodEnd)}
											</dd>
										</div>
										<div>
											<dt>{t("profile.licenseAccess")}</dt>
											<dd>
												{observation.source.license} /{" "}
												{observation.source.access}
											</dd>
										</div>
										<div>
											<dt>{t("profile.updated")}</dt>
											<dd>{formatDate(observation.source.updatedAt)}</dd>
										</div>
										<div>
											<dt>{t("profile.datasetVersion")}</dt>
											<dd>{observation.datasetVersion}</dd>
										</div>
										<div>
											<dt>{t("profile.scope")}</dt>
											<dd>{scopeLabel(locale, observation.scope)}</dd>
										</div>
										{observation.missingReason && (
											<div>
												<dt>{t("profile.missingReason")}</dt>
												<dd>{observation.missingReason}</dd>
											</div>
										)}
									</dl>
									<p>{observation.method}</p>
									<p>{observation.limitations}</p>
									{observation.dataset && (
										<DatasetDetails dataset={observation.dataset} />
									)}
								</details>
							</div>
						))}
					</section>
				);
			})}
			<section className="profile-category">
				<h4>{t("profile.industrialParks")}</h4>
				{industrialParks.length > 0 ? (
					<ul className="profile-infra-list">
						{industrialParks.map((park) => {
							const dist = distanceNote(park);
							return (
								<li key={`${park.geoId}-${park.name}`}>
									{park.url ? (
										<a href={park.url}>{park.name}</a>
									) : (
										<strong>{park.name}</strong>
									)}
									{park.code ? ` (${park.code})` : ""}
									{dist ? ` · ${dist}` : ""}
								</li>
							);
						})}
					</ul>
				) : (
					<p className="muted">{t("profile.parksUnavailable")}</p>
				)}
				<p>
					<a href="https://investvietnam.gov.vn/en/industrial-zones.pl.html">
						{t("profile.parksExternal")}
					</a>
				</p>
			</section>
			{otherInfrastructure.length > 0 && (
				<section className="profile-category">
					<h4>{t("infra.verifiedTitle")}</h4>
					<ul className="profile-infra-list">
						{otherInfrastructure.map((item) => {
							const dist = distanceNote(item);
							return (
								<li key={`${item.kind}-${item.geoId}-${item.name}`}>
									<strong>{item.name}</strong>
									{item.code ? ` (${item.code})` : ""} ·{" "}
									{t(`infra.${item.kind}` as MessageKey)}
									{dist ? ` · ${dist}` : ""}
									{item.url ? (
										<>
											{" "}
											· <a href={item.url}>{t("infra.sourceRecord")}</a>
										</>
									) : null}
								</li>
							);
						})}
					</ul>
				</section>
			)}
			<p>
				<a href="/investor-guide">{t("guide.link")}</a>
			</p>
			{profile.administrativeDataset && (
				<details className="catalog-provenance">
					<summary>{t("profile.adminSource")}</summary>
					<p>
						<a href={profile.administrativeDataset.source.url ?? undefined}>
							{profile.administrativeDataset.source.publisher}
						</a>
					</p>
					<DatasetDetails dataset={profile.administrativeDataset} />
				</details>
			)}
		</article>
	);
}
