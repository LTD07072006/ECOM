"use client";

import { useI18n } from "../../lib/i18n/provider";
import { safeSourceUrl } from "../../lib/source-url";
import {
	canonicalInvestmentIncentives,
	matchIncentivesForSectorAndProvinces,
	type IncentiveType,
	type IncentiveZoneTier,
	type InvestmentIncentiveItem,
} from "./investment-incentives";
import type { SectorId } from "./model";

export function InvestmentIncentivesPanel({
	sector,
	selectedProvinces,
	incentives = canonicalInvestmentIncentives,
}: {
	sector: SectorId;
	selectedProvinces: ReadonlyArray<{
		id: string;
		code: string;
		displayName: string;
	}>;
	incentives?: readonly InvestmentIncentiveItem[];
}) {
	const { t, locale } = useI18n();
	const matched = matchIncentivesForSectorAndProvinces(
		incentives,
		sector,
		selectedProvinces,
	);

	const pick = (pair: { vi: string; en: string }) =>
		locale === "vi" ? pair.vi : pair.en;

	const typeLabel = (type: IncentiveType) => {
		if (type === "cit_rate_holiday") return t("incentives.typeCit");
		if (type === "land_rent_exemption") return t("incentives.typeLand");
		if (type === "import_duty_exemption") return t("incentives.typeImport");
		return t("incentives.typeRd");
	};

	const tierLabel = (tier: IncentiveZoneTier) => {
		if (tier === "economic_zone_hightech")
			return t("incentives.tierEzHightech");
		if (tier === "special_difficult_area")
			return t("incentives.tierSpecialDifficult");
		if (tier === "difficult_area") return t("incentives.tierDifficult");
		if (tier === "industrial_park") return t("incentives.tierIndustrialPark");
		if (tier === "sector_encouraged")
			return t("incentives.tierSectorEncouraged");
		return t("incentives.tierStandard");
	};

	return (
		<section
			aria-labelledby="incentives-title"
			className="legal-readiness incentives-panel"
		>
			<h2 id="incentives-title">{t("incentives.title")}</h2>
			<p className="legal-advisory-banner" role="note">
				<strong>{t("incentives.advisoryBadge")}</strong> —{" "}
				{t("incentives.advisoryDisclaimer")}
			</p>

			{matched.provinceProfiles.length > 0 && (
				<div className="incentive-provinces">
					<h3>{t("incentives.provinceZonesTitle")}</h3>
					<ul className="legal-checklist">
						{matched.provinceProfiles.map((profile) => (
							<li key={profile.provinceId} className="legal-checklist-item">
								<div className="legal-item-header">
									<span className="legal-item-title">
										{profile.provinceName} ({profile.provinceCode})
									</span>
									<span
										className="legal-review-badge"
										data-status="verified_by_counsel"
									>
										{tierLabel(profile.primaryZoneTier)}
									</span>
								</div>
								<p className="legal-item-note">{pick(profile.keyZones)}</p>
								<p className="muted">{pick(profile.authorityNote)}</p>
							</li>
						))}
					</ul>
				</div>
			)}

			<ul className="legal-checklist">
				{matched.incentives.map((item) => {
					const safeUrl = safeSourceUrl(item.reference.officialUrl);
					return (
						<li key={item.id} className="legal-checklist-item">
							<div className="legal-item-header">
								<span className="legal-item-title">{pick(item.title)}</span>
								<span
									className="legal-review-badge"
									data-status="needs_specialist_review"
								>
									{typeLabel(item.incentiveType)} · {tierLabel(item.zoneTier)}
								</span>
							</div>
							<p className="incentive-headline">
								<strong>{pick(item.headlineBenefit)}</strong>
							</p>
							<p className="legal-item-note">{pick(item.description)}</p>
							<p className="legal-item-note">
								<strong>{t("incentives.eligibilityLabel")}:</strong>{" "}
								{pick(item.eligibilityNote)}
							</p>
							<div className="legal-item-meta">
								<span>
									{t("legal.documentMeta", {
										code: item.reference.documentCode,
										title: pick(item.reference.title),
										authority: pick(item.reference.issuingAuthority),
									})}
								</span>
								<span>
									{t("legal.effectiveDate", {
										date: item.validFrom,
									})}
								</span>
								{safeUrl && (
									<a href={safeUrl} target="_blank" rel="noopener noreferrer">
										{t("legal.officialSource")}
									</a>
								)}
							</div>
						</li>
					);
				})}
			</ul>
		</section>
	);
}
