"use client";

import { useEffect, useRef, useState } from "react";
import { InquiryForm } from "./InquiryForm";
import { useI18n } from "../../lib/i18n/provider";

const FOCUSABLE_SELECTOR =
	'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function InquiryDialog({
	geographyIds,
	geographyLabels,
	trigger,
	triggerClassName = "btn btn-cta",
}: {
	geographyIds: string[];
	geographyLabels?: string[];
	trigger?: string;
	triggerClassName?: string;
}) {
	const { t } = useI18n();
	const [open, setOpen] = useState(false);
	const triggerRef = useRef<HTMLButtonElement | null>(null);
	const dialogRef = useRef<HTMLElement | null>(null);

	useEffect(() => {
		if (!open) return;
		const previousFocus =
			(document.activeElement as HTMLElement | null) ?? triggerRef.current;
		const dialog = dialogRef.current;
		const focusable = dialog
			? Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
			: [];
		(focusable[0] ?? dialog)?.focus();

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				event.preventDefault();
				setOpen(false);
				return;
			}
			if (event.key !== "Tab" || !dialog) return;
			const nodes = Array.from(
				dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
			);
			if (nodes.length === 0) return;
			const first = nodes[0];
			const last = nodes[nodes.length - 1];
			if (event.shiftKey && document.activeElement === first) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && document.activeElement === last) {
				event.preventDefault();
				first.focus();
			}
		}

		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			previousFocus?.focus();
		};
	}, [open]);

	return (
		<>
			<button
				ref={triggerRef}
				type="button"
				className={triggerClassName}
				onClick={() => setOpen(true)}
			>
				{trigger ?? t("profile.requestSupport")}
			</button>
			{open && (
				// biome-ignore lint/a11y/noStaticElementInteractions: the backdrop only dismisses the dialog; Escape and the Close button provide keyboard equivalents
				<div
					className="dialog-backdrop"
					role="presentation"
					onClick={(event) => {
						if (event.target === event.currentTarget) setOpen(false);
					}}
				>
					<section
						ref={dialogRef}
						className="dialog-surface"
						role="dialog"
						aria-modal="true"
						aria-labelledby="inquiry-dialog-title"
						tabIndex={-1}
					>
						<div className="dialog-header">
							<h2 id="inquiry-dialog-title">{t("profile.requestSupport")}</h2>
							<button
								type="button"
								className="btn btn-secondary btn-sm"
								onClick={() => setOpen(false)}
								aria-label={t("inquiry.closeDialog")}
							>
								{t("common.close")}
							</button>
						</div>
						<InquiryForm
							geographyIds={geographyIds}
							geographyLabels={geographyLabels}
						/>
					</section>
				</div>
			)}
		</>
	);
}
