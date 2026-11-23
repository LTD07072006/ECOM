"use client";

import { useI18n } from "../../../lib/i18n/provider";
import type { InquiryErasureReason } from "../validation";
import { inquiryAgeHours, isInquirySlaOverdue } from "./sla";
import {
	closeReasons,
	formatAuditAction,
	formatStatusLabel,
	type InquiryDetail,
	statusOptions,
} from "./types";

type Props = {
	selected: InquiryDetail;
	busy: boolean;
	nextStatus: string;
	closeReason: string;
	note: string;
	erasureReason: InquiryErasureReason;
	erasureTicket: string;
	needsCloseReason: boolean;
	canSave: boolean;
	canErase: boolean;
	onNextStatusChange: (value: string) => void;
	onCloseReasonChange: (value: string) => void;
	onNoteChange: (value: string) => void;
	onErasureReasonChange: (value: InquiryErasureReason) => void;
	onErasureTicketChange: (value: string) => void;
	onSave: () => void;
	onErase: () => void;
};

export function InquiryDetailDrawer({
	selected,
	busy,
	nextStatus,
	closeReason,
	note,
	erasureReason,
	erasureTicket,
	needsCloseReason,
	canSave,
	canErase,
	onNextStatusChange,
	onCloseReasonChange,
	onNoteChange,
	onErasureReasonChange,
	onErasureTicketChange,
	onSave,
	onErase,
}: Props) {
	const { t, formatDate } = useI18n();
	const overdue = isInquirySlaOverdue({
		status: selected.inquiry.status,
		created_at: selected.inquiry.created_at,
	});
	const ageHours = inquiryAgeHours(selected.inquiry.created_at);

	return (
		<article className="inquiry-detail">
			<div className="inquiry-detail-header">
				<h2 className="tabular-nums">{selected.inquiry.reference_code}</h2>
				{overdue && (
					<span className="status-badge status-badge--error">
						{t("admin.slaOverdue")}
					</span>
				)}
			</div>
			{overdue && ageHours !== null && (
				<p className="banner banner--error" role="alert">
					<span>
						{t("admin.slaDetailWarning", { hours: Math.floor(ageHours) })}
					</span>
				</p>
			)}
			{selected.inquiry.anonymized_at ? (
				<p className="banner banner--info">{t("admin.anonymized")}</p>
			) : (
				<div className="form-stack">
					<p>
						<strong>{t("admin.email")}</strong> {selected.inquiry.email}
					</p>
					<p>
						<strong>{t("admin.message")}</strong> {selected.inquiry.message}
					</p>
				</div>
			)}
			<p>
				<strong>{t("admin.geographyVersion")}</strong>{" "}
				{selected.inquiry.provenance.geographyVersionCode ??
					t("common.unavailable")}
			</p>
			<p>
				<strong>{t("admin.statusLabel")}</strong>{" "}
				{formatStatusLabel(selected.inquiry.status, t)}
			</p>
			<div className="form-stack">
				<label className="form-field">
					{t("admin.updateStatus")}
					<select
						className="control-select"
						value={nextStatus}
						disabled={busy}
						onChange={(event) => onNextStatusChange(event.target.value)}
					>
						{statusOptions.map((option) => (
							<option key={option.value} value={option.value}>
								{t(option.key)}
							</option>
						))}
					</select>
				</label>
				{needsCloseReason && (
					<label className="form-field">
						{t("admin.closeReason")}
						<select
							className="control-select"
							value={closeReason}
							disabled={busy}
							onChange={(event) => onCloseReasonChange(event.target.value)}
						>
							<option value="">{t("admin.chooseReason")}</option>
							{closeReasons.map((option) => (
								<option key={option.value} value={option.value}>
									{t(option.key)}
								</option>
							))}
						</select>
					</label>
				)}
				{!selected.inquiry.anonymized_at && (
					<label className="form-field">
						{t("admin.internalNote")}
						<textarea
							className="control-textarea"
							value={note}
							disabled={busy}
							onChange={(event) => onNoteChange(event.target.value)}
							maxLength={5000}
						/>
					</label>
				)}
				<div>
					<button
						type="button"
						className="btn btn-primary"
						disabled={busy || !canSave}
						onClick={onSave}
					>
						{t("admin.saveUpdate")}
					</button>
				</div>
			</div>
			{!selected.inquiry.anonymized_at && (
				<section
					className="destructive-zone"
					aria-label={t("admin.erasureTitle")}
				>
					<h3>{t("admin.erasureTitle")}</h3>
					<label className="form-field">
						{t("admin.erasureReason")}
						<select
							className="control-select"
							value={erasureReason}
							disabled={busy}
							onChange={(event) =>
								onErasureReasonChange(
									event.target.value as InquiryErasureReason,
								)
							}
						>
							<option value="erasure_request">
								{t("admin.erasureReasonRequest")}
							</option>
							<option value="consent_withdrawn">
								{t("admin.erasureReasonConsent")}
							</option>
						</select>
					</label>
					<label className="form-field">
						{t("admin.erasureTicket")}
						<input
							className="control-input"
							value={erasureTicket}
							disabled={busy}
							placeholder={t("admin.erasureTicketPlaceholder")}
							maxLength={64}
							onChange={(event) => onErasureTicketChange(event.target.value)}
						/>
					</label>
					<div>
						<button
							type="button"
							className="btn btn-destructive"
							disabled={busy || !canErase}
							onClick={onErase}
						>
							{t("admin.erasureSubmit")}
						</button>
					</div>
				</section>
			)}
			<h3>{t("admin.auditHistory")}</h3>
			<ol className="inquiry-audit-list">
				{selected.audit.map((event, index) => (
					<li key={`${event.happened_at}-${index}`}>
						<span className="status-badge">
							{formatAuditAction(event.action, t)}
						</span>{" "}
						· {event.actor} ·{" "}
						{formatDate(event.happened_at, { includeTime: true })}
						{event.from_status
							? `: ${formatStatusLabel(event.from_status, t)} → ${formatStatusLabel(event.to_status ?? "", t)}`
							: ""}
						{event.note ? ` — ${event.note}` : ""}
					</li>
				))}
			</ol>
		</article>
	);
}
