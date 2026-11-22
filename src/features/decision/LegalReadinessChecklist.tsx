"use client";

import { useState } from "react";
import { useI18n } from "../../lib/i18n/provider";
import { safeSourceUrl } from "../../lib/source-url";
import {
	buildLegalReadinessExport,
	legalReadinessToCsv,
	summarizeLegalReadiness,
	type LegalReadinessItem,
} from "./legal-readiness";
import type { SectorId } from "./model";

function downloadText(content: string, filename: string, mime: string) {
	const blob = new Blob([content], { type: mime });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	link.remove();
	URL.revokeObjectURL(url);
}

export function LegalReadinessChecklist({
	sector,
	sectorLabel,
	items,
	selectedProvinces,
}: {
	sector: SectorId;
	sectorLabel: string;
	items: readonly LegalReadinessItem[];
	selectedProvinces: Array<{ id: string; name: string }>;
}) {
	const { t, locale } = useI18n();
	const [checkedBySector, setCheckedBySector] = useState<
		Partial<Record<SectorId, string[]>>
	>({});
	const [counselRefBySector, setCounselRefBySector] = useState<
		Partial<Record<SectorId, string>>
	>({});
	const [exportFeedback, setExportFeedback] = useState("");

	const checkedIds = checkedBySector[sector] ?? [];
	const counselReference = counselRefBySector[sector] ?? "";
	const summary = summarizeLegalReadiness(items, checkedIds, counselReference);

	function toggleItem(itemId: string) {
		setCheckedBySector((current) => {
			const existing = current[sector] ?? [];
			const next = existing.includes(itemId)
				? existing.filter((id) => id !== itemId)
				: [...existing, itemId];
			return { ...current, [sector]: next };
		});
		setExportFeedback("");
	}

	function handleCounselRefChange(value: string) {
		setCounselRefBySector((current) => ({ ...current, [sector]: value }));
		setExportFeedback("");
	}

	function handleExport(format: "json" | "csv") {
		const payload = buildLegalReadinessExport({
			sector,
			sectorLabel,
			locale,
			items,
			checkedIds,
			selectedProvinces,
			counselReference,
		});
		const stamp = payload.generatedAt.slice(0, 10);
		if (format === "json") {
			downloadText(
				`${JSON.stringify(payload, null, 2)}\n`,
				`legal-readiness-${sector}-${stamp}.json`,
				"application/json;charset=utf-8",
			);
		} else {
			downloadText(
				legalReadinessToCsv(payload),
				`legal-readiness-${sector}-${stamp}.csv`,
				"text/csv;charset=utf-8",
			);
		}
		setExportFeedback(
			t("legal.exported", {
				format: format.toUpperCase(),
				sector: sectorLabel,
			}),
		);
	}

	const outcomeKey =
		summary.advisoryOutcome === "counsel_reference_recorded_advisory_only"
			? "legal.outcomeCounselRecorded"
			: summary.advisoryOutcome === "prepared_requires_specialist_verification"
				? "legal.outcomePreparedVerify"
				: summary.advisoryOutcome === "in_progress_to_verify"
					? "legal.outcomeInProgress"
					: "legal.outcomeNotStarted";

	const reviewStateLabel = (status: LegalReadinessItem["reviewStatus"]) => {
		if (status === "needs_specialist_review")
			return t("legal.reviewSpecialist");
		if (status === "verified_by_counsel") return t("legal.reviewVerified");
		return t("legal.reviewToVerify");
	};

	return (
		<section aria-labelledby="checklist-title" className="legal-readiness">
			<h2 id="checklist-title">{t("retail.checklistTitle")}</h2>
			<p className="legal-advisory-banner" role="note">
				<strong>{t("legal.advisoryBadge")}</strong> —{" "}
				{t("legal.advisoryDisclaimer")}
			</p>
			<div className="legal-progress-bar" aria-live="polite">
				<span>
					{t("legal.progress", {
						completed: summary.completedCount,
						total: summary.totalCount,
						percent: summary.completionPercent,
					})}
				</span>
				<span
					className="legal-outcome-pill"
					data-outcome={summary.advisoryOutcome}
				>
					{t(outcomeKey)}
				</span>
			</div>

			<ul className="decision-checklist legal-checklist">
				{items.map((item) => {
					const isChecked = checkedIds.includes(item.id);
					const itemTitle = locale === "vi" ? item.title.vi : item.title.en;
					const itemPrompt =
						locale === "vi" ? item.checklistItem.vi : item.checklistItem.en;
					const refTitle =
						locale === "vi" ? item.reference.title.vi : item.reference.title.en;
					const authority =
						locale === "vi"
							? item.reference.issuingAuthority.vi
							: item.reference.issuingAuthority.en;
					const note = item.advisoryNote
						? locale === "vi"
							? item.advisoryNote.vi
							: item.advisoryNote.en
						: null;
					const safeUrl = safeSourceUrl(item.reference.officialUrl);

					return (
						<li key={item.id} className="legal-checklist-item">
							<div className="legal-item-header">
								<span className="legal-item-title">{itemTitle}</span>
								<span
									className="legal-review-badge"
									data-status={item.reviewStatus}
								>
									{reviewStateLabel(item.reviewStatus)}
								</span>
							</div>
							<label className="legal-checkbox-label">
								<input
									type="checkbox"
									checked={isChecked}
									onChange={() => toggleItem(item.id)}
								/>
								<span>{itemPrompt}</span>
							</label>
							{note && <p className="legal-item-note">{note}</p>}
							<div className="legal-item-meta">
								<span>
									{t("legal.documentMeta", {
										code: item.reference.documentCode,
										title: refTitle,
										authority,
									})}
								</span>
								<span>
									{t("legal.effectiveDate", {
										date: item.reference.effectiveFrom,
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

			<div className="legal-counsel-box">
				<label>
					<span>{t("legal.counselLabel")}</span>
					<input
						type="text"
						maxLength={160}
						value={counselReference}
						onChange={(event) => handleCounselRefChange(event.target.value)}
						placeholder={t("legal.counselPlaceholder")}
					/>
				</label>
				<div className="inquiry-report-actions">
					<button type="button" onClick={() => handleExport("json")}>
						{t("legal.exportJson")}
					</button>
					<button
						type="button"
						className="text-button"
						onClick={() => handleExport("csv")}
					>
						{t("legal.exportCsv")}
					</button>
				</div>
				{exportFeedback && (
					<p role="status" className="muted">
						{exportFeedback}
					</p>
				)}
			</div>
		</section>
	);
}
