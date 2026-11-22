"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GeoSearch } from "../search/GeoSearch";
import { GeoProfilePanel } from "../profile/GeoProfilePanel";
import { ShortlistButton } from "../shortlist/ShortlistButton";
import { ShortlistTray } from "../shortlist/ShortlistTray";
import { ProvinceMap } from "./ProvinceMap";
import { LayerControls } from "./LayerControls";
import type { MapLayers } from "./layers";
import type { Profile } from "../geography/types";
import { RegionPanel, type RegionIds } from "../regions/RegionPanel";
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
  const [profileError, setProfileError] = useState(false);
  const [layers, setLayers] = useState<MapLayers | null>(null);
  const [layerError, setLayerError] = useState(false);
  const [layerId, setLayerId] = useState("");
  const [showAirports, setShowAirports] = useState(false);
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
    setProfileError(false);
    void fetch(`/api/geographies/${encodeURIComponent(id)}`, { signal: request.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Profile request failed");
        const result: { data: Profile } = await response.json();
        if (!request.signal.aborted) setProfile(result.data);
      })
      .catch(() => {
        if (!request.signal.aborted) setProfileError(true);
      });
  }, []);

  const selectSearchResult = useCallback((result: Profile) => {
    pending.current?.abort();
    setProfileError(false);
    setProfile(result);
  }, []);

  const selectedProvince = profile?.level === "province" ? profile.id : profile?.level === "commune" ? profile.parentId : null;
  const activeLayer = layers?.indicators.find((layer) => layer.id === layerId) ?? null;
  const province = selectedProvince && profile ? { id: selectedProvince, name: profile.level === "province" ? profile.displayName : profile.parentName ?? t("common.vietnam") } : null;

  return (
    <section className="workspace database-map-workspace" aria-label={t("map.workspace")}>
      <div className="map-stage database-map-stage">
        <ProvinceMap selectedId={regionMode ? null : selectedProvince} regionIds={regionMode ? regions.flat() : []} onSelect={regionMode ? toggleRegion : openProfile} layer={activeLayer} infrastructure={showAirports ? layers?.infrastructure ?? null : null} />
      </div>
      <div className="workspace-panel">
        <GeoSearch onSelect={selectSearchResult} />
        <button type="button" onClick={() => setRegionMode((value) => !value)} aria-expanded={regionMode}>{t(regionMode ? "region.close" : "region.details")}</button>
        {regionMode && <RegionPanel regions={regions} active={activeRegion} setActive={setActiveRegion}
          remove={(index, id) => setRegions((current) => current.map((ids, i) => i === index ? ids.filter((value) => value !== id) : ids) as RegionIds)}
          clear={() => setRegions([[], []])} addCurrent={() => { if (selectedProvince) toggleRegion(selectedProvince); }}
          canAddCurrent={!!selectedProvince && !regions[activeRegion].includes(selectedProvince)} />}
        <aside aria-label={t("map.coverageAria")} className="muted">
          {coverage.publicBoundaryAvailable
            ? t("map.coverage", { ready: coverage.boundaryReady, total: coverage.total })
            : t("map.coverageNone")}
        </aside>
        {layerError && <p className="muted" role="status">{t("map.layersUnavailable")}</p>}
        {layers && <LayerControls data={layers} layer={activeLayer} setLayer={setLayerId} airports={showAirports}
          setAirports={setShowAirports} province={province} provinceCount={coverage.total} />}
        {profileError && <p className="muted" role="status">{t("map.profileError")}</p>}
        {profile ? <GeoProfilePanel profile={profile} /> : <div className="profile-empty"><p>{t("map.emptyPrompt")}</p></div>}
        {profile ? <ShortlistButton geo={profile} /> : null}
        <ShortlistTray />
      </div>
    </section>
  );
}
