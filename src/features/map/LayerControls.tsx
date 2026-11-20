"use client";

import { useState } from "react";
import { colorScale, indicatorGroups, missingColor, sourcesAreComparable, type MapLayers, type StatisticalLayer } from "./layers";

const number = new Intl.NumberFormat("en", { maximumFractionDigits: 2 });

function layerOption(layer: StatisticalLayer) {
  return `${layer.label} · ${layer.period} · ${layer.dataset.version}`;
}

function SourceDetails({ layer }: { layer: StatisticalLayer }) {
  return <article className="layer-source">
    <strong>{layer.label}</strong>
    <a href={layer.dataset.source.url ?? undefined}>{layer.dataset.source.title}</a>
    <dl className="dataset-details">
      <div><dt>Publisher</dt><dd>{layer.dataset.source.publisher}</dd></div>
      <div><dt>Version</dt><dd>{layer.dataset.version}</dd></div>
      <div><dt>Period</dt><dd>{layer.period}</dd></div>
      <div><dt>Geography</dt><dd>{layer.geographyVersion}</dd></div>
      <div><dt>Unit</dt><dd>{layer.unit}</dd></div>
      <div><dt>Scope</dt><dd>{layer.scope.replaceAll("_", " ")}</dd></div>
      <div><dt>Coverage</dt><dd>{Object.values(layer.values).filter((value) => value !== null).length} provinces with values</dd></div>
      <div><dt>License</dt><dd>{layer.dataset.source.license}</dd></div>
      <div><dt>Review</dt><dd>{layer.dataset.freshness === "review_due" ? "Due" : "Current"} · {layer.dataset.reviewDueAt.slice(0, 10)}</dd></div>
    </dl>
    <p>{layer.definition}</p><p>{layer.method}</p><p>{layer.limitations}</p>
  </article>;
}

function SourceComparison({ layers, active, province }: {
  layers: StatisticalLayer[]; active: StatisticalLayer | null; province: { id: string; name: string } | null;
}) {
  const [firstId, setFirstId] = useState("");
  const [secondId, setSecondId] = useState("");
  const first = layers.find((item) => item.id === firstId) ?? active ?? layers[0];
  const others = layers.filter((item) => item.id !== first?.id);
  const second = others.find((item) => item.id === secondId) ?? others.find((item) => item.indicator === first?.indicator) ?? others[0];
  if (!first || !second) return null;
  const comparable = sourcesAreComparable(first, second);
  const firstValue = province ? first.values[province.id] : null;
  const secondValue = province ? second.values[province.id] : null;

  return <details className="layer-comparison">
    <summary>Compare sources</summary>
    <label>First source
      <select value={first.id} onChange={(event) => setFirstId(event.target.value)}>
        {layers.map((item) => <option key={item.id} value={item.id}>{layerOption(item)}</option>)}
      </select>
    </label>
    <label>Second source
      <select value={second.id} onChange={(event) => setSecondId(event.target.value)}>
        {others.map((item) => <option key={item.id} value={item.id}>{layerOption(item)}</option>)}
      </select>
    </label>
    <div className="layer-comparison-result" aria-live="polite">
      {!comparable ? <p>Numeric comparison requires the same indicator, definition, unit, period, scope and geography version.</p>
        : !province ? <p>Select a province to compare its published values.</p>
          : firstValue == null || secondValue == null ? <p>Both sources need a value for {province.name}.</p>
            : <p><strong>{province.name}</strong> — {number.format(firstValue)} {first.unit} vs {number.format(secondValue)} {second.unit}.
              {` Second minus first: ${number.format(secondValue - firstValue)} ${first.unit === "%" ? "percentage points" : first.unit}.`}</p>}
    </div>
    <SourceDetails layer={first} />
    <SourceDetails layer={second} />
  </details>;
}

export function LayerControls({ data, layer, setLayer, airports, setAirports, province, provinceCount }: {
  data: MapLayers;
  layer: StatisticalLayer | null;
  setLayer: (id: string) => void;
  airports: boolean;
  setAirports: (enabled: boolean) => void;
  province: { id: string; name: string } | null;
  provinceCount: number;
}) {
  const groups = new Map<string, StatisticalLayer[]>();
  for (const item of data.indicators) {
    const name = indicatorGroups[item.indicator] ?? "Other";
    const group = groups.get(name);
    if (group) group.push(item);
    else groups.set(name, [item]);
  }
  return <section className="layer-controls" aria-label="Map layers">
    <label>Colour provinces by
      <select value={layer?.id ?? ""} onChange={(event) => setLayer(event.target.value)}>
        <option value="">Administrative boundaries</option>
        {[...groups].map(([name, items]) => <optgroup key={name} label={name}>
          {items.map((item) => <option value={item.id} key={item.id}>{layerOption(item)}</option>)}
        </optgroup>)}
      </select>
    </label>
    {layer && <div className="layer-legend" aria-label="Indicator legend">
      <p>{layer.unit} · {layer.period} · {Object.values(layer.values).filter((value) => value != null).length} of {provinceCount} provinces</p>
      <ul>
        {colorScale(layer).map((bin, index) => <li key={bin.color}>
          <span style={{ background: bin.color }} aria-hidden="true" />
          {bin.min === bin.max ? number.format(bin.min) : `${index === 0 ? "" : "≥ "}${number.format(bin.min)} – ${number.format(bin.max)}`}
        </li>)}
        <li><span style={{ background: missingColor }} aria-hidden="true" /> Data unavailable</li>
      </ul>
      <a href={layer.dataset.source.url ?? undefined}>{layer.dataset.source.title}</a>
    </div>}
    {data.infrastructure && <div className="poi-control">
      <label><input type="checkbox" checked={airports} onChange={(event) => setAirports(event.target.checked)} /> Civil airports</label>
      {airports && <p><a href={data.infrastructure.dataset.source.url ?? undefined}>{data.infrastructure.dataset.source.publisher}</a> · {data.infrastructure.points.features.length} reference points</p>}
    </div>}
    <SourceComparison layers={data.indicators} active={layer} province={province} />
  </section>;
}
