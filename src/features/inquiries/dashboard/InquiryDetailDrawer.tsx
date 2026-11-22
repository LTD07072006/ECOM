"use client";

import { useI18n } from "../../../lib/i18n/provider";
import { inquiryAgeHours, isInquirySlaOverdue } from "./sla";
import {
	closeReasons,
	formatStatusLabel,
	statusOptions,
	type InquiryDetail,
} from "./types";

type Props = {
	selected: InquiryDetail;
	busy: boolean;
	nextStatus: string;
	closeReason: string;
	note: string;
	needsCloseReason: boolean;
	canSave: boolean;
	onNextStatusChange: (value: string) => void;
	onCloseReasonChange: (value: string) => void;
	onNoteChange: (value: string) => void;
	onSave: () => void;
};

export function InquiryDetailDrawer({
	selected,
	busy,
	nextStatus,
	closeReason,
	note,
	needsCloseReason,
	canSave,
	onNextStatusChange,
	onCloseReasonChange,
	onNoteChange,
	onSave,
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
			<h3>{t("admin.auditHistory")}</h3>
			<ol>
				{selected.audit.map((event, index) => (
					<li key={`${event.happened_at}-${index}`}>
						{event.action}
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
