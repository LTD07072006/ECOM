"use client";

import { useState } from "react";
import type { Profile } from "../geography/types";
import { compareProfiles } from "../geography/domain";
import { InquiryForm } from "../inquiries/InquiryForm";
import { calculateRetailScore, criteria, type Evidence } from "./model";
import { useI18n } from "../../lib/i18n/provider";
import { qualityLabel, unitLabel } from "../../lib/i18n/data-labels";

const noEvidence: Evidence = { status: "unavailable" };

export function RetailScenario({ provinces }: { provinces: Profile[] }) {
  const { t, tc, locale, formatNumber } = useI18n();
  const [sector, setSector] = useState("");
  const [retailMinimum, setRetailMinimum] = useState("");
  const [labourMinimum, setLabourMinimum] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [weights, setWeights] = useState(["60", "40"]);
  const [showResult, setShowResult] = useState(false);
  const [benchmarkId, setBenchmarkId] = useState("");

  const thresholds = [retailMinimum, labourMinimum].map((value) => value.trim() === "" ? null : Number(value));
  const invalid = thresholds.some((value) => value !== null && (!Number.isFinite(value) || value < 0));
  const candidates = provinces.filter((profile) => criteria.every((criterion, index) => {
    if (thresholds[index] === null) return true;
    const item = profile.observations.find((row) => row.indicator === criterion.code);
    return item && item.quality !== "unavailable" && item.value !== null && item.value >= thresholds[index]!;
  }));
  const chosen = candidates.filter((profile) => selected.includes(profile.id));
  const comparison = chosen.length >= 2 ? compareProfiles(chosen) : null;
  const benchmarkIndex = chosen.findIndex((profile) => profile.id === benchmarkId);
  const excluded = provinces.filter((profile) => !candidates.includes(profile));
  const result = calculateRetailScore(chosen, weights.map((weight) => weight.trim() === "" ? NaN : Number(weight)), noEvidence);

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((value) => value !== id)
      : current.length < 3 ? [...current, id] : current);
    setShowResult(false);
  }

  return <div className="decision-flow">
    {sector === "retail" && <nav aria-label={t("retail.stepsAria")} className="decision-steps"><a href="#sector-title">{t("retail.sector")}</a><a href="#filters-title">{t("retail.stepFilter")}</a>{chosen.length > 0 && <a href="#compare-title">{t("retail.stepCompare")}</a>}<a href="#evidence-title">{t("retail.stepEvidence")}</a>{chosen.length > 0 && <a href="#contact-title">{t("retail.stepContact")}</a>}</nav>}
    <section aria-labelledby="sector-title">
      <h2 id="sector-title">{t("retail.sectorTitle")}</h2>
      <label>{t("retail.sector")}
        <select value={sector} onChange={(event) => { setSector(event.target.value); setSelected([]); setShowResult(false); }}>
          <option value="">{t("retail.selectSector")}</option>
          <option value="retail">{t("retail.retail")}</option>
        </select>
      </label>
    </section>
    {sector === "retail" && <>
      <section aria-labelledby="filters-title">
        <h2 id="filters-title">{t("retail.filterTitle")}</h2>
        <p>{t("retail.filterNote")}</p>
        <div className="decision-filters">
          <label>{t("retail.retailMinimum")}
            <input type="number" min="0" value={retailMinimum} onChange={(event) => { setRetailMinimum(event.target.value); setSelected([]); setShowResult(false); }} />
          </label>
          <label>{t("retail.labourMinimum")}
            <input type="number" min="0" value={labourMinimum} onChange={(event) => { setLabourMinimum(event.target.value); setSelected([]); setShowResult(false); }} />
          </label>
        </div>
        <p>{t("retail.missingExcluded")}</p>
        {invalid ? <p role="alert">{t("retail.invalid")}</p> : <p role="status">{t("retail.matchCount", { count: candidates.length })}</p>}
        {!invalid && excluded.length > 0 && <details><summary>{t("retail.excludedTitle", { count: excluded.length })}</summary><ul>{excluded.map((profile) => <li key={profile.id}><strong>{profile.displayName}:</strong> {criteria.flatMap((criterion, index) => {
          const minimum = thresholds[index];
          if (minimum === null) return [];
          const item = profile.observations.find((row) => row.indicator === criterion.code);
          const label = t(criterion.labelKey);
          return !item || item.value === null || item.quality === "unavailable"
            ? [t("retail.excludedMissing", { label })]
            : item.value < minimum
              ? [t("retail.excludedBelow", { label, value: formatNumber(item.value), unit: unitLabel(locale, item.unit), minimum: formatNumber(minimum) })]
              : [];
        }).join("; ")}</li>)}</ul></details>}
        {!invalid && <fieldset className="decision-places">
          <legend>{t("retail.provinces")}</legend>
          {candidates.map((profile) => <label key={profile.id}>
            <input type="checkbox" checked={selected.includes(profile.id)}
              disabled={selected.length >= 3 && !selected.includes(profile.id)} onChange={() => toggle(profile.id)} />
            {profile.displayName}
          </label>)}
        </fieldset>}
      </section>
      {chosen.length > 0 && <section aria-labelledby="compare-title">
        <h2 id="compare-title">{t("retail.compareTitle")}</h2>
        {chosen.length >= 2 && <label>{t("retail.baseline")}
          <select value={benchmarkIndex >= 0 ? benchmarkId : ""} onChange={(event) => setBenchmarkId(event.target.value)}><option value="">{t("retail.baselinePlaceholder")}</option>{chosen.map((profile) => <option key={profile.id} value={profile.id}>{profile.displayName}</option>)}</select>
        </label>}
        <p>{t("retail.differencesNote")}</p>
        <div className="decision-table-wrap"><table>
          <thead><tr><th scope="col">{t("retail.indicatorCol")}</th>{chosen.map((profile) => <th scope="col" key={profile.id}>{profile.displayName}</th>)}</tr></thead>
          <tbody>{criteria.map((criterion) => <tr key={criterion.code}><th scope="row">{t(criterion.labelKey)}
            {comparison?.rows.find((row) => row.indicator === criterion.code)?.reason && <small className="decision-mismatch">{tc(comparison.rows.find((row) => row.indicator === criterion.code)?.reasonCode, comparison.rows.find((row) => row.indicator === criterion.code)?.reason)}</small>}</th>
            {chosen.map((profile, profileIndex) => {
              const item = profile.observations.find((observation) => observation.indicator === criterion.code);
              const matches = comparison?.rows.find((row) => row.indicator === criterion.code)?.metadataMatches ?? true;
              const baseline = benchmarkIndex >= 0 ? comparison?.rows.find((row) => row.indicator === criterion.code)?.values[benchmarkIndex] : null;
              const value = comparison?.rows.find((row) => row.indicator === criterion.code)?.values[profileIndex];
              return <td key={profile.id}>{!matches ? <span>{t("retail.notComparable")}</span> : !item || item.value === null || item.quality === "unavailable"
                ? <span>{t("common.unavailable")}{item?.missingReason ? ` · ${item.missingReason}` : ""}</span>
                : <><strong>{formatNumber(item.value)} {unitLabel(locale, item.unit)}</strong><br />{item.period} · {qualityLabel(locale, item.quality)}<br />
                  {item.source.url ? <a href={item.source.url}>{item.source.publisher}</a> : item.source.publisher}
                  <br />{item.datasetVersion} · {item.source.license}
                  {benchmarkIndex >= 0 && profileIndex !== benchmarkIndex && baseline != null && value != null && <><br /><small>{t("retail.difference", { name: chosen[benchmarkIndex].displayName, delta: formatNumber(value - baseline), unit: unitLabel(locale, item.unit) })}{baseline !== 0 ? t("retail.percentage", { percent: formatNumber((value - baseline) / baseline * 100) }) : t("retail.percentageUnavailable")}</small></>}</>}</td>;
            })}
          </tr>)}</tbody>
        </table></div>
      </section>}
      <section aria-labelledby="evidence-title">
        <h2 id="evidence-title">{t("retail.evidenceTitle")}</h2>
        <p>{t("retail.evidenceContext")} <a href="https://www.nso.gov.vn/tin-tuc-thong-ke/2026/07/thong-cao-bao-chi-ket-qua-khao-sat-muc-song-dan-cu-2025/">{t("retail.evidenceSource")}</a></p>
        <p role="status">{t("retail.evidenceNone")}</p>
        <p>{t("retail.evidenceRequirement")}</p>
      </section>
      <section aria-labelledby="score-title">
        <h2 id="score-title">{t("retail.scoreTitle")}</h2>
        <p>{t("retail.scoreNote")}</p>
        <div className="decision-filters">{criteria.map((criterion, index) => <label key={criterion.code}>
          {t("retail.weight", { label: t(criterion.labelKey) })}
          <input type="number" min="0" max="100" value={weights[index]} onChange={(event) => {
            setWeights((current) => current.map((value, i) => i === index ? event.target.value : value));
            setShowResult(false);
          }} />
        </label>)}</div>
        <button type="button" onClick={() => setShowResult(true)}>{t("retail.assess")}</button>
        {showResult && <div role="status" className="decision-result">
          {!result.ok ? <><strong>{t("retail.assessUnavailable")}</strong><ul>{result.reasons.map((reason, index) => <li key={`${reason.code}-${index}`}>{t(reason.code, "criterion" in reason ? { label: t(reason.criterion) } : undefined)}</li>)}</ul></>
            : <><p>{t("retail.scoreRelative")}</p>
              {result.results.map((item) => <article key={item.id}><h3>{t("retail.scoreHeading", { name: item.name, score: formatNumber(item.score) })}</h3>
                <ul>{item.parts.map((part) => <li key={part.label}>{t("retail.partLine", {
                  label: t(part.labelKey), value: formatNumber(part.value), normalized: formatNumber(part.normalized),
                  weight: formatNumber(part.weight), contribution: formatNumber(part.contribution),
                })}</li>)}</ul>
              </article>)}</>}
        </div>}
      </section>
      {chosen.length > 0 && <section aria-labelledby="contact-title"><h2 id="contact-title">{t("retail.contactTitle")}</h2><p>{t("retail.contactBody")}</p><InquiryForm key={chosen.map((profile) => profile.id).join(",")} geographyIds={chosen.map((profile) => profile.id)} geographyLabels={chosen.map((profile) => profile.displayName)} defaultSector={t("retail.retail")} /></section>}
      <section aria-labelledby="checklist-title">
        <h2 id="checklist-title">{t("retail.checklistTitle")}</h2>
        <p>{t("retail.checklistNote")}</p>
        <ul className="decision-checklist">
          <li><label><input type="checkbox" /> {t("retail.checklist1")}</label></li>
          <li><label><input type="checkbox" /> {t("retail.checklist2")}</label></li>
          <li><label><input type="checkbox" /> {t("retail.checklist3")}</label></li>
          <li><label><input type="checkbox" /> {t("retail.checklist4")}</label></li>
        </ul>
      </section>
    </>}
  </div>;
}
