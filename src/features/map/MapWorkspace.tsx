"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GeoSearch } from "../search/GeoSearch";
import { GeoProfilePanel } from "../profile/GeoProfilePanel";
import { ShortlistButton } from "../shortlist/ShortlistButton";
import { ShortlistTray } from "../shortlist/ShortlistTray";
import { ProvinceMap } from "./ProvinceMap";
import { LayerControls } from "./LayerControls";
import type { MapLayers } from "./layers";
import type { Profile } from "../geography/types";
import { RegionPanel, type RegionIds } from "../regions/RegionPanel";
import { readFilterInputs, summarizeLayerValues } from "./filters";
import { mapStateQuery, readMapState } from "./url-state";
import { useI18n } from "../../lib/i18n/provider";

type Coverage = {
  total: number;
  pointOnly: number;
  boundaryReady: number;
  publicBoundaryAvailable: boolean;
};

type Props = { coverage: Coverage };

export function MapWorkspace({ coverage }: Props) {
  const { t } = useI18n();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [requestedPlace, setRequestedPlace] = useState("");
  const [profileError, setProfileError] = useState(false);
  const [layers, setLayers] = useState<MapLayers | null>(null);
  const [layerError, setLayerError] = useState(false);
  const [layerId, setLayerId] = useState("");
  const [showAirports, setShowAirports] = useState(false);
  const [filterMin, setFilterMin] = useState("");
  const [filterMax, setFilterMax] = useState("");
  const [regionMode, setRegionMode] = useState(false);
  const [activeRegion, setActiveRegion] = useState(0);
  const [regions, setRegions] = useState<RegionIds>([[], []]);
  const toggleRegion = useCallback((id: string) => {
    setRegions((current) => {
      const next: RegionIds = [current[0].filter((item) => item !== id), current[1].filter((item) => item !== id)];
      if (!current[activeRegion].includes(id)) {
        if (next[activeRegion].length >= 10) return current;
        next[activeRegion].push(id);
      }
      return next;
    });
  }, [activeRegion]);
  const pending = useRef<AbortController | null>(null);
  useEffect(() => () => pending.current?.abort(), []);

  useEffect(() => {
    const request = new AbortController();
    void fetch("/api/map/layers", { signal: request.signal }).then(async (response) => {
      if (!response.ok) throw new Error("Layer request failed");
      const result: { data: MapLayers } = await response.json();
      if (!request.signal.aborted) setLayers(result.data);
    }).catch(() => {
      if (!request.signal.aborted) setLayerError(true);
    });
    return () => request.abort();
  }, []);

  const openProfile = useCallback((id: string) => {
    pending.current?.abort();
    const request = new AbortController();
    pending.current = request;
    setRequestedPlace(id);
    setProfileError(false);
    void fetch(`/api/geographies/${encodeURIComponent(id)}`, { signal: request.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Profile request failed");
        const result: { data: Profile } = await response.json();
        if (!request.signal.aborted) setProfile(result.data);
      })
      .catch(() => {
        if (!request.signal.aborted) setProfileError(true);
      })
      .finally(() => {
        if (!request.signal.aborted) setRequestedPlace("");
      });
  }, []);

  const selectSearchResult = useCallback((result: Profile) => {
    pending.current?.abort();
    setRequestedPlace("");
    setProfileError(false);
    setProfile(result);
  }, []);

  const [restored, setRestored] = useState(false);
  useEffect(() => {
    const restore = () => {
      const state = readMapState(window.location.search);
      setLayerId(state.layer);
      setShowAirports(state.airports);
      setFilterMin(state.filter.min === null ? "" : String(state.filter.min));
      setFilterMax(state.filter.max === null ? "" : String(state.filter.max));
      setProfile(null);
      setProfileError(false);
      if (state.province) openProfile(state.province);
      else {
        pending.current?.abort();
        setRequestedPlace("");
      }
      setRestored(true);
    };
    restore();
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [openProfile]);

  const selectedProvince = profile?.level === "province" ? profile.id : profile?.level === "commune" ? profile.parentId : null;
  const activeLayer = layers?.indicators.find((layer) => layer.id === layerId) ?? null;
  const province = selectedProvince && profile ? { id: selectedProvince, name: profile.level === "province" ? profile.displayName : profile.parentName ?? t("common.vietnam") } : null;
  const filterInputs = readFilterInputs(filterMin, filterMax);
  const filterReady = !filterInputs.invalid && !filterInputs.inverted;
  const filterSummary = useMemo(
    () => activeLayer ? summarizeLayerValues(activeLayer.values, readFilterInputs(filterMin, filterMax).filter) : null,
    [activeLayer, filterMin, filterMax],
  );
  const matchIds = filterSummary?.active && filterReady ? filterSummary.matchedIds : null;

  useEffect(() => {
    if (!restored) return;
    const inputs = readFilterInputs(filterMin, filterMax);
    const query = mapStateQuery({
      layer: layerId,
      province: requestedPlace || selectedProvince || "",
      filter: inputs.invalid || inputs.inverted ? { min: null, max: null } : inputs.filter,
      airports: showAirports,
    });
    const url = new URL(window.location.href);
    const next = new URLSearchParams(query);
    for (const key of ["layer", "province", "min", "max", "airports"]) {
      const value = next.get(key);
      if (value === null) url.searchParams.delete(key);
      else url.searchParams.set(key, value);
    }
    if (url.href !== window.location.href) window.history.replaceState(window.history.state, "", url);
  }, [restored, layerId, requestedPlace, selectedProvince, filterMin, filterMax, showAirports]);

  const selectLayer = useCallback((id: string) => {
    setLayerId(id);
    setFilterMin("");
    setFilterMax("");
  }, []);
  const changeFilter = useCallback((min: string, max: string) => {
    setFilterMin(min);
    setFilterMax(max);
  }, []);
  const clearFilter = useCallback(() => {
    setFilterMin("");
    setFilterMax("");
  }, []);

  return (
    <section className="workspace database-map-workspace" aria-label={t("map.workspace")}>
      <div className="map-stage database-map-stage">
        <ProvinceMap selectedId={regionMode ? null : selectedProvince} regionIds={regionMode ? regions.flat() : []} onSelect={regionMode ? toggleRegion : openProfile} layer={activeLayer} matchIds={matchIds} infrastructure={showAirports ? layers?.infrastructure ?? null : null} />
      </div>
      <div className="workspace-panel">
        <GeoSearch onSelect={selectSearchResult} />
        <button type="button" onClick={() => setRegionMode((value) => !value)} aria-expanded={regionMode}>{t(regionMode ? "region.close" : "region.details")}</button>
        {regionMode && <RegionPanel regions={regions} restore={setRegions} active={activeRegion} setActive={setActiveRegion}
          remove={(index, id) => setRegions((current) => current.map((ids, i) => i === index ? ids.filter((value) => value !== id) : ids) as RegionIds)}
          clear={() => setRegions([[], []])} addCurrent={() => { if (selectedProvince) toggleRegion(selectedProvince); }}
          canAddCurrent={!!selectedProvince && regions[activeRegion].length < 10 && !regions[activeRegion].includes(selectedProvince)} />}
        <aside aria-label={t("map.coverageAria")} className="muted">
          {coverage.publicBoundaryAvailable
            ? t("map.coverage", { ready: coverage.boundaryReady, total: coverage.total })
            : t("map.coverageNone")}
        </aside>
        {layerError && <p className="muted" role="status">{t("map.layersUnavailable")}</p>}
        {layers && <LayerControls data={layers} layer={activeLayer} setLayer={selectLayer} airports={showAirports}
          setAirports={setShowAirports} province={province} provinceCount={coverage.total}
          filterMin={filterMin} filterMax={filterMax} onFilterChange={changeFilter} onClearFilter={clearFilter}
          filterSummary={filterSummary} filterInvalid={filterInputs.invalid} filterInverted={filterInputs.inverted} />}
        {profileError && <p className="muted" role="status">{t("map.profileError")}</p>}
        {profile ? <GeoProfilePanel profile={profile} /> : <div className="profile-empty"><p>{t("map.emptyPrompt")}</p></div>}
        {profile ? <ShortlistButton geo={profile} /> : null}
        <ShortlistTray />
      </div>
    </section>
  );
}
