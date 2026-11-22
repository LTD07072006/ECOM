"use client";

import { useEffect, useState } from "react";
import type { Profile } from "../geography/types";
import { useI18n } from "../../lib/i18n/provider";
import { indicatorLabel, unitLabel } from "../../lib/i18n/data-labels";

type Comparison = {
  compatible: boolean;
  reason: string | null;
  reasonCode?: string | null;
  rows: Array<{ indicator: string; label: string; unit: string; reason?: string | null; reasonCode?: string | null; values: Array<number | null> }>;
};

export function ComparisonPanel({ ids, onClose }: { ids: string[]; onClose: () => void }) {
  const { t, tc, locale, formatNumber } = useI18n();
  const key = ids.join(",");
  const [result, setResult] = useState<{ key: string; data: { profiles: Profile[]; comparison: Comparison } } | { key: string; error: string }>();

  useEffect(() => {
    const controller = new AbortController();
    const key = ids.join(",");
    setResult(undefined);
    fetch(`/api/geographies/compare?ids=${encodeURIComponent(key)}`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error ?? t("comparison.unavailable"));
        return body.data;
      })
      .then((data) => { if (!controller.signal.aborted) setResult({ key, data }); })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setResult({ key, error: reason instanceof Error ? reason.message : t("comparison.unavailable") });
      });
    return () => controller.abort();
  }, [ids, t]);

  const current = result?.key === key ? result : undefined;
  const error = current && "error" in current ? current.error : null;
  const { profiles, comparison } = current && "data" in current ? current.data : { profiles: [], comparison: null };

  return <section className="comparison-panel" aria-label={t("comparison.aria")}>
    <div className="comparison-heading"><div><span className="map-label">{t("comparison.eyebrow")}</span><h2>{t("comparison.title")}</h2></div><button type="button" className="text-button" onClick={onClose}>{t("common.close")}</button></div>
    {error ? <p className="state-message">{error}</p> : !comparison ? <p className="state-message">{t("comparison.loading")}</p> : <>
      {!comparison.compatible ? <p className="state-message">{tc(comparison.reasonCode, comparison.reason)}</p> : <p className="comparison-note">{t("comparison.note")}</p>}
      <div className="comparison-table-wrap"><table className="comparison-table"><thead><tr><th scope="col">{t("comparison.indicator")}</th>{profiles.map((profile) => <th scope="col" key={profile.id}>{profile.displayName}</th>)}</tr></thead><tbody>{comparison.rows.map((row) => <tr key={row.indicator}><th scope="row">{indicatorLabel(locale, row.indicator, row.label)}<small>{unitLabel(locale, row.unit)}</small>{row.reason && <small>{tc(row.reasonCode, row.reason)}</small>}</th>{row.values.map((value, index) => <td key={`${row.indicator}-${profiles[index]?.id ?? index}`}>{value === null ? <span className="unavailable">{t("common.unavailable")}</span> : formatNumber(value)}</td>)}</tr>)}</tbody></table></div>
    </>}
  </section>;
}
