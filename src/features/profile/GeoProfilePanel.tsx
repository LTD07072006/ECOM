import type { DatasetMetadata, Profile } from "../geography/types";

function DatasetDetails({ dataset }: { dataset: DatasetMetadata }) {
  return <dl className="dataset-details">
    <div><dt>Dataset</dt><dd>{dataset.version}</dd></div>
    <div><dt>Owner</dt><dd>{dataset.owner}</dd></div>
    <div><dt>Data as of</dt><dd>{dataset.dataAsOf}</dd></div>
    <div><dt>Review due</dt><dd>{dataset.reviewDueAt.slice(0, 10)}</dd></div>
    <div><dt>Status</dt><dd>Published · {dataset.freshness === "current" ? "review current" : "review due"}</dd></div>
  </dl>;
}

export function GeoProfilePanel({ profile }: { profile: Profile }) {
  return <article className="profile-panel" data-testid="geo-profile">
    <div className="profile-heading"><div><span className="map-label">{profile.level}</span><h2>{profile.displayName}</h2><p>{profile.parentName ?? "Vietnam"} · {profile.geographyVersion}</p></div><span className="profile-code">{profile.code}</span></div>
    <p className="muted">Context only. These figures do not establish demand, returns, or eligibility.</p>
    {profile.observations.length === 0 && <p className="muted">No published context observations for this place.</p>}
    {profile.observations.map((observation) => <div className="observation" key={observation.id}>
      <div className="observation-title"><strong>{observation.label}</strong><span>{observation.quality}</span></div>
      <div className="observation-value">{observation.value === null ? <span className="unavailable">No data available</span> : `${observation.value.toLocaleString()} ${observation.unit}`}</div>
      <p>{observation.period} · {observation.unit}</p>
      <details>
        <summary>Source and limitations</summary>
        <p>{observation.source.url ? <a href={observation.source.url}>{observation.source.citation}</a> : observation.source.citation}</p>
        <dl className="dataset-details">
          <div><dt>Definition</dt><dd>{observation.definition}</dd></div>
          <div><dt>Period</dt><dd>{observation.periodStart} – {observation.periodEnd}</dd></div>
          <div><dt>License / access</dt><dd>{observation.source.license} / {observation.source.access}</dd></div>
          <div><dt>Updated</dt><dd>{observation.source.updatedAt}</dd></div>
          <div><dt>Dataset version</dt><dd>{observation.datasetVersion}</dd></div>
          <div><dt>Scope</dt><dd>{observation.scope}</dd></div>
          {observation.missingReason && <div><dt>Missing reason</dt><dd>{observation.missingReason}</dd></div>}
        </dl>
        <p>{observation.method}</p>
        <p>{observation.limitations}</p>
        {observation.dataset && <DatasetDetails dataset={observation.dataset} />}
      </details>
    </div>)}
    {profile.administrativeDataset && <details className="catalog-provenance">
      <summary>Administrative source</summary>
      <p><a href={profile.administrativeDataset.source.url ?? undefined}>{profile.administrativeDataset.source.publisher}</a></p>
      <DatasetDetails dataset={profile.administrativeDataset} />
    </details>}
  </article>;
}
