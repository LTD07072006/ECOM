"use client";

import { useState } from "react";
import { InquiryForm } from "./InquiryForm";
import { useI18n } from "../../lib/i18n/provider";

export function InquiryDialog({ geographyIds, geographyLabels, trigger }: {
  geographyIds: string[];
  geographyLabels?: string[];
  trigger?: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" onClick={() => setOpen(true)}>{trigger ?? t("profile.requestSupport")}</button>
    {open && <div className="inquiry-dialog-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="inquiry-dialog" role="dialog" aria-modal="true" aria-labelledby="inquiry-dialog-title">
        <div className="inquiry-dialog-heading"><h2 id="inquiry-dialog-title">{t("profile.requestSupport")}</h2><button type="button" onClick={() => setOpen(false)} aria-label={t("inquiry.closeDialog")}>{t("common.close")}</button></div>
        <InquiryForm geographyIds={geographyIds} geographyLabels={geographyLabels} />
      </section>
    </div>}
  </>;
}
