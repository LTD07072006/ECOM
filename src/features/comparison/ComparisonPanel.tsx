"use client";

import { useEffect, useState } from "react";
import type { Profile } from "../geography/types";

type Comparison = {
  compatible: boolean;
  reason: string | null;
  rows: Array<{ indicator: string; label: string; unit: string; reason?: string | null; values: Array<number | null> }>;
};

export function ComparisonPanel({ ids, onClose }: { ids: string[]; onClose: () => void }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/geographies/compare?ids=${ids.join(",")}`)
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? "Comparison is unavailable.");
        return body.data;
      })
      .then((data) => { if (active) { setProfiles(data.profiles); setComparison(data.comparison); } })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Comparison is unavailable."); });
    return () => { active = false; };
  }, [ids]);

  return <section className="comparison-panel" aria-label="Place comparison">
    <div className="comparison-heading"><div><span className="map-label">SIDE BY SIDE</span><h2>Compare context</h2></div><button className="text-button" onClick={onClose}>Close</button></div>
    {error ? <p className="state-message">{error}</p> : !comparison ? <p className="state-message">Loading comparison…</p> : <>
      {!comparison.compatible ? <p className="state-message">{comparison.reason}</p> : <p className="comparison-note">Context only. Values are shown as published; no ranking or recommendation is calculated.</p>}
      <div className="comparison-table-wrap"><table className="comparison-table"><thead><tr><th scope="col">Indicator</th>{profiles.map((profile) => <th scope="col" key={profile.id}>{profile.displayName}</th>)}</tr></thead><tbody>{comparison.rows.map((row) => <tr key={row.indicator}><th scope="row">{row.label}<small>{row.unit}</small>{row.reason && <small>{row.reason}</small>}</th>{row.values.map((value, index) => <td key={`${row.indicator}-${profiles[index]?.id ?? index}`}>{value === null ? <span className="unavailable">Unavailable</span> : value.toLocaleString()}</td>)}</tr>)}</tbody></table></div>
    </>}
  </section>;
}
