"use client";

import { useEffect, useState } from "react";
import type { Geography } from "../geography/types";
import { removeFromShortlist, readShortlist, selectForComparison } from "./store";
import { ComparisonPanel } from "../comparison/ComparisonPanel";
import { InquiryForm } from "../inquiries/InquiryForm";
import { useI18n } from "../../lib/i18n/provider";

export function ShortlistTray() {
  const { t } = useI18n();
  const [ids, setIds] = useState<string[]>([]);
  const [places, setPlaces] = useState<Geography[]>([]);
  const [comparisonIds, setComparisonIds] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      try { setIds(readShortlist(localStorage.getItem("investor-shortlist"))); }
      catch { setError(t("shortlist.storageError")); }
    };
    sync();
    const handleChange = () => sync();
    window.addEventListener("investor-shortlist-change", handleChange);
    window.addEventListener("storage", handleChange);
    return () => {
      window.removeEventListener("investor-shortlist-change", handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }, [t]);

  useEffect(() => {
    let active = true;
    setPlaces([]);
    setComparisonIds(null);
    setError(null);
    if (!ids.length) return;
    Promise.all(ids.map((id) => fetch(`/api/geographies/${id}`).then(async (response) => {
      if (!response.ok) return null;
      const body = await response.json();
      return body.data as Geography;
    }))).then((next) => {
      if (!active) return;
      const valid = next.filter((place): place is Geography => place !== null);
      setPlaces(valid);
      setError(valid.length === ids.length ? null : t("shortlist.someMissing"));
    }).catch(() => { if (active) setError(t("shortlist.loadFailed")); });
    return () => { active = false; };
  }, [ids, t]);

  function remove(id: string) {
    try {
      const next = removeFromShortlist(readShortlist(localStorage.getItem("investor-shortlist")), id);
      localStorage.setItem("investor-shortlist", JSON.stringify(next));
      setIds(next);
      window.dispatchEvent(new CustomEvent("investor-shortlist-change", { detail: next }));
    } catch { setError(t("shortlist.storageError")); }
  }

  async function download(format: "json" | "csv") {
    setError(null);
    try {
      const response = await fetch(`/api/geographies/export?ids=${ids.join(",")}&format=${format}`);
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body?.error ?? t("shortlist.exportUnavailable"));
      }
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `vietnam-market-context.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : t("shortlist.exportUnavailable"));
    }
  }

  const placesById = new Map(places.map((place) => [place.id, place]));

  if (!ids.length) return null;
  return <>
      <section className="shortlist-tray" aria-label={t("shortlist.savedPlaces")}>
      <div className="shortlist-heading"><div><span className="map-label">{t("shortlist.savedPlaces")}</span><strong>{t("shortlist.savedCount", { count: places.length })}</strong></div><div className="shortlist-actions">{ids.length >= 2 ? <button className="text-button" onClick={() => setComparisonIds(selectForComparison(ids))}>{t("shortlist.compare", { count: Math.min(ids.length, 3) })}</button> : null}<button className="text-button" onClick={() => download("json")}>{t("shortlist.downloadJson")}</button><button className="text-button" onClick={() => download("csv")}>{t("shortlist.downloadCsv")}</button></div></div>
      {error ? <p className="state-message">{error}</p> : null}
       <ul>{ids.map((id) => { const place = placesById.get(id); return <li key={id}><span>{place?.displayName ?? t("shortlist.removedPlace")}</span><button className="remove-button" onClick={() => remove(id)} aria-label={place ? t("shortlist.removeAria", { name: place.displayName }) : t("shortlist.unavailableAria")}>{t("common.remove")}</button></li>; })}</ul>
       <details className="inquiry-entry">
         <summary>{t("shortlist.requestSupport")}</summary>
         <InquiryForm geographyIds={ids} geographyLabels={places.map((place) => place.displayName)} />
       </details>
     </section>
    {comparisonIds ? <ComparisonPanel ids={comparisonIds} onClose={() => setComparisonIds(null)} /> : null}
  </>;
}
