"use client";

import { useEffect, useState } from "react";
import type { Profile, Geography } from "../geography/types";

export function GeoSearch({ onSelect }: { onSelect: (profile: Profile) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Geography[]>([]);
  useEffect(() => {
    if (query.trim().length < 2) return setResults([]);
    const controller = new AbortController();
    fetch(`/api/geographies?q=${encodeURIComponent(query)}`, { signal: controller.signal }).then((res) => res.json()).then((body) => setResults(body.data ?? [])).catch(() => undefined);
    return () => controller.abort();
  }, [query]);
  async function select(place: Geography) {
    const response = await fetch(`/api/geographies/${place.id}`);
    const body = await response.json();
    if (body.data) onSelect(body.data);
    setResults([]);
    setQuery(place.displayName);
  }
  return (
    <div className="geo-search">
      <label htmlFor="geo-search-input">Find a place</label>
      <input id="geo-search-input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Hà Nội, Ha Noi, 01" autoComplete="off" />
      {results.length > 0 ? <ul className="search-results">{results.map((place) => <li key={place.id}><button onClick={() => select(place)}><strong>{place.displayName}</strong><span>{place.level} · {place.parentName ?? "Vietnam"}</span></button></li>)}</ul> : null}
    </div>
  );
}
