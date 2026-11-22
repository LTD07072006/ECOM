"use client";

import { useEffect, useRef, useState } from "react";
import type { Profile, Geography } from "../geography/types";
import { useI18n } from "../../lib/i18n/provider";
import { levelLabel } from "../../lib/i18n/data-labels";

export function GeoSearch({ onSelect }: { onSelect: (profile: Profile) => void }) {
  const { t, locale } = useI18n();
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
      setStatus(t("search.searching"));
      try {
        const response = await fetch(`/api/geographies?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (!response.ok) throw new Error();
        const body: { data: Geography[] } = await response.json();
        if (controller.signal.aborted) return;
        setResults(body.data);
        setStatus(body.data.length ? t("search.found", { count: body.data.length }) : t("search.none"));
      } catch {
        if (!controller.signal.aborted) setStatus(t("search.unavailable"));
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, selected, t]);

  async function select(place: Geography) {
    selection.current?.abort();
    const controller = new AbortController();
    selection.current = controller;
    setStatus(t("search.loadingProfile"));
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
      setStatus(t("search.profileLoaded", { name: place.displayName }));
    } catch {
      if (!controller.signal.aborted) setStatus(t("search.profileUnavailable"));
    }
  }
  return (
    <div className="geo-search">
      <label htmlFor="geo-search-input">{t("search.label")}</label>
      <input id="geo-search-input" value={query} onChange={(event) => {
        selection.current?.abort();
        setQuery(event.target.value);
        setSelected("");
        setResults([]);
        setStatus("");
      }} maxLength={120} placeholder={t("search.placeholder")} autoComplete="off" />
      <p className="search-status" role="status">{status}</p>
      {results.length > 0 ? <ul className="search-results">{results.map((place) => <li key={place.id}><button onClick={() => select(place)}><strong>{place.displayName}</strong><span>{t("search.resultMeta", {
        level: levelLabel(locale, place.level),
        parent: place.parentName ?? t("common.vietnam"),
      })}</span></button></li>)}</ul> : null}
    </div>
  );
}
