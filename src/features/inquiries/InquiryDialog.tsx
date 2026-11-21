"use client";

import { useState } from "react";
import { InquiryForm } from "./InquiryForm";

export function InquiryDialog({ geographyIds, geographyLabels, trigger = "Request investment support" }: {
  geographyIds: string[];
  geographyLabels?: string[];
  trigger?: string;
}) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" onClick={() => setOpen(true)}>{trigger}</button>
    {open && <div className="inquiry-dialog-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section className="inquiry-dialog" role="dialog" aria-modal="true" aria-labelledby="inquiry-dialog-title">
        <div className="inquiry-dialog-heading"><h2 id="inquiry-dialog-title">Request investment support</h2><button type="button" onClick={() => setOpen(false)} aria-label="Close inquiry form">Close</button></div>
        <InquiryForm geographyIds={geographyIds} geographyLabels={geographyLabels} />
      </section>
    </div>}
  </>;
}
