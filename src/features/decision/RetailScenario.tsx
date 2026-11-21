"use client";

import { useState } from "react";
import type { Profile } from "../geography/types";
import { compareProfiles } from "../geography/domain";
import { calculateRetailScore, criteria, type Evidence } from "./model";

const noEvidence: Evidence = { status: "unavailable" };
const format = new Intl.NumberFormat("en", { maximumFractionDigits: 2 });

export function RetailScenario({ provinces }: { provinces: Profile[] }) {
  const [sector, setSector] = useState("");
  const [retailMinimum, setRetailMinimum] = useState("");
  const [labourMinimum, setLabourMinimum] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [weights, setWeights] = useState(["60", "40"]);
  const [showResult, setShowResult] = useState(false);

  const thresholds = [retailMinimum, labourMinimum].map((value) => value.trim() === "" ? null : Number(value));
  const invalid = thresholds.some((value) => value !== null && (!Number.isFinite(value) || value < 0));
  const candidates = provinces.filter((profile) => criteria.every((criterion, index) => {
    if (thresholds[index] === null) return true;
    const item = profile.observations.find((row) => row.indicator === criterion.code);
    return item && item.quality !== "unavailable" && item.value !== null && item.value >= thresholds[index]!;
  }));
  const chosen = candidates.filter((profile) => selected.includes(profile.id));
  const comparison = chosen.length >= 2 ? compareProfiles(chosen) : null;
  const result = calculateRetailScore(chosen, weights.map((weight) => weight.trim() === "" ? NaN : Number(weight)), noEvidence);

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((value) => value !== id)
      : current.length < 3 ? [...current, id] : current);
    setShowResult(false);
  }

  return <div className="decision-flow">
    <section aria-labelledby="sector-title">
      <h2 id="sector-title">Choose a sector</h2>
      <label>Sector
        <select value={sector} onChange={(event) => { setSector(event.target.value); setSelected([]); setShowResult(false); }}>
          <option value="">Select a sector</option>
          <option value="retail">Retail</option>
        </select>
      </label>
    </section>
    {sector === "retail" && <>
      <section aria-labelledby="filters-title">
        <h2 id="filters-title">Filter provinces</h2>
        <p>These figures provide market context for the published period.</p>
        <div className="decision-filters">
          <label>Minimum retail sales and consumer services (billion VND)
            <input type="number" min="0" value={retailMinimum} onChange={(event) => { setRetailMinimum(event.target.value); setSelected([]); setShowResult(false); }} />
          </label>
          <label>Minimum labour force (thousand people)
            <input type="number" min="0" value={labourMinimum} onChange={(event) => { setLabourMinimum(event.target.value); setSelected([]); setShowResult(false); }} />
          </label>
        </div>
        <p>When a minimum is set, provinces with no value for that indicator are excluded.</p>
        {invalid ? <p role="alert">Enter non-negative numbers for the minimums.</p> : <p role="status">{candidates.length} provinces match. Select two or three to compare.</p>}
        {!invalid && <fieldset className="decision-places">
          <legend>Provinces</legend>
          {candidates.map((profile) => <label key={profile.id}>
            <input type="checkbox" checked={selected.includes(profile.id)}
              disabled={selected.length >= 3 && !selected.includes(profile.id)} onChange={() => toggle(profile.id)} />
            {profile.displayName}
          </label>)}
        </fieldset>}
      </section>
      {chosen.length > 0 && <section aria-labelledby="compare-title">
        <h2 id="compare-title">Compare published context</h2>
        <div className="decision-table-wrap"><table>
          <thead><tr><th scope="col">Indicator</th>{chosen.map((profile) => <th scope="col" key={profile.id}>{profile.displayName}</th>)}</tr></thead>
          <tbody>{criteria.map((criterion) => <tr key={criterion.code}><th scope="row">{criterion.label}
            {comparison?.rows.find((row) => row.indicator === criterion.code)?.reason && <small className="decision-mismatch">{comparison.rows.find((row) => row.indicator === criterion.code)?.reason}</small>}</th>
            {chosen.map((profile) => {
              const item = profile.observations.find((observation) => observation.indicator === criterion.code);
              const matches = comparison?.rows.find((row) => row.indicator === criterion.code)?.metadataMatches ?? true;
              return <td key={profile.id}>{!matches ? <span>Not comparable</span> : !item || item.value === null || item.quality === "unavailable"
                ? <span>Unavailable{item?.missingReason ? ` · ${item.missingReason}` : ""}</span>
                : <><strong>{format.format(item.value)} {item.unit}</strong><br />{item.period} · {item.quality}<br />
                  {item.source.url ? <a href={item.source.url}>{item.source.publisher}</a> : item.source.publisher}
                  <br />{item.datasetVersion} · {item.source.license}</>}</td>;
            })}
          </tr>)}</tbody>
        </table></div>
      </section>}
      <section aria-labelledby="evidence-title">
        <h2 id="evidence-title">Customer needs evidence</h2>
        <p role="status">No customer needs study is available for the retail segment and selected provinces.</p>
        <p>A study needs a defined segment, covered locations, sample size, method, period and source before it can support an assessment.</p>
      </section>
      <section aria-labelledby="score-title">
        <h2 id="score-title">Weighted assessment</h2>
        <p>Weights must total 100%. The calculation compares the selected provinces within this scenario.</p>
        <div className="decision-filters">{criteria.map((criterion, index) => <label key={criterion.code}>
          {criterion.label} weight (%)
          <input type="number" min="0" max="100" value={weights[index]} onChange={(event) => {
            setWeights((current) => current.map((value, i) => i === index ? event.target.value : value));
            setShowResult(false);
          }} />
        </label>)}</div>
        <button type="button" onClick={() => setShowResult(true)}>Assess evidence and calculate</button>
        {showResult && <div role="status" className="decision-result">
          {!result.ok ? <><strong>Assessment unavailable</strong><ul>{result.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></>
            : <><p>Scores are relative to the selected provinces. Equal values receive 50 points.</p>
              {result.results.map((item) => <article key={item.id}><h3>{item.name} · {format.format(item.score)} / 100</h3>
                <ul>{item.parts.map((part) => <li key={part.label}>{part.label}: {format.format(part.value)} → {format.format(part.normalized)} / 100 × {part.weight}% = {format.format(part.contribution)}</li>)}</ul>
              </article>)}</>}
        </div>}
      </section>
      <section aria-labelledby="checklist-title">
        <h2 id="checklist-title">Market entry checklist</h2>
        <p>Use this as a planning list and verify requirements with the competent authorities for the proposed activity and location.</p>
        <ul className="decision-checklist">
          <li><label><input type="checkbox" /> Define the retail activity, customer segment and operating model.</label></li>
          <li><label><input type="checkbox" /> Verify investment, business registration and ownership requirements for the investor.</label></li>
          <li><label><input type="checkbox" /> Check location, premises and any activity-specific authorisations with the relevant authorities.</label></li>
          <li><label><input type="checkbox" /> Confirm tax, employment and product-specific obligations with qualified advisers.</label></li>
        </ul>
      </section>
    </>}
  </div>;
}
