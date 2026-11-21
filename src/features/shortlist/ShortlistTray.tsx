"use client";

import { useEffect, useState } from "react";
import type { Geography } from "../geography/types";
import { removeFromShortlist, readShortlist, selectForComparison } from "./store";
import { ComparisonPanel } from "../comparison/ComparisonPanel";
import { InquiryForm } from "../inquiries/InquiryForm";

export function ShortlistTray() {
  const [ids, setIds] = useState<string[]>([]);
  const [places, setPlaces] = useState<Geography[]>([]);
  const [comparisonIds, setComparisonIds] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      try { setIds(readShortlist(localStorage.getItem("investor-shortlist"))); }
      catch { setError("Browser storage is unavailable."); }
    };
    sync();
    const handleChange = () => sync();
    window.addEventListener("investor-shortlist-change", handleChange);
    window.addEventListener("storage", handleChange);
    return () => {
      window.removeEventListener("investor-shortlist-change", handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }, []);

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
      setError(valid.length === ids.length ? null : "Some saved places are no longer available in the public catalog.");
    }).catch(() => { if (active) setError("Saved places could not be loaded."); });
    return () => { active = false; };
  }, [ids]);

  function remove(id: string) {
    try {
      const next = removeFromShortlist(readShortlist(localStorage.getItem("investor-shortlist")), id);
      localStorage.setItem("investor-shortlist", JSON.stringify(next));
      setIds(next);
      window.dispatchEvent(new CustomEvent("investor-shortlist-change", { detail: next }));
    } catch { setError("Browser storage is unavailable."); }
  }

  async function download(format: "json" | "csv") {
    setError(null);
    try {
      const response = await fetch(`/api/geographies/export?ids=${ids.join(",")}&format=${format}`);
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body?.error ?? "Export is unavailable.");
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
      setError(reason instanceof Error ? reason.message : "Export is unavailable.");
    }
  }

  const placesById = new Map(places.map((place) => [place.id, place]));

  if (!ids.length) return null;
  return <>
      <section className="shortlist-tray" aria-label="Saved places">
      <div className="shortlist-heading"><div><span className="map-label">SAVED PLACES</span><strong>{places.length} saved</strong></div><div className="shortlist-actions">{ids.length >= 2 ? <button className="text-button" onClick={() => setComparisonIds(selectForComparison(ids))}>Compare {Math.min(ids.length, 3)}</button> : null}<button className="text-button" onClick={() => download("json")}>Download JSON</button><button className="text-button" onClick={() => download("csv")}>Download CSV</button></div></div>
      {error ? <p className="state-message">{error}</p> : null}
       <ul>{ids.map((id) => { const place = placesById.get(id); return <li key={id}><span>{place?.displayName ?? "Unavailable saved place"}</span><button className="remove-button" onClick={() => remove(id)} aria-label={`Remove ${place?.displayName ?? "unavailable place"}`}>Remove</button></li>; })}</ul>
       <details className="inquiry-entry">
         <summary>Request support for these places</summary>
         <InquiryForm geographyIds={ids} geographyLabels={places.map((place) => place.displayName)} />
       </details>
     </section>
    {comparisonIds ? <ComparisonPanel ids={comparisonIds} onClose={() => setComparisonIds(null)} /> : null}
  </>;
}
