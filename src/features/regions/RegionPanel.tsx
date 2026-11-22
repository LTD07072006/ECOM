"use client";

import { useEffect, useState } from "react";
import type { Profile } from "../geography/types";
import { indicatorLabel, unitLabel } from "../../lib/i18n/data-labels";
import { useI18n } from "../../lib/i18n/provider";
import { compatibleRegionMetrics, regionIndicators, regionMetric } from "./model";

export type RegionIds = [string[], string[]];

export function RegionPanel({ regions, active, setActive, remove, clear, addCurrent, canAddCurrent }: {
  regions: RegionIds; active: number; setActive: (index: number) => void;
  remove: (index: number, id: string) => void; clear: () => void; addCurrent: () => void; canAddCurrent: boolean;
}) {
  const { t, locale, formatNumber } = useI18n();
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const key = regions.flat().join(",");
  useEffect(() => {
    const controller = new AbortController();
    const ids = key ? key.split(",") : [];
    if (!ids.length) { setProfiles({}); setFailed(false); setLoading(false); return () => controller.abort(); }
    setLoading(true); setFailed(false);
    Promise.all(ids.map(async (id) => {
      const response = await fetch(`/api/geographies/${encodeURIComponent(id)}`, { signal: controller.signal });
      if (!response.ok) throw new Error("Profile unavailable");
      const body: { data: Profile } = await response.json();
      return body.data;
    })).then((data) => { if (!controller.signal.aborted) { setProfiles(Object.fromEntries(data.map((profile) => [profile.id, profile]))); setLoading(false); } })
      .catch(() => { if (!controller.signal.aborted) { setProfiles({}); setFailed(true); setLoading(false); } });
    return () => controller.abort();
  }, [key]);
  const names = [t("region.a"), t("region.b")];
  return <section className="region-panel" aria-labelledby="region-title">
    <h2 id="region-title">{t("region.title")}</h2>
    <p>{t("region.instructions")}</p><p className="muted">{t("region.scope")}</p>
    <fieldset><legend>{t("region.mode")}</legend>{names.map((name, index) => <label key={name} className="region-radio"><input type="radio" name="region-active" checked={active === index} onChange={() => setActive(index)} /> {name}</label>)}</fieldset>
    <p role="status">{t("region.active", { region: names[active] })}</p>
    <button type="button" onClick={addCurrent} disabled={!canAddCurrent}>{t("region.add")}</button>
    <p className="muted">{t("region.limit")}</p>
    {regions.map((ids, index) => <div key={index}><h3>{names[index]}</h3>{ids.length === 0 ? <p>{t("region.empty")}</p> : <ul>{ids.map((id) => <li key={id}>{profiles[id]?.displayName ?? id} <button type="button" onClick={() => remove(index, id)} aria-label={t("region.remove", { name: profiles[id]?.displayName ?? id })}>×</button></li>)}</ul>}</div>)}
    <button type="button" onClick={clear}>{t("region.clear")}</button>
    <h3>{t("region.summary")}</h3><p className="muted">{t("region.method")}</p>
    {loading ? <p role="status">{t("region.loading")}</p> : failed ? <p role="alert">{t("region.loadError")}</p> : regionIndicators.map((indicator) => {
      const groups = regions.map((ids) => ids.map((id) => profiles[id]).filter((item): item is Profile => !!item));
      const metrics = groups.map((group) => regionMetric(group, indicator));
      const sample = metrics.find((metric) => metric.value !== null);
      return <div className="region-metric" key={indicator}><h4>{indicatorLabel(locale, indicator, sample?.value !== null && sample ? sample.observation.label : indicator)}</h4>
        {metrics.map((metric, index) => <div key={index}><strong>{names[index]}: </strong>{metric.value === null ? (metric.reason === "empty" ? t("region.empty") : t(metric.reason === "missing" ? "region.missing" : "region.incompatible")) : <>{formatNumber(metric.value)} {unitLabel(locale, metric.observation.unit)}<br /><small>{t("region.source")}: {metric.observation.source.url ? <a href={metric.observation.source.url}>{metric.observation.source.publisher}</a> : metric.observation.source.publisher} · {metric.observation.period} · {metric.observation.datasetVersion} · {regions[index].length} {t("common.places")}</small></>}</div>)}
        <p>{compatibleRegionMetrics(metrics[0], metrics[1]) && metrics[0].value !== null && metrics[1].value !== null ? `${t("region.difference")}: ${formatNumber(metrics[1].value - metrics[0].value)} ${unitLabel(locale, metrics[0].observation.unit)}` : t("region.noCompare")}</p>
      </div>;
    })}
  </section>;
}
