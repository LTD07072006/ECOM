"use client";

import { useState, type FormEvent } from "react";
import type { ReleaseAction, ReleaseOverview, ReleaseRole } from "./operations";

const actionLabel: Record<ReleaseAction, string> = { approve: "Approve", publish: "Publish", retire: "Retire" };

function DatasetEvidence({ dataset }: { dataset: ReleaseOverview["datasets"][number] }) {
  const evidence = [...dataset.methods, ...dataset.limitations].join(" ")
    || (dataset.boundaries > 0 ? "Province display boundaries in WGS 84. Geometry is simplified and does not cover communes."
      : dataset.points > 0 ? "Airport reference points assigned to provinces by spatial containment. Coverage is limited to verified records."
        : dataset.units > 0 ? "Official administrative names and codes from the referenced snapshot. Coverage follows the effective geography version."
          : "See source citation and geography coverage.");
  return <details className="release-dataset">
    <summary>
      <strong>{dataset.code}</strong> · {dataset.version} · {dataset.status}
      {dataset.stale ? " · Review overdue" : ""}
      {dataset.source_status !== "active" ? ` · Source ${dataset.source_status}` : ""}
    </summary>
    <dl>
      <dt>Publisher</dt><dd>{dataset.publisher}</dd>
      <dt>Citation</dt><dd>{dataset.url ? <a href={dataset.url}>{dataset.citation}</a> : dataset.citation}</dd>
      <dt>License and access</dt><dd>{dataset.license} · {dataset.access}</dd>
      <dt>Dataset owner</dt><dd>{dataset.owner ?? "Unassigned"}</dd>
      <dt>Dates</dt><dd>As of {dataset.as_of ?? "—"} · Reviewed {dataset.reviewed ?? "—"} · Review due {dataset.due ?? "—"}</dd>
      <dt>Geography and coverage</dt><dd>{dataset.geographies.join(", ") || "Unavailable"} · {dataset.covered_provinces} of {dataset.expected_provinces} provinces · {dataset.communes} communes</dd>
      <dt>Records and missing values</dt><dd>{dataset.units} administrative units · {dataset.boundaries} boundaries · {dataset.points} POIs · {dataset.observations} observations · {dataset.missing} missing</dd>
      <dt>Period</dt><dd>{dataset.periods.join("; ") || "See source reference date"}</dd>
      <dt>Method and limitations</dt><dd>{evidence}</dd>
      <dt>Validation</dt><dd>{dataset.invalid_geometry} invalid geospatial records · {dataset.invalid_observations} invalid observations</dd>
      <dt>SHA-256</dt><dd><code>{dataset.checksum ?? "Unavailable"}</code></dd>
    </dl>
  </details>;
}

export function ReleaseDashboard() {
  const [token, setToken] = useState("");
  const [result, setResult] = useState<{ role: ReleaseRole; actor?: string; data: ReleaseOverview }>();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [problem, setProblem] = useState("");
  const [batchId, setBatchId] = useState<string>();
  const [action, setAction] = useState<ReleaseAction>();

  async function request(body?: string) {
    setBusy(true);
    setProblem("");
    setStatus(body ? "Saving release action…" : "Loading release overview…");
    const url = "/api/internal/releases";
    const headers = { Authorization: `Bearer ${token}`, ...(body && { "Content-Type": "application/json" }) };
    try {
      if (body) {
        const response = await fetch(url, { method: "POST", headers, body });
        if (!response.ok) throw new Error((await response.json()).error);
        setAction(undefined);
      }
      const response = await fetch(url, { headers, cache: "no-store" });
      if (response.status === 401) setResult(undefined);
      if (!response.ok) throw new Error((await response.json()).error);
      setResult(await response.json());
      setStatus(body ? "Release action recorded." : "Release overview loaded.");
    } catch (error) {
      setStatus("");
      setProblem(error instanceof Error ? error.message : "The release service is unavailable.");
    } finally {
      setBusy(false);
    }
  }

  function submitAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const note = new FormData(event.currentTarget).get("note");
    void request(JSON.stringify({ batchId, action, note }));
  }

  return <main className="release-shell">
    <a href="/">← Market workspace</a>
    <h1>Release operations</h1>
    {result ? <div className="release-toolbar">
      <p>Signed in as <strong>{result.actor ?? result.role}</strong> · {result.role}</p>
      <button disabled={busy} onClick={() => void request()}>Refresh overview</button>
      <button disabled={busy} onClick={() => {
        setResult(undefined);
        setToken("");
        setStatus("Signed out.");
        setProblem("");
        setBatchId(undefined);
        setAction(undefined);
      }}>Sign out</button>
    </div> : <form onSubmit={(event) => { event.preventDefault(); void request(); }}>
      <label htmlFor="release-token">Release access token</label>
      <input id="release-token" type="password" value={token} onChange={(event) => setToken(event.target.value)}
        autoComplete="off" required minLength={43} maxLength={128} disabled={busy} />
      <button type="submit" disabled={busy}>Open dashboard</button>
    </form>}
    <p role="status">{status}</p>
    {problem && <p className="release-error" role="alert">{problem}</p>}
    {result && <>
      <h2>Dataset freshness</h2>
      <dl className="release-metrics">
        <div><dt>Published datasets</dt><dd>{result.data.freshness.publishedDatasets}</dd></div>
        <div><dt>Review overdue</dt><dd>{result.data.freshness.reviewDue}</dd></div>
        <div><dt>Sources due for review</dt><dd>{result.data.freshness.staleSources}</dd></div>
        <div><dt>Revoked sources</dt><dd>{result.data.freshness.revokedSources}</dd></div>
        <div><dt>Source restrictions</dt><dd>{result.data.freshness.blockedDatasets}</dd></div>
        <div><dt>Invalid geospatial records</dt><dd>{result.data.freshness.invalidGeometry}</dd></div>
      </dl>
      <h2>Release queue and audit</h2>
      {result.data.batches.length === 0 && <p>Stage a validated manifest to create a release batch.</p>}
      {result.data.batches.map((batch) => {
        const available = result.role === "reviewer"
          ? batch.staged && !batch.approved && !batch.blockers.length ? "approve" : null
          : batch.staged && batch.approved && !batch.blockers.length ? "publish"
            : batch.kind === "wave2" && batch.published && !batch.retired ? "retire" : null;
        return <section className="release-batch" key={batch.id}>
          <h3>{batch.kind === "foundation" ? "Administrative foundation" : "Wave 2"} · {batch.geography}</h3>
          <p>Manifest SHA-256 <code>{batch.fingerprint}</code></p>
          {batch.staged && batch.blockers.length > 0 && <ul>{batch.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>}
          {result.data.datasets.filter((dataset) => dataset.batch_id === batch.id).map((dataset) =>
            <DatasetEvidence key={dataset.dataset_version_id} dataset={dataset} />)}
          <details>
            <summary>Audit history</summary>
            <ol>{batch.audit.map((entry) => <li key={entry.action}>{entry.action} · {entry.actor} · <time dateTime={entry.at}>{new Date(entry.at).toLocaleString()}</time>{entry.note && ` · ${entry.note}`}</li>)}</ol>
          </details>
          {available && (batch.id === batchId && action ? <form onSubmit={submitAction}>
            <label htmlFor="release-note">Review note</label>
            <textarea id="release-note" name="note" required minLength={10} maxLength={500} autoFocus />
            <button type="submit" disabled={busy}>Confirm {actionLabel[action].toLowerCase()}</button>
            <button type="button" disabled={busy} onClick={() => setAction(undefined)}>Cancel</button>
          </form> : <button disabled={busy} onClick={() => {
            setBatchId(batch.id);
            setAction(available);
          }}>{actionLabel[available]} batch</button>)}
        </section>;
      })}
      <h2>Datasets outside the release queue</h2>
      {result.data.datasets.every((dataset) => dataset.batch_id) && <p>No unregistered datasets.</p>}
      {result.data.datasets.filter((dataset) => !dataset.batch_id).map((dataset) =>
        <DatasetEvidence key={dataset.dataset_version_id} dataset={dataset} />)}
    </>}
  </main>;
}
