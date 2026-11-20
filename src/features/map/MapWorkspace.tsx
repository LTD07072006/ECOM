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

type Coverage = {
  total: number;
  pointOnly: number;
  boundaryReady: number;
  publicBoundaryAvailable: boolean;
};

type Props = { coverage: Coverage };

export function MapWorkspace({ coverage }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState(false);
  const [layers, setLayers] = useState<MapLayers | null>(null);
  const [layerError, setLayerError] = useState(false);
  const [layerId, setLayerId] = useState("");
  const [showAirports, setShowAirports] = useState(false);
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
  const province = selectedProvince && profile ? { id: selectedProvince, name: profile.level === "province" ? profile.displayName : profile.parentName ?? "Province" } : null;

  return (
    <section className="workspace database-map-workspace" aria-label="Vietnam map workspace">
      <div className="map-stage database-map-stage">
        <ProvinceMap selectedId={selectedProvince} onSelect={openProfile} layer={activeLayer} infrastructure={showAirports ? layers?.infrastructure ?? null : null} />
      </div>
      <div className="workspace-panel">
        <GeoSearch onSelect={selectSearchResult} />
        <aside aria-label="Geometry coverage" className="muted">
          {coverage.publicBoundaryAvailable
            ? `${coverage.boundaryReady} of ${coverage.total} provincial boundaries published.`
            : "No provincial boundaries are published."}
        </aside>
        {layerError && <p className="muted" role="status">Thematic layers are temporarily unavailable.</p>}
        {layers && <LayerControls data={layers} layer={activeLayer} setLayer={setLayerId} airports={showAirports}
          setAirports={setShowAirports} province={province} provinceCount={coverage.total} />}
        {profileError && <p className="muted" role="status">The profile could not be loaded. Select the place again to retry.</p>}
        {profile ? <GeoProfilePanel profile={profile} /> : <div className="profile-empty"><p>Select a province on the map or search by place name or code.</p></div>}
        {profile ? <ShortlistButton geo={profile} /> : null}
        <ShortlistTray />
      </div>
    </section>
  );
}
