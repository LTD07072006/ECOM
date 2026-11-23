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
	infrastructureKindColors,
	layerColor,
	mapCanvasColors,
	missingColor,
	type InfrastructureLayer,
	type StatisticalLayer,
} from "./layers";
import { useI18n } from "../../lib/i18n/provider";

const provinceSource = "provinces";
const hatchLayer = "province-missing-hatch";
const fillLayer = "province-fill";
const outlineLayer = "province-outline";
const focusOutlineLayer = "province-focus-outline";
const airportLayer = "civil-airports";
const hatchPatternId = "missing-hatch";
const maplibrePromise =
	typeof window !== "undefined" ? import("maplibre-gl") : null;

function createHatchPatternData(): {
	width: number;
	height: number;
	data: Uint8ClampedArray;
} {
	const size = 8;
	const canvas = document.createElement("canvas");
	canvas.width = size;
	canvas.height = size;
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		return {
			width: size,
			height: size,
			data: new Uint8ClampedArray(size * size * 4),
		};
	}
	ctx.fillStyle = mapCanvasColors.ground;
	ctx.fillRect(0, 0, size, size);
	ctx.strokeStyle = mapCanvasColors.ink;
	ctx.lineWidth = 1.4;
	ctx.beginPath();
	ctx.moveTo(-1, size - 1);
	ctx.lineTo(size - 1, -1);
	ctx.moveTo(0, size);
	ctx.lineTo(size, 0);
	ctx.moveTo(1, size + 1);
	ctx.lineTo(size + 1, 1);
	ctx.stroke();
	const imageData = ctx.getImageData(0, 0, size, size);
	return {
		width: imageData.width,
		height: imageData.height,
		data: imageData.data,
	};
}

export function ProvinceMap({
	selectedId,
	hoveredId = null,
	shortlistIds = [],
	regionIds = [],
	onSelect,
	layer,
	matchIds,
	infrastructure,
}: {
	selectedId: string | null;
	hoveredId?: string | null;
	shortlistIds?: string[];
	regionIds?: string[];
	onSelect: (id: string) => void;
	layer: StatisticalLayer | null;
	matchIds: string[] | null;
	infrastructure: InfrastructureLayer | null;
}) {
	const { t } = useI18n();
	const container = useRef<HTMLDivElement>(null);
	const mapRef = useRef<MapLibreMap | null>(null);
	const previousSelectedIds = useRef<string[]>([]);
	const previousHoveredId = useRef<string | null>(null);
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
		let resizeObserver: ResizeObserver | null = null;

		async function mountMap() {
			const [response, maplibre] = await Promise.all([
				fetch("/api/map/provinces", {
					signal: request.signal,
				}),
				maplibrePromise ?? import("maplibre-gl"),
			]);
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
			} = maplibre;
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

			const reducedMotion = window.matchMedia(
				"(prefers-reduced-motion: reduce)",
			).matches;
			const transitionMs = reducedMotion ? 0 : 180;

			const fitPadding = () => {
				const width = container.current?.clientWidth ?? 0;
				return width > 0 && width < 500
					? { top: 10, right: 10, bottom: 56, left: 10 }
					: { top: 12, right: 12, bottom: 12, left: 12 };
			};

			const view = new MapView({
				container: container.current,
				style: {
					version: 8,
					sources: {},
					layers: [
						{
							id: "ground",
							type: "background",
							paint: { "background-color": mapCanvasColors.ground },
						},
					],
				},
				bounds,
				fitBoundsOptions: {
					padding: fitPadding(),
					duration: 0,
				},
				maxZoom: 11,
				dragRotate: false,
				renderWorldCopies: false,
				attributionControl: false,
				canvasContextAttributes: { preserveDrawingBuffer: true },
			});
			map = view;
			mapRef.current = view;
			view.touchZoomRotate.disableRotation();
			let userMoved = false;
			view.on("movestart", (event) => {
				if (event.originalEvent) {
					userMoved = true;
				}
			});
			if (typeof ResizeObserver !== "undefined" && container.current) {
				resizeObserver = new ResizeObserver(() => {
					if (request.signal.aborted || mapRef.current !== view) return;
					view.resize();
					if (!userMoved) {
						view.fitBounds(bounds, {
							padding: fitPadding(),
							duration: 0,
						});
					}
				});
				resizeObserver.observe(container.current);
			}
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
					if (!view.hasImage(hatchPatternId)) {
						view.addImage(hatchPatternId, createHatchPatternData());
					}
					view.addSource(provinceSource, {
						type: "geojson",
						data: result.data,
						promoteId: "id",
					});
					view.addLayer({
						id: hatchLayer,
						type: "fill",
						source: provinceSource,
						paint: {
							"fill-pattern": hatchPatternId,
							"fill-opacity": 0,
						},
					});
					view.addLayer({
						id: fillLayer,
						type: "fill",
						source: provinceSource,
						paint: {
							"fill-color": mapCanvasColors.ground,
							"fill-opacity": 0.92,
							"fill-color-transition": { duration: transitionMs, delay: 0 },
							"fill-opacity-transition": { duration: transitionMs, delay: 0 },
						},
					});
					view.addLayer({
						id: outlineLayer,
						type: "line",
						source: provinceSource,
						paint: {
							"line-color": mapCanvasColors.ink,
							"line-width": [
								"case",
								["boolean", ["feature-state", "selected"], false],
								3.2,
								2,
							],
						},
					});
					view.addLayer({
						id: focusOutlineLayer,
						type: "line",
						source: provinceSource,
						paint: {
							"line-color": mapCanvasColors.selectedStroke,
							"line-width": [
								"case",
								[
									"any",
									["boolean", ["feature-state", "selected"], false],
									["boolean", ["feature-state", "hovered"], false],
								],
								2.8,
								0,
							],
						},
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
							"circle-radius": 5.5,
							"circle-color": [
								"match",
								["get", "kind"],
								"airport",
								infrastructureKindColors.airport,
								"seaport",
								infrastructureKindColors.seaport,
								"industrial_park",
								infrastructureKindColors.industrial_park,
								"icd",
								infrastructureKindColors.icd,
								"expressway_node",
								infrastructureKindColors.expressway_node,
								infrastructureKindColors.airport,
							],
							"circle-stroke-color": mapCanvasColors.surface,
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
			resizeObserver?.disconnect();
			removeLifecycleListeners?.();
			map?.remove();
			mapRef.current = null;
			previousSelectedIds.current = [];
			previousHoveredId.current = null;
			popupRef.current = null;
		};
	}, []);

	useEffect(() => {
		const map = mapRef.current;
		if (status !== "ready" || !map?.getSource(provinceSource)) return;
		for (const id of previousSelectedIds.current) {
			map.setFeatureState({ source: provinceSource, id }, { selected: false });
		}
		const ids = [
			...new Set([
				...regionIds,
				...shortlistIds,
				...(selectedId ? [selectedId] : []),
			]),
		];
		for (const id of ids) {
			map.setFeatureState({ source: provinceSource, id }, { selected: true });
		}
		previousSelectedIds.current = ids;
	}, [selectedId, regionIds, shortlistIds, status]);

	useEffect(() => {
		const map = mapRef.current;
		if (status !== "ready" || !map?.getSource(provinceSource)) return;
		if (previousHoveredId.current) {
			map.setFeatureState(
				{ source: provinceSource, id: previousHoveredId.current },
				{ hovered: false },
			);
		}
		if (hoveredId) {
			map.setFeatureState(
				{ source: provinceSource, id: hoveredId },
				{ hovered: true },
			);
		}
		previousHoveredId.current = hoveredId;
	}, [hoveredId, status]);

	useEffect(() => {
		const map = mapRef.current;
		if (status !== "ready" || !map?.getLayer(fillLayer)) return;
		let colors: string | ExpressionSpecification = mapCanvasColors.ground;
		if (layer) {
			const bins = colorScale(layer);
			const entries = Object.entries(layer.values);
			colors = entries.length
				? ([
						"match",
						["get", "id"],
						...entries.flatMap(([id, value]) => [id, layerColor(value, bins)]),
						missingColor,
					] as unknown as ExpressionSpecification)
				: missingColor;
		}
		map.setPaintProperty(fillLayer, "fill-color", colors);
	}, [layer, status]);

	useEffect(() => {
		const map = mapRef.current;
		if (status !== "ready" || !map?.getLayer(fillLayer)) return;
		const isMissingFor = (id: string) => {
			if (!layer) return false;
			const val = layer.values[id];
			if (val === null || val === undefined) return true;
			const quality = layer.valueDetails?.[id]?.quality;
			return quality === "unavailable";
		};
		const baseOpacityFor = (id: string) => {
			if (!layer) return 0.92;
			if (isMissingFor(id)) return 0;
			const quality = layer.valueDetails?.[id]?.quality;
			if (quality === "supported") return 0.94;
			return 0.98;
		};
		const keys = layer ? Object.keys(layer.values) : [];
		const hatchOpacity: number | ExpressionSpecification =
			layer && keys.length
				? ([
						"match",
						["get", "id"],
						...keys.flatMap((id) => [id, isMissingFor(id) ? 1 : 0]),
						1,
					] as unknown as ExpressionSpecification)
				: 0;
		if (map.getLayer(hatchLayer)) {
			map.setPaintProperty(hatchLayer, "fill-opacity", hatchOpacity);
		}
		const baseOpacity: number | ExpressionSpecification = keys.length
			? ([
					"match",
					["get", "id"],
					...keys.flatMap((id) => [id, baseOpacityFor(id)]),
					0,
				] as unknown as ExpressionSpecification)
			: 0.92;

		if (matchIds) {
			const expression: ExpressionSpecification = [
				"case",
				["in", ["get", "id"], ["literal", matchIds]],
				baseOpacity,
				0.14,
			];
			map.setPaintProperty(fillLayer, "fill-opacity", expression);
			return;
		}

		const focusTarget = hoveredId ?? selectedId;
		if (focusTarget) {
			const expression: ExpressionSpecification = [
				"case",
				["==", ["get", "id"], focusTarget],
				baseOpacity,
				["case", ["==", baseOpacity, 0], 0, 0.38],
			];
			map.setPaintProperty(fillLayer, "fill-opacity", expression);
			return;
		}

		map.setPaintProperty(fillLayer, "fill-opacity", baseOpacity);
	}, [matchIds, hoveredId, selectedId, layer, status]);

	useEffect(() => {
		const map = mapRef.current;
		if (status !== "ready" || !map?.getLayer(airportLayer)) return;
		if (infrastructure) {
			map
				.getSource<GeoJSONSource>(airportLayer)
				?.setData(infrastructure.points);
		} else {
			popupRef.current?.remove();
		}
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
