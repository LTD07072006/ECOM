"use client";

import { useEffect, useRef, useState } from "react";
import type { Profile, Geography } from "../geography/types";

export function GeoSearch({ onSelect }: { onSelect: (profile: Profile) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Geography[]>([]);
  const [selected, setSelected] = useState("");
  const [status, setStatus] = useState("");
  const selection = useRef<AbortController | null>(null);
  useEffect(() => () => selection.current?.abort(), []);

  useEffect(() => {
    if (query.trim().length < 2 || query === selected) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setStatus("Searching…");
      try {
        const response = await fetch(`/api/geographies?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (!response.ok) throw new Error();
        const body: { data: Geography[] } = await response.json();
        if (controller.signal.aborted) return;
        setResults(body.data);
        setStatus(body.data.length ? `${body.data.length} places found.` : "No matching places.");
      } catch {
        if (!controller.signal.aborted) setStatus("Search is temporarily unavailable.");
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, selected]);

  async function select(place: Geography) {
    selection.current?.abort();
    const controller = new AbortController();
    selection.current = controller;
    setStatus("Loading profile…");
    try {
      const response = await fetch(`/api/geographies/${place.id}`, { signal: controller.signal });
      if (!response.ok) throw new Error();
      const body: { data: Profile } = await response.json();
      if (controller.signal.aborted) return;
      onSelect(body.data);
      document.getElementById("geo-search-input")?.focus();
      setSelected(place.displayName);
      setQuery(place.displayName);
      setResults([]);
      setStatus(`Profile loaded for ${place.displayName}.`);
    } catch {
      if (!controller.signal.aborted) setStatus("The profile is temporarily unavailable. Try selecting it again.");
    }
  }
  return (
    <div className="geo-search">
      <label htmlFor="geo-search-input">Find a place</label>
      <input id="geo-search-input" value={query} onChange={(event) => {
        selection.current?.abort();
        setQuery(event.target.value);
        setSelected("");
        setResults([]);
        setStatus("");
      }} maxLength={120} placeholder="Hà Nội, Ha Noi, 01" autoComplete="off" />
      <p className="search-status" role="status">{status}</p>
      {results.length > 0 ? <ul className="search-results">{results.map((place) => <li key={place.id}><button onClick={() => select(place)}><strong>{place.displayName}</strong><span>{place.level} · {place.parentName ?? "Vietnam"}</span></button></li>)}</ul> : null}
    </div>
  );
}
