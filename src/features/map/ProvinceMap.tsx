"use client";

import { useEffect, useRef, useState } from "react";
import type { ExpressionSpecification, GeoJSONSource, Map as MapLibreMap, Popup as MapPopup } from "maplibre-gl";
import type { DatasetMetadata, ProvinceMapData } from "../geography/types";
import { colorScale, layerColor, missingColor, type InfrastructureLayer, type StatisticalLayer } from "./layers";

const provinceSource = "provinces";
const fillLayer = "province-fill";
const airportLayer = "civil-airports";
const baseFill = "#38615b";

export function ProvinceMap({ selectedId, onSelect, layer, infrastructure }: {
  selectedId: string | null; onSelect: (id: string) => void;
  layer: StatisticalLayer | null; infrastructure: InfrastructureLayer | null;
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const previousId = useRef<string | null>(null);
  const popupRef = useRef<MapPopup | null>(null);
  const [dataset, setDataset] = useState<DatasetMetadata | null>(null);
  const [status, setStatus] = useState<"loading" | "empty" | "unavailable" | "ready">("loading");

  useEffect(() => {
    const request = new AbortController();
    let map: MapLibreMap | null = null;

    async function mountMap() {
      const response = await fetch("/api/map/provinces", { signal: request.signal });
      if (!response.ok) throw new Error("Boundary request failed");
      const result: { data: Omit<ProvinceMapData, "dataset">; meta: { dataset: DatasetMetadata | null } } = await response.json();
      if (request.signal.aborted || !container.current) return;
      if (!result.meta.dataset || !result.data.features.length) {
        setStatus("empty");
        return;
      }

      const { LngLatBounds, Map, NavigationControl, Popup } = await import("maplibre-gl");
      if (request.signal.aborted || !container.current) return;
      const bounds = new LngLatBounds();
      for (const feature of result.data.features) {
        const polygons = feature.geometry.type === "MultiPolygon" ? feature.geometry.coordinates : [feature.geometry.coordinates];
        for (const polygon of polygons) {
          for (const [longitude, latitude] of polygon[0]) bounds.extend([longitude, latitude]);
        }
      }

      const view = new Map({
        container: container.current,
        bounds,
        fitBoundsOptions: { padding: 28, duration: 0 },
        maxZoom: 11,
        dragRotate: false,
        renderWorldCopies: false,
        attributionControl: false,
      });
      map = view;
      mapRef.current = view;
      view.touchZoomRotate.disableRotation();
      let initialized = false;
      let retryFrame: number | null = null;
      const removeLifecycleListeners = () => {
        view.off("style.load", handleMapLifecycle);
        view.off("load", handleMapLifecycle);
        view.off("idle", handleMapLifecycle);
        view.off("render", handleMapLifecycle);
        if (retryFrame !== null) {
          cancelAnimationFrame(retryFrame);
          retryFrame = null;
        }
      };
      const initializeLayers = () => {
        if (initialized || request.signal.aborted || !container.current || mapRef.current !== view) return;
        if (view.getSource(provinceSource)) {
          initialized = true;
          setDataset(result.meta.dataset);
          setStatus("ready");
          removeLifecycleListeners();
          return;
        }
        if (!view.isStyleLoaded()) return;
        try {
          view.addSource(provinceSource, { type: "geojson", data: result.data, promoteId: "id" });
          view.addLayer({
            id: fillLayer, type: "fill", source: provinceSource,
            paint: {
              "fill-color": ["case", ["boolean", ["feature-state", "selected"], false], "#d68c61", baseFill],
              "fill-opacity": 0.92,
            },
          });
          view.addLayer({
            id: "province-outline", type: "line", source: provinceSource,
            paint: { "line-color": "#a4cebf", "line-width": 1 },
          });
          view.addSource(airportLayer, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
          view.addLayer({
            id: airportLayer, type: "circle", source: airportLayer, layout: { visibility: "none" },
            paint: { "circle-radius": 5, "circle-color": "#73d8f5", "circle-stroke-color": "#132e2c", "circle-stroke-width": 1.5 },
          });
          view.on("click", airportLayer, (event) => {
          const feature = event.features?.[0];
          if (!feature || feature.geometry.type !== "Point") return;
          const item = feature.properties;
          const [longitude, latitude] = feature.geometry.coordinates;
          const content = document.createElement("div");
          content.className = "airport-popup";
          const title = document.createElement("strong");
          title.textContent = item.code ? `${item.name} (${item.code})` : item.name;
          const province = document.createElement("p");
          province.textContent = item.province;
          const source = document.createElement("a");
          source.textContent = "Airport record";
          source.href = item.url;
          content.append(title, province, source);
          popupRef.current?.remove();
          popupRef.current = new Popup({ maxWidth: "240px" }).setLngLat([longitude, latitude]).setDOMContent(content).addTo(view);
        });
          view.on("click", fillLayer, (event) => {
          if (view.getLayoutProperty(airportLayer, "visibility") === "visible"
            && view.queryRenderedFeatures(event.point, { layers: [airportLayer] }).length) return;
          const id = event.features?.[0]?.properties.id;
          if (typeof id === "string") onSelect(id);
        });
          view.on("mouseenter", fillLayer, () => { view.getCanvas().style.cursor = "pointer"; });
          view.on("mouseleave", fillLayer, () => { view.getCanvas().style.cursor = ""; });
          view.on("mouseenter", airportLayer, () => { view.getCanvas().style.cursor = "pointer"; });
          view.on("mouseleave", airportLayer, () => { view.getCanvas().style.cursor = ""; });
          initialized = true;
          setDataset(result.meta.dataset);
          setStatus("ready");
          removeLifecycleListeners();
        } catch {
          scheduleInitialization();
        }
      };
      const scheduleInitialization = () => {
        if (retryFrame !== null || initialized || request.signal.aborted) return;
        retryFrame = requestAnimationFrame(() => {
          retryFrame = null;
          initializeLayers();
          if (!initialized) scheduleInitialization();
        });
      };
      function handleMapLifecycle() {
        initializeLayers();
        if (!initialized) scheduleInitialization();
      }
      for (const event of ["style.load", "load", "idle", "render"] as const) {
        view.on(event, handleMapLifecycle);
      }
      view.addControl(new NavigationControl({ showCompass: false }), "top-right");
      view.setStyle({
        version: 8,
        sources: {},
        layers: [{ id: "water", type: "background", paint: { "background-color": "#132e2c" } }],
      });
      queueMicrotask(handleMapLifecycle);
    }

    void mountMap().catch(() => {
      if (!request.signal.aborted) setStatus("unavailable");
    });
    return () => {
      request.abort();
      map?.remove();
      mapRef.current = null;
      previousId.current = null;
      popupRef.current = null;
    };
  }, [onSelect]);

  useEffect(() => {
    const map = mapRef.current;
    if (status !== "ready" || !map?.getSource(provinceSource)) return;
    if (previousId.current) map.removeFeatureState({ source: provinceSource, id: previousId.current });
    if (selectedId) map.setFeatureState({ source: provinceSource, id: selectedId }, { selected: true });
    previousId.current = selectedId;
  }, [selectedId, status]);

  useEffect(() => {
    const map = mapRef.current;
    if (status !== "ready" || !map?.getLayer(fillLayer)) return;
    let colors: string | ExpressionSpecification = baseFill;
    if (layer) {
      const bins = colorScale(layer);
      const [first, ...rest] = Object.entries(layer.values);
      colors = first ? ["match", ["get", "id"], first[0], layerColor(first[1], bins),
        ...rest.flatMap(([id, value]) => [id, layerColor(value, bins)]), missingColor] : missingColor;
    }
    map.setPaintProperty(fillLayer, "fill-color", ["case", ["boolean", ["feature-state", "selected"], false], "#d68c61", colors]);
  }, [layer, status]);

  useEffect(() => {
    const map = mapRef.current;
    if (status !== "ready" || !map?.getLayer(airportLayer)) return;
    if (infrastructure) map.getSource<GeoJSONSource>(airportLayer)?.setData(infrastructure.points);
    else popupRef.current?.remove();
    map.setLayoutProperty(airportLayer, "visibility", infrastructure ? "visible" : "none");
  }, [infrastructure, status]);

  return <>
    <div className="province-map" ref={container} aria-label="Interactive map of provincial boundaries" data-map-status={status} />
    {status !== "ready" && <p className="province-map-status" role="status">{
      status === "loading" ? "Loading provincial boundaries…"
        : status === "empty" ? "No provincial boundaries have been published. Use place search to explore the catalog."
          : "The map is temporarily unavailable. Use place search to open a profile."
    }</p>}
    {dataset && <div className="province-map-credit">
      <a href={dataset.source.url ?? undefined}>{dataset.source.publisher} · {dataset.version}</a>
      {dataset.source.license === "CC BY 3.0 IGO"
        ? <a href="https://creativecommons.org/licenses/by/3.0/igo/">CC BY 3.0 IGO</a>
        : <span>{dataset.source.license}</span>}
      <span>Simplified provincial boundaries</span>
    </div>}
  </>;
}
