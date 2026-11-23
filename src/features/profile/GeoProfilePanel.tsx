"use client";

import { useState } from "react";
import type { DatasetMetadata, Profile } from "../geography/types";
import {
	haversineKm,
	indicatorGroups,
	type ProvinceInfrastructureItem,
} from "../map/layers";
import {
	getProvinceMicroLocations,
	type MicroLocationCategory,
	type ProvinceMicroLocation,
} from "../map/province-detail-locations";
import type { FocusedMicroLocation } from "../map/ProvinceMap";
import { InquiryForm } from "../inquiries/InquiryForm";
import { resolveIpaContactsForInquiry } from "../inquiries/ipa-directory";
import { describeProvinceIncentiveZones } from "../decision/investment-incentives";
import {
	canonicalInvestmentOpportunities,
	filterOpportunities,
} from "../decision/investment-opportunities";
import { IndicatorTrend } from "./IndicatorTrend";
import { DistrictPanel } from "./DistrictPanel";
import type { ProvinceDistrictProfile } from "../map/province-districts";
import { useI18n } from "../../lib/i18n/provider";
import {
	formalPlaceName,
	indicatorLabel,
	levelLabel,
	qualityLabel,
	scopeLabel,
	unitLabel,
} from "../../lib/i18n/data-labels";
import type { MessageKey } from "../../lib/i18n";

function DatasetDetails({ dataset }: { dataset: DatasetMetadata }) {
	const { t } = useI18n();
	return (
		<dl className="dataset-details">
			<div>
				<dt>{t("profile.dataset")}</dt>
				<dd>{dataset.version}</dd>
			</div>
			<div>
				<dt>{t("profile.owner")}</dt>
				<dd>{dataset.owner}</dd>
			</div>
			<div>
				<dt>{t("profile.dataAsOf")}</dt>
				<dd>{dataset.dataAsOf}</dd>
			</div>
			<div>
				<dt>{t("profile.reviewDue")}</dt>
				<dd>{dataset.reviewDueAt.slice(0, 10)}</dd>
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
	activeCategoryFilter = "all",
	onCategoryFilterChange,
	onFocusMicroLocation,
	onDetailModeChange,
	onDistrictSelect,
}: {
	profile: Profile;
	infrastructure?: ProvinceInfrastructureItem[];
	activeCategoryFilter?: "all" | MicroLocationCategory;
	onCategoryFilterChange?: (category: "all" | MicroLocationCategory) => void;
	onFocusMicroLocation?: (location: FocusedMicroLocation) => void;
	onDetailModeChange?: (isDetail: boolean) => void;
	onDistrictSelect?: (district: ProvinceDistrictProfile | null) => void;
}) {
	const { t, locale, formatNumber } = useI18n();
	const [activeTab, setActiveTab] = useState<
		"overview" | "districts" | "detail"
	>("overview");
	const [localCategory, setLocalCategory] = useState<
		"all" | MicroLocationCategory
	>("all");

	const categoryFilter = onCategoryFilterChange
		? activeCategoryFilter
		: localCategory;
	const setCategoryFilter = (next: "all" | MicroLocationCategory) => {
		setLocalCategory(next);
		onCategoryFilterChange?.(next);
	};

	const switchTab = (tab: "overview" | "districts" | "detail") => {
		setActiveTab(tab);
		if (tab !== "districts") onDistrictSelect?.(null);
		onDetailModeChange?.(tab !== "overview");
	};

	const pick = (pair: { vi: string; en: string }) =>
		locale === "vi" ? pair.vi : pair.en;

	const microLocations = getProvinceMicroLocations(profile, infrastructure);
	const izLocations = microLocations.filter(
		(item) => item.category === "industrial_zone",
	);
	const rzLocations = microLocations.filter(
		(item) => item.category === "residential_zone",
	);
	const logisticsLocations = microLocations.filter(
		(item) => item.category === "logistics_hub",
	);

	const industrialParks = infrastructure.filter(
		(item) => item.kind === "industrial_park",
	);
	const otherInfrastructure = infrastructure.filter(
		(item) => item.kind !== "industrial_park",
	);

	function distanceNote(item: {
		latitude: number;
		longitude: number;
	}): string | null {
		if (profile.latitude === null || profile.longitude === null) return null;
		const km = haversineKm(
			profile.latitude,
			profile.longitude,
			item.latitude,
			item.longitude,
		);
		return t("infra.distanceKm", { km: formatNumber(km) });
	}

	function focusOnMap(loc: ProvinceMicroLocation) {
		onFocusMicroLocation?.({
			id: loc.id,
			code: loc.code,
			category: loc.category,
			name: pick(loc.name),
			district: pick(loc.district),
			province: loc.provinceName,
			scaleSummary: pick(loc.scaleSummary),
			highlightMetric: pick(loc.highlightMetric),
			targetFit: pick(loc.targetFit),
			url: loc.officialUrl,
			latitude: loc.latitude,
			longitude: loc.longitude,
		});
	}

	const zoneProfile = describeProvinceIncentiveZones(profile);
	const provinceOpps = filterOpportunities(canonicalInvestmentOpportunities, {
		provinceCodes: [profile.code],
	});
	const ipaContacts = resolveIpaContactsForInquiry({
		provinceCodes: [profile.code],
		provinceNames: [profile.displayName],
	});

	function renderMicroCard(loc: ProvinceMicroLocation) {
		const dist = distanceNote(loc);
		return (
			<li key={loc.id} className={`micro-location-card ${loc.category}`}>
				<div className="micro-card-header">
					<div>
						<span className={`micro-popup-badge ${loc.category}`}>
							{loc.category === "industrial_zone"
								? t("micro.badgeIndustrial")
								: loc.category === "residential_zone"
									? t("micro.badgeResidential")
									: t("micro.badgeLogistics")}
						</span>
						<h5>
							{pick(loc.name)} <small>({loc.code})</small>
						</h5>
					</div>
					<button
						type="button"
						className="micro-locate-btn"
						onClick={() => focusOnMap(loc)}
					>
						{t("micro.locateOnMap")}
					</button>
				</div>
				<p className="micro-card-district">
					{pick(loc.district)}
					{dist ? ` · ${dist}` : ""} ·{" "}
					<code>
						{loc.latitude.toFixed(4)}°N, {loc.longitude.toFixed(4)}°E
					</code>
				</p>
				<p className="micro-card-scale">
					<strong>{pick(loc.scaleSummary)}</strong>
				</p>
				<p className="micro-card-highlight">{pick(loc.highlightMetric)}</p>
				<p className="micro-card-fit">
					<span>{t("micro.targetFitLabel")}:</span> {pick(loc.targetFit)}
				</p>
				{loc.officialUrl && (
					<div className="micro-card-footer">
						<a href={loc.officialUrl} target="_blank" rel="noopener noreferrer">
							{t("infra.sourceRecord")}
						</a>
					</div>
				)}
			</li>
		);
	}

	return (
		<article className="profile-panel" data-testid="geo-profile">
			<div className="profile-heading">
				<div>
					<span className="map-label">
						{levelLabel(locale, profile.level, profile)}
					</span>
					<h2>{formalPlaceName(locale, profile)}</h2>
					<p>
						{profile.parentName ?? t("common.vietnam")} ·{" "}
						{profile.geographyVersion}
					</p>
				</div>
				<span className="profile-code">{profile.code}</span>
			</div>

			<div
				className="profile-view-tabs"
				role="tablist"
				aria-label={t("micro.tabsAria")}
			>
				<button
					type="button"
					role="tab"
					aria-selected={activeTab === "overview"}
					className={activeTab === "overview" ? "active" : ""}
					onClick={() => switchTab("overview")}
				>
					{t("micro.tabOverview")}
				</button>
				{profile.level === "province" && (
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === "districts"}
						className={activeTab === "districts" ? "active" : ""}
						onClick={() => switchTab("districts")}
					>
						{t("district.tab")}
					</button>
				)}
				<button
					type="button"
					role="tab"
					aria-selected={activeTab === "detail"}
					className={activeTab === "detail" ? "active" : ""}
					onClick={() => switchTab("detail")}
				>
					{t("micro.tabDetail")} ({microLocations.length})
				</button>
			</div>

			{activeTab === "districts" && (
				<div role="tabpanel" aria-label={t("district.tab")}>
					<DistrictPanel
						province={profile}
						locations={microLocations}
						onSelect={onDistrictSelect}
						onLocate={focusOnMap}
					/>
				</div>
			)}
			{activeTab === "overview" && (
				<div className="micro-overview-callout">
					<div>
						<strong>
							{t("micro.calloutTitle", {
								iz: formatNumber(izLocations.length),
								rz: formatNumber(rzLocations.length),
							})}
						</strong>
						<p className="muted">{t("micro.calloutNote")}</p>
					</div>
					<button
						type="button"
						className="micro-open-detail-btn"
						onClick={() => switchTab("detail")}
					>
						{t("micro.openFullDetail")} →
					</button>
				</div>
			)}

			{activeTab === "detail" && (
				<div className="province-deep-dive" data-testid="province-detail-tab">
					<section className="profile-category">
						<h4>{t("micro.mapFilterTitle")}</h4>
						<p className="muted">{t("micro.mapFilterNote")}</p>
						<div className="micro-filter-pills">
							{(
								[
									["all", t("micro.filterAll"), microLocations.length],
									[
										"industrial_zone",
										t("micro.badgeIndustrial"),
										izLocations.length,
									],
									[
										"residential_zone",
										t("micro.badgeResidential"),
										rzLocations.length,
									],
									[
										"logistics_hub",
										t("micro.badgeLogistics"),
										logisticsLocations.length,
									],
								] as const
							).map(([cat, label, count]) => (
								<button
									key={cat}
									type="button"
									aria-pressed={categoryFilter === cat}
									className={categoryFilter === cat ? "active" : ""}
									onClick={() => setCategoryFilter(cat)}
								>
									{label} ({count})
								</button>
							))}
						</div>
					</section>

					{(categoryFilter === "all" ||
						categoryFilter === "industrial_zone") && (
						<section className="profile-category">
							<h4>
								{t("micro.sectionIndustrial")} ({izLocations.length})
							</h4>
							<ul className="micro-location-list">
								{izLocations.map((loc) => renderMicroCard(loc))}
							</ul>
						</section>
					)}

					{(categoryFilter === "all" ||
						categoryFilter === "residential_zone") && (
						<section className="profile-category">
							<h4>
								{t("micro.sectionResidential")} ({rzLocations.length})
							</h4>
							<ul className="micro-location-list">
								{rzLocations.map((loc) => renderMicroCard(loc))}
							</ul>
						</section>
					)}

					{(categoryFilter === "all" || categoryFilter === "logistics_hub") &&
						logisticsLocations.length > 0 && (
							<section className="profile-category">
								<h4>
									{t("micro.sectionLogistics")} ({logisticsLocations.length})
								</h4>
								<ul className="micro-location-list">
									{logisticsLocations.map((loc) => renderMicroCard(loc))}
								</ul>
							</section>
						)}

					<section className="profile-category">
						<h4>{t("micro.sectionAllIndicators")}</h4>
						<div className="decision-table-wrap">
							<table>
								<thead>
									<tr>
										<th>{t("comparison.indicator")}</th>
										<th>{t("micro.colValue")}</th>
										<th>{t("profile.period")}</th>
										<th>{t("search.quality")}</th>
									</tr>
								</thead>
								<tbody>
									{profile.observations.map((obs) => (
										<tr key={obs.id}>
											<th>
												{indicatorLabel(locale, obs.indicator, obs.label)}
											</th>
											<td>
												{obs.value === null
													? t("common.noData")
													: `${formatNumber(obs.value)} ${unitLabel(locale, obs.unit)}`}
											</td>
											<td>{obs.period}</td>
											<td>{qualityLabel(locale, obs.quality)}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</section>
				</div>
			)}

			<p className="muted">{t("profile.contextOnly")}</p>
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
									<span>{qualityLabel(locale, observation.quality)}</span>
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
												{observation.periodStart} – {observation.periodEnd}
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
											<dd>{observation.source.updatedAt}</dd>
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
			{profile.level === "province" && (
				<>
					<section className="profile-category">
						<h4>{t("incentives.title")}</h4>
						<p className="muted">{pick(zoneProfile.keyZones)}</p>
						<p className="muted">{pick(zoneProfile.authorityNote)}</p>
					</section>
					{provinceOpps.length > 0 && (
						<section className="profile-category">
							<h4>{t("opportunities.title")}</h4>
							<ul className="profile-infra-list">
								{provinceOpps.map((opp) => (
									<li key={opp.id}>
										<strong>{pick(opp.title)}</strong> ·{" "}
										{t("opportunities.areaMeta", {
											available: formatNumber(opp.availableAreaHa),
											total: formatNumber(opp.totalAreaHa),
											occupancy: formatNumber(opp.occupancyPercent),
										})}
									</li>
								))}
							</ul>
						</section>
					)}
					{ipaContacts.length > 0 && (
						<section className="profile-category">
							<h4>{t("ipa.title")}</h4>
							<ul className="profile-infra-list">
								{ipaContacts.map((contact) => (
									<li key={contact.code}>
										<strong>{pick(contact.organization)}</strong> ·{" "}
										{pick(contact.department)} ·{" "}
										<a
											href={contact.officialUrl}
											target="_blank"
											rel="noopener noreferrer"
										>
											{contact.publicEmail}
										</a>
									</li>
								))}
							</ul>
						</section>
					)}
				</>
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
