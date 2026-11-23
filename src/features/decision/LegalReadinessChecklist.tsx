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

function ReviewStatusIcon({
	status,
}: {
	status: LegalReadinessItem["reviewStatus"];
}) {
	if (status === "verified_by_counsel") {
		return (
			<svg
				width="14"
				height="14"
				viewBox="0 0 16 16"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				aria-hidden="true"
			>
				<path d="M3 8.5L6.5 12L13 4.5" />
			</svg>
		);
	}
	if (status === "needs_specialist_review") {
		return (
			<svg
				width="14"
				height="14"
				viewBox="0 0 16 16"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				aria-hidden="true"
			>
				<path d="M8 2.5L14 13H2L8 2.5Z" />
				<path d="M8 6.5V9.5" />
				<circle cx="8" cy="11.2" r="0.6" fill="currentColor" />
			</svg>
		);
	}
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 16 16"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			aria-hidden="true"
		>
			<circle cx="8" cy="8" r="5.5" />
			<path d="M8 5V8.5L10.5 10" />
		</svg>
	);
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
	const { t, locale, formatDate } = useI18n();
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

	const reviewBadgeVariant = (status: LegalReadinessItem["reviewStatus"]) => {
		if (status === "verified_by_counsel") return "status-badge--success";
		if (status === "needs_specialist_review") return "status-badge--warning";
		return "status-badge--info";
	};

	return (
		<section aria-labelledby="checklist-title" className="legal-readiness">
			<h2 id="checklist-title">{t("retail.checklistTitle")}</h2>
			<p className="banner banner--warning" role="note">
				<span>
					<strong>{t("legal.advisoryBadge")}</strong> —{" "}
					{t("legal.advisoryDisclaimer")}
				</span>
			</p>
			<div className="legal-progress-bar" aria-live="polite">
				<span className="tabular-nums">
					{t("legal.progress", {
						completed: summary.completedCount,
						total: summary.totalCount,
						percent: summary.completionPercent,
					})}
				</span>
				<span
					className="status-badge status-badge--info"
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
									className={`status-badge ${reviewBadgeVariant(item.reviewStatus)}`}
									data-status={item.reviewStatus}
								>
									<ReviewStatusIcon status={item.reviewStatus} />
									<span>{reviewStateLabel(item.reviewStatus)}</span>
								</span>
							</div>
							<label className="checkbox-field">
								<input
									type="checkbox"
									checked={isChecked}
									onChange={() => toggleItem(item.id)}
								/>
								<span>{itemPrompt}</span>
							</label>
							{note && <p className="legal-item-note">{note}</p>}
							<div className="legal-item-meta">
								<span className="legal-doc-badge">
									{item.reference.documentCode}
								</span>
								<span className="legal-authority-badge">{authority}</span>
								<span>{refTitle}</span>
								<span>
									{t("legal.effectiveDate", {
										date: formatDate(item.reference.effectiveFrom),
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
				<label className="form-field">
					<span>{t("legal.counselLabel")}</span>
					<input
						className="control-input"
						type="text"
						maxLength={160}
						value={counselReference}
						onChange={(event) => handleCounselRefChange(event.target.value)}
						placeholder={t("legal.counselPlaceholder")}
					/>
				</label>
				<div className="action-row">
					<button
						type="button"
						className="btn btn-primary btn-sm"
						onClick={() => handleExport("json")}
					>
						{t("legal.exportJson")}
					</button>
					<button
						type="button"
						className="btn btn-secondary btn-sm"
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
