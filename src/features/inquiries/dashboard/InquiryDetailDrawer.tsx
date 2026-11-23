"use client";

import { useI18n } from "../../../lib/i18n/provider";
import type { InquiryErasureReason } from "../validation";
import { inquiryAgeHours, isInquirySlaOverdue } from "./sla";
import {
	closeReasons,
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
	const { t } = useI18n();
	const overdue = isInquirySlaOverdue({
		status: selected.inquiry.status,
		created_at: selected.inquiry.created_at,
	});
	const ageHours = inquiryAgeHours(selected.inquiry.created_at);

	return (
		<article className="inquiry-detail">
			<h2>
				{selected.inquiry.reference_code}
				{overdue && <span className="sla-badge">{t("admin.slaOverdue")}</span>}
			</h2>
			{overdue && ageHours !== null && (
				<p className="sla-banner" role="alert">
					{t("admin.slaDetailWarning", { hours: Math.floor(ageHours) })}
				</p>
			)}
			{selected.inquiry.anonymized_at ? (
				<p>{t("admin.anonymized")}</p>
			) : (
				<>
					<p>
						<strong>{t("admin.email")}</strong> {selected.inquiry.email}
					</p>
					<p>
						<strong>{t("admin.message")}</strong> {selected.inquiry.message}
					</p>
				</>
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
			<label>
				{t("admin.updateStatus")}
				<select
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
				<label>
					{t("admin.closeReason")}
					<select
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
				<label>
					{t("admin.internalNote")}
					<textarea
						value={note}
						disabled={busy}
						onChange={(event) => onNoteChange(event.target.value)}
						maxLength={5000}
					/>
				</label>
			)}
			<button type="button" disabled={busy || !canSave} onClick={onSave}>
				{t("admin.saveUpdate")}
			</button>
			{!selected.inquiry.anonymized_at && (
				<section
					className="inquiry-erasure"
					aria-label={t("admin.erasureTitle")}
				>
					<h3>{t("admin.erasureTitle")}</h3>
					<label>
						{t("admin.erasureReason")}
						<select
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
					<label>
						{t("admin.erasureTicket")}
						<input
							value={erasureTicket}
							disabled={busy}
							placeholder={t("admin.erasureTicketPlaceholder")}
							maxLength={64}
							onChange={(event) => onErasureTicketChange(event.target.value)}
						/>
					</label>
					<button type="button" disabled={busy || !canErase} onClick={onErase}>
						{t("admin.erasureSubmit")}
					</button>
				</section>
			)}
			<h3>{t("admin.auditHistory")}</h3>
			<ol>
				{selected.audit.map((event, index) => (
					<li key={`${event.happened_at}-${index}`}>
						{event.action} · {event.actor}
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
