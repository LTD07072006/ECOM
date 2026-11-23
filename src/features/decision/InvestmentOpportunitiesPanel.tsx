"use client";

import { useI18n } from "../../lib/i18n/provider";
import { safeSourceUrl } from "../../lib/source-url";
import {
	canonicalInvestmentOpportunities,
	filterOpportunities,
	type InvestmentOpportunityItem,
} from "./investment-opportunities";
import type { SectorId } from "./model";

export function InvestmentOpportunitiesPanel({
	sector,
	provinceCodes,
	opportunities = canonicalInvestmentOpportunities,
}: {
	sector?: SectorId;
	provinceCodes?: readonly string[];
	opportunities?: readonly InvestmentOpportunityItem[];
}) {
	const { t, locale, formatNumber } = useI18n();
	const matched = filterOpportunities(opportunities, {
		sector,
		provinceCodes,
	});
	const pick = (pair: { vi: string; en: string }) =>
		locale === "vi" ? pair.vi : pair.en;

	return (
		<section
			aria-labelledby="opportunities-title"
			className="legal-readiness opportunities-panel"
		>
			<h2 id="opportunities-title">{t("opportunities.title")}</h2>
			<p className="muted">{t("opportunities.note")}</p>
			{matched.length === 0 ? (
				<p className="muted">{t("opportunities.empty")}</p>
			) : (
				<ul className="legal-checklist">
					{matched.map((item) => {
						const safeUrl = safeSourceUrl(item.officialUrl);
						return (
							<li key={item.id} className="legal-checklist-item">
								<div className="legal-item-header">
									<span className="legal-item-title">
										{pick(item.title)} ({item.provinceName})
									</span>
									<span
										className="legal-review-badge"
										data-status={
											item.readinessStatus === "available"
												? "verified_by_counsel"
												: "needs_specialist_review"
										}
									>
										{item.readinessStatus === "available"
											? t("opportunities.readyAvailable")
											: t("opportunities.readyEarly")}
									</span>
								</div>
								<p className="legal-item-note">{pick(item.description)}</p>
								<div className="legal-item-meta">
									<span>
										{t("opportunities.areaMeta", {
											available: formatNumber(item.availableAreaHa),
											total: formatNumber(item.totalAreaHa),
											occupancy: formatNumber(item.occupancyPercent),
										})}
									</span>
									{item.investmentMinUsdM != null &&
										item.investmentMaxUsdM != null && (
											<span>
												{t("opportunities.capitalMeta", {
													min: formatNumber(item.investmentMinUsdM),
													max: formatNumber(item.investmentMaxUsdM),
												})}
											</span>
										)}
									{item.powerCapacityMw != null &&
										item.wastewaterM3Day != null && (
											<span>
												{t("opportunities.utilitiesMeta", {
													power: formatNumber(item.powerCapacityMw),
													water: formatNumber(item.wastewaterM3Day),
												})}
											</span>
										)}
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
			)}
		</section>
	);
}
