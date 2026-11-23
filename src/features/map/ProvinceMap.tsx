"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import type {
	ExpressionSpecification,
	GeoJSONSource,
	Map as MapLibreMap,
	Popup as MapPopup,
} from "maplibre-gl";
import type { DatasetMetadata, ProvinceMapData } from "../geography/types";
import { safeSourceUrl } from "../../lib/source-url";
import {
	colorScale,
	layerColor,
	missingColor,
	type InfrastructureLayer,
	type StatisticalLayer,
} from "./layers";
import { useI18n } from "../../lib/i18n/provider";

const provinceSource = "provinces";
const fillLayer = "province-fill";
const airportLayer = "civil-airports";
const baseFill = "#38615b";

export function ProvinceMap({
	selectedId,
	regionIds = [],
	onSelect,
	layer,
	matchIds,
	infrastructure,
}: {
	selectedId: string | null;
	regionIds?: string[];
	onSelect: (id: string) => void;
	layer: StatisticalLayer | null;
	matchIds: string[] | null;
	infrastructure: InfrastructureLayer | null;
}) {
	const { t } = useI18n();
	const container = useRef<HTMLDivElement>(null);
	const mapRef = useRef<MapLibreMap | null>(null);
	const previousIds = useRef<string[]>([]);
	const onSelectRef = useRef(onSelect);
	onSelectRef.current = onSelect;
	const tRef = useRef(t);
	tRef.current = t;
	const popupRef = useRef<MapPopup | null>(null);
	const [dataset, setDataset] = useState<DatasetMetadata | null>(null);
	const [status, setStatus] = useState<
		"loading" | "empty" | "unavailable" | "ready"
	>("loading");

	useEffect(() => {
		const request = new AbortController();
		let map: MapLibreMap | null = null;
		let removeLifecycleListeners: (() => void) | undefined;

		async function mountMap() {
			const response = await fetch("/api/map/provinces", {
				signal: request.signal,
			});
			if (!response.ok) throw new Error("Boundary request failed");
			const result: {
				data: Omit<ProvinceMapData, "dataset">;
				meta: { dataset: DatasetMetadata | null };
			} = await response.json();
			if (request.signal.aborted || !container.current) return;
			if (!result.meta.dataset || !result.data.features.length) {
				setStatus("empty");
				return;
			}

			const {
				LngLatBounds,
				Map: MapView,
				NavigationControl,
				Popup,
				setWorkerUrl,
			} = await import("maplibre-gl");
			if (request.signal.aborted || !container.current) return;
			setWorkerUrl(
				new URL(
					"maplibre-gl/dist/maplibre-gl-worker.mjs",
					import.meta.url,
				).toString(),
			);
			const bounds = new LngLatBounds();
			for (const feature of result.data.features) {
				const polygons =
					feature.geometry.type === "MultiPolygon"
						? feature.geometry.coordinates
						: [feature.geometry.coordinates];
				for (const polygon of polygons) {
					for (const [longitude, latitude] of polygon[0])
						bounds.extend([longitude, latitude]);
				}
			}

			const view = new MapView({
				container: container.current,
				style: {
					version: 8,
					sources: {},
					layers: [
						{
							id: "water",
							type: "background",
							paint: { "background-color": "#132e2c" },
						},
					],
				},
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
			removeLifecycleListeners = () => {
				view.off("style.load", handleMapLifecycle);
				view.off("load", handleMapLifecycle);
			};
			const initializeLayers = () => {
				if (
					initialized ||
					request.signal.aborted ||
					!container.current ||
					mapRef.current !== view
				)
					return;
				if (!view.isStyleLoaded()) return;
				try {
					view.addSource(provinceSource, {
						type: "geojson",
						data: result.data,
						promoteId: "id",
					});
					view.addLayer({
						id: fillLayer,
						type: "fill",
						source: provinceSource,
						paint: {
							"fill-color": [
								"case",
								["boolean", ["feature-state", "selected"], false],
								"#d68c61",
								baseFill,
							],
							"fill-opacity": 0.92,
						},
					});
					view.addLayer({
						id: "province-outline",
						type: "line",
						source: provinceSource,
						paint: { "line-color": "#a4cebf", "line-width": 1 },
					});
					view.addSource(airportLayer, {
						type: "geojson",
						data: { type: "FeatureCollection", features: [] },
					});
					view.addLayer({
						id: airportLayer,
						type: "circle",
						source: airportLayer,
						layout: { visibility: "none" },
						paint: {
							"circle-radius": 5,
							"circle-color": [
								"match",
								["get", "kind"],
								"airport",
								"#73d8f5",
								"seaport",
								"#f2c14e",
								"industrial_park",
								"#f78154",
								"icd",
								"#b5838d",
								"expressway_node",
								"#90be6d",
								"#73d8f5",
							],
							"circle-stroke-color": "#132e2c",
							"circle-stroke-width": 1.5,
						},
					});
					view.on("click", airportLayer, (event) => {
						const feature = event.features?.[0];
						if (!feature || feature.geometry.type !== "Point") return;
						const item = feature.properties;
						const [longitude, latitude] = feature.geometry.coordinates;
						const content = document.createElement("div");
						content.className = "airport-popup";
						const title = document.createElement("strong");
						title.textContent = item.code
							? `${item.name} (${item.code})`
							: item.name;
						const province = document.createElement("p");
						province.textContent = item.province;
						content.append(title, province);
						const url =
							typeof item.url === "string" ? safeSourceUrl(item.url) : null;
						if (url) {
							const source = document.createElement("a");
							source.textContent = tRef.current("map.airportRecord");
							source.href = url;
							content.append(source);
						}
						popupRef.current?.remove();
						popupRef.current = new Popup({ maxWidth: "240px" })
							.setLngLat([longitude, latitude])
							.setDOMContent(content)
							.addTo(view);
					});
					view.on("click", fillLayer, (event) => {
						if (
							view.getLayoutProperty(airportLayer, "visibility") ===
								"visible" &&
							view.queryRenderedFeatures(event.point, {
								layers: [airportLayer],
							}).length
						)
							return;
						const id = event.features?.[0]?.properties.id;
						if (typeof id === "string") onSelectRef.current(id);
					});
					view.on("mouseenter", fillLayer, () => {
						view.getCanvas().style.cursor = "pointer";
					});
					view.on("mouseleave", fillLayer, () => {
						view.getCanvas().style.cursor = "";
					});
					view.on("mouseenter", airportLayer, () => {
						view.getCanvas().style.cursor = "pointer";
					});
					view.on("mouseleave", airportLayer, () => {
						view.getCanvas().style.cursor = "";
					});
					initialized = true;
					setDataset(result.meta.dataset);
					setStatus("ready");
					removeLifecycleListeners?.();
				} catch {
					setStatus("unavailable");
					removeLifecycleListeners?.();
				}
			};
			function handleMapLifecycle() {
				initializeLayers();
			}
			view.on("style.load", handleMapLifecycle);
			view.on("load", handleMapLifecycle);
			view.addControl(
				new NavigationControl({ showCompass: false }),
				"top-right",
			);
			queueMicrotask(handleMapLifecycle);
		}

		void mountMap().catch(() => {
			if (!request.signal.aborted) setStatus("unavailable");
		});
		return () => {
			request.abort();
			removeLifecycleListeners?.();
			map?.remove();
			mapRef.current = null;
			previousIds.current = [];
			popupRef.current = null;
		};
	}, []);

	useEffect(() => {
		const map = mapRef.current;
		if (status !== "ready" || !map?.getSource(provinceSource)) return;
		for (const id of previousIds.current)
			map.removeFeatureState({ source: provinceSource, id });
		const ids = [
			...new Set([...regionIds, ...(selectedId ? [selectedId] : [])]),
		];
		for (const id of ids)
			map.setFeatureState({ source: provinceSource, id }, { selected: true });
		previousIds.current = ids;
	}, [selectedId, regionIds, status]);

	useEffect(() => {
		const map = mapRef.current;
		if (status !== "ready" || !map?.getLayer(fillLayer)) return;
		let colors: string | ExpressionSpecification = baseFill;
		if (layer) {
			const bins = colorScale(layer);
			const [first, ...rest] = Object.entries(layer.values);
			colors = first
				? [
						"match",
						["get", "id"],
						first[0],
						layerColor(first[1], bins),
						...rest.flatMap(([id, value]) => [id, layerColor(value, bins)]),
						missingColor,
					]
				: missingColor;
		}
		map.setPaintProperty(fillLayer, "fill-color", [
			"case",
			["boolean", ["feature-state", "selected"], false],
			"#d68c61",
			colors,
		]);
	}, [layer, status]);

	useEffect(() => {
		const map = mapRef.current;
		if (status !== "ready" || !map?.getLayer(fillLayer)) return;
		const qualityOpacity = (id: string) => {
			const quality = layer?.valueDetails?.[id]?.quality;
			if (quality === "supported") return 0.72;
			if (quality === "unavailable") return 0.5;
			return 0.92;
		};
		const [firstId, ...restIds] = layer ? Object.keys(layer.values) : [];
		const baseOpacity: number | ExpressionSpecification = firstId
			? [
					"match",
					["get", "id"],
					firstId,
					qualityOpacity(firstId),
					...restIds.flatMap((id) => [id, qualityOpacity(id)]),
					0.5,
				]
			: 0.92;
		if (!matchIds) {
			map.setPaintProperty(fillLayer, "fill-opacity", baseOpacity);
			return;
		}
		const expression: ExpressionSpecification = [
			"case",
			["in", ["get", "id"], ["literal", matchIds]],
			baseOpacity,
			0.12,
		];
		map.setPaintProperty(fillLayer, "fill-opacity", expression);
	}, [matchIds, layer, status]);

	useEffect(() => {
		const map = mapRef.current;
		if (status !== "ready" || !map?.getLayer(airportLayer)) return;
		if (infrastructure)
			map
				.getSource<GeoJSONSource>(airportLayer)
				?.setData(infrastructure.points);
		else popupRef.current?.remove();
		map.setLayoutProperty(
			airportLayer,
			"visibility",
			infrastructure ? "visible" : "none",
		);
	}, [infrastructure, status]);

	return (
		<>
			<div
				className="province-map"
				ref={container}
				role="region"
				aria-label={t("map.aria")}
				data-map-status={status}
			/>
			{status !== "ready" && (
				<p className="province-map-status" role="status">
					{status === "loading"
						? t("map.loading")
						: status === "empty"
							? t("map.empty")
							: t("map.unavailable")}
				</p>
			)}
			{dataset && (
				<div className="province-map-credit">
					<a href={dataset.source.url ?? undefined}>
						{dataset.source.publisher} · {dataset.version}
					</a>
					{dataset.source.license === "CC BY 3.0 IGO" ? (
						<a href="https://creativecommons.org/licenses/by/3.0/igo/">
							CC BY 3.0 IGO
						</a>
					) : (
						<span>{dataset.source.license}</span>
					)}
					<span>{t("map.simplified")}</span>
				</div>
			)}
		</>
	);
}
