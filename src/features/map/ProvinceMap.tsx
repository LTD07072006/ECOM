"use client";

import type { FeatureCollection, LineString, Point, Polygon } from "geojson";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
	ExpressionSpecification,
	GeoJSONSource,
	LngLatBounds as LngLatBoundsType,
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
import type {
	MicroLocationPointProperties,
	MicroZonePolygonProperties,
	ProvinceRoadProperties,
} from "./province-detail-locations";
import { useI18n } from "../../lib/i18n/provider";
import {
	toDistrictBoundaryGeoJson,
	type DistrictBoundary,
	type ProvinceDistrictProfile,
} from "./province-districts";

const provinceSource = "provinces";
const fillLayer = "province-fill";
const outlineLayer = "province-outline";
const districtSource = "selected-sub-area";
const streetBasemapSource = "osm-street-tiles";
const streetBasemapLayer = "street-basemap";
const airportLayer = "civil-airports";
const microLocationLayer = "province-micro-locations";
const zoneFootprintsSource = "province-zone-footprints";
const zoneBoundaryFillLayer = "province-zone-boundary-fill";
const zoneBoundaryLineLayer = "province-zone-boundary-line";
const buildingBlocksFillLayer = "province-building-blocks-fill";
const buildingBlocksLineLayer = "province-building-blocks-line";
const roadNetworkSource = "province-road-network";
const roadCasingLayer = "province-roads-casing";
const roadLineLayer = "province-roads-line";
const baseFill = "#38615b";

export type FocusedMicroLocation = MicroLocationPointProperties & {
	longitude: number;
	latitude: number;
};

export function ProvinceMap({
	selectedId,
	regionIds = [],
	onSelect,
	layer,
	matchIds,
	infrastructure,
	microLocations = null,
	zoneFootprints = null,
	roadNetwork = null,
	focusedLocation = null,
	district = null,
	onResetProvince,
}: {
	selectedId: string | null;
	regionIds?: string[];
	onSelect: (id: string) => void;
	layer: StatisticalLayer | null;
	matchIds: string[] | null;
	infrastructure: InfrastructureLayer | null;
	microLocations?: FeatureCollection<
		Point,
		MicroLocationPointProperties
	> | null;
	zoneFootprints?: FeatureCollection<
		Polygon,
		MicroZonePolygonProperties
	> | null;
	roadNetwork?: FeatureCollection<LineString, ProvinceRoadProperties> | null;
	focusedLocation?: FocusedMicroLocation | null;
	district?: ProvinceDistrictProfile | null;
	onResetProvince?: () => void;
}) {
	const { t } = useI18n();
	const tRef = useRef(t);
	tRef.current = t;
	const container = useRef<HTMLDivElement>(null);
	const mapRef = useRef<MapLibreMap | null>(null);
	const popupCtorRef = useRef<typeof MapPopup | null>(null);
	const boundsCtorRef = useRef<typeof LngLatBoundsType | null>(null);
	const featuresRef = useRef<ProvinceMapData["features"]>([]);
	const countryBoundsRef = useRef<LngLatBoundsType | null>(null);
	const previousIds = useRef<string[]>([]);
	const onSelectRef = useRef(onSelect);
	onSelectRef.current = onSelect;
	const popupRef = useRef<MapPopup | null>(null);
	const [dataset, setDataset] = useState<DatasetMetadata | null>(null);
	const [streetMode, setStreetMode] = useState(true);
	const [status, setStatus] = useState<
		"loading" | "empty" | "unavailable" | "ready"
	>("loading");

	const openMicroLocationPopup = useCallback(
		(
			view: MapLibreMap,
			PopupClass: typeof MapPopup,
			item: MicroLocationPointProperties & { blockLabel?: string },
			longitude: number,
			latitude: number,
		) => {
			const content = document.createElement("div");
			content.className = "airport-popup micro-location-popup";

			const badge = document.createElement("span");
			badge.className = `micro-popup-badge ${item.category}`;
			badge.textContent =
				item.category === "industrial_zone"
					? t("micro.badgeIndustrial")
					: item.category === "residential_zone"
						? t("micro.badgeResidential")
						: t("micro.badgeLogistics");

			const title = document.createElement("strong");
			const displayTitle =
				item.blockLabel && item.blockLabel !== item.name
					? item.blockLabel
					: item.code
						? `${item.name} (${item.code})`
						: item.name;
			title.textContent = displayTitle;

			const district = document.createElement("p");
			district.className = "micro-popup-district";
			district.textContent = `${item.district} · ${item.province}`;

			const scale = document.createElement("p");
			scale.textContent = item.scaleSummary;

			const highlight = document.createElement("p");
			highlight.textContent = item.highlightMetric;

			const fit = document.createElement("p");
			fit.className = "micro-popup-fit";
			fit.textContent = item.targetFit;

			content.append(badge, title, district, scale, highlight, fit);

			const url = typeof item.url === "string" ? safeSourceUrl(item.url) : null;
			if (url) {
				const source = document.createElement("a");
				source.textContent = t("infra.sourceRecord");
				source.href = url;
				source.target = "_blank";
				source.rel = "noopener noreferrer";
				content.append(source);
			}
			popupRef.current?.remove();
			popupRef.current = new PopupClass({ maxWidth: "295px" })
				.setLngLat([longitude, latitude])
				.setDOMContent(content)
				.addTo(view);
		},
		[t],
	);
	const openPopupRef = useRef(openMicroLocationPopup);
	openPopupRef.current = openMicroLocationPopup;

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
			popupCtorRef.current = Popup;
			boundsCtorRef.current = LngLatBounds;
			featuresRef.current = result.data.features;

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
			countryBoundsRef.current = bounds;

			let mapStyle: string | Record<string, unknown> = {
				version: 8,
				sources: {
					[streetBasemapSource]: {
						type: "raster",
						tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
						tileSize: 256,
						maxzoom: 19,
					},
				},
				layers: [
					{
						id: "water",
						type: "background",
						paint: { "background-color": "#132e2c" },
					},
					{
						id: streetBasemapLayer,
						type: "raster",
						source: streetBasemapSource,
						paint: {
							"raster-opacity": 0,
							"raster-fade-duration": 150,
						},
					},
				],
			};
			try {
				const styleRes = await fetch(
					"https://tiles.openfreemap.org/styles/bright",
					{ signal: request.signal },
				);
				if (styleRes.ok) {
					const fetched = (await styleRes.json()) as Record<string, unknown>;
					delete fetched.center;
					delete fetched.zoom;
					mapStyle = fetched;
				}
			} catch {
				// Fallback to inline style if offline
			}

			const view = new MapView({
				container: container.current,
				style: mapStyle as never,
				bounds,
				maxBounds: [
					[97, 5],
					[122, 26],
				],
				fitBoundsOptions: { padding: 28, duration: 0 },
				maxZoom: 18,
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
						id: outlineLayer,
						type: "line",
						source: provinceSource,
						paint: { "line-color": "#a4cebf", "line-width": 1.2 },
					});

					// Zone Master-Plan Footprints & Building Blocks (KCN & Khu dân cư)
					view.addSource(zoneFootprintsSource, {
						type: "geojson",
						data: { type: "FeatureCollection", features: [] },
					});
					view.addLayer({
						id: zoneBoundaryFillLayer,
						type: "fill",
						source: zoneFootprintsSource,
						filter: ["==", ["get", "featureKind"], "zone_boundary"],
						layout: { visibility: "none" },
						paint: {
							"fill-color": [
								"match",
								["get", "category"],
								"industrial_zone",
								"#e8590c",
								"residential_zone",
								"#099268",
								"#f08c00",
							],
							"fill-opacity": 0.06,
						},
					});
					view.addLayer({
						id: zoneBoundaryLineLayer,
						type: "line",
						source: zoneFootprintsSource,
						filter: ["==", ["get", "featureKind"], "zone_boundary"],
						layout: { visibility: "none" },
						paint: {
							"line-color": [
								"match",
								["get", "category"],
								"industrial_zone",
								"#d9480f",
								"residential_zone",
								"#087f5b",
								"#e67700",
							],
							"line-width": 2.8,
							"line-dasharray": [3, 1.5],
						},
					});
					view.addLayer({
						id: buildingBlocksFillLayer,
						type: "fill",
						source: zoneFootprintsSource,
						filter: ["==", ["get", "featureKind"], "building_block"],
						layout: { visibility: "none" },
						paint: {
							"fill-color": [
								"match",
								["get", "category"],
								"industrial_zone",
								"#e8590c",
								"residential_zone",
								"#0ca678",
								"#f08c00",
							],
							"fill-opacity": 0.84,
						},
					});
					view.addLayer({
						id: buildingBlocksLineLayer,
						type: "line",
						source: zoneFootprintsSource,
						filter: ["==", ["get", "featureKind"], "building_block"],
						layout: { visibility: "none" },
						paint: {
							"line-color": "#121c1a",
							"line-width": 1.2,
						},
					});

					// Province Road Network (Expressways, Arterials & Internal Zone Streets)
					view.addSource(roadNetworkSource, {
						type: "geojson",
						data: { type: "FeatureCollection", features: [] },
					});
					view.addLayer({
						id: roadCasingLayer,
						type: "line",
						source: roadNetworkSource,
						layout: {
							visibility: "none",
							"line-cap": "round",
							"line-join": "round",
						},
						paint: {
							"line-color": "#121c1a",
							"line-width": [
								"match",
								["get", "roadClass"],
								"highway",
								6.5,
								"arterial",
								4.4,
								2.6,
							],
							"line-opacity": 0.92,
						},
					});
					view.addLayer({
						id: roadLineLayer,
						type: "line",
						source: roadNetworkSource,
						layout: {
							visibility: "none",
							"line-cap": "round",
							"line-join": "round",
						},
						paint: {
							"line-color": [
								"match",
								["get", "roadClass"],
								"highway",
								"#fab005",
								"arterial",
								"#fd7e14",
								"#ffffff",
							],
							"line-width": [
								"match",
								["get", "roadClass"],
								"highway",
								4,
								"arterial",
								2.5,
								1.4,
							],
							"line-opacity": 0.98,
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
					view.addSource(microLocationLayer, {
						type: "geojson",
						data: { type: "FeatureCollection", features: [] },
					});
					view.addLayer({
						id: microLocationLayer,
						type: "circle",
						source: microLocationLayer,
						layout: { visibility: "none" },
						paint: {
							"circle-radius": [
								"match",
								["get", "category"],
								"industrial_zone",
								7.5,
								"residential_zone",
								7.5,
								6.8,
							],
							"circle-color": [
								"match",
								["get", "category"],
								"industrial_zone",
								"#f78154",
								"residential_zone",
								"#2ec4b6",
								"logistics_hub",
								"#ffd166",
								"#f78154",
							],
							"circle-stroke-color": "#ffffff",
							"circle-stroke-width": 2.2,
						},
					});

					view.on("click", microLocationLayer, (event) => {
						const feature = event.features?.[0];
						if (!feature || feature.geometry.type !== "Point") return;
						const item =
							feature.properties as unknown as MicroLocationPointProperties;
						const [longitude, latitude] = feature.geometry.coordinates;
						openPopupRef.current(view, Popup, item, longitude, latitude);
					});

					for (const zoneLayer of [
						buildingBlocksFillLayer,
						zoneBoundaryFillLayer,
					]) {
						view.on("click", zoneLayer, (event) => {
							const feature = event.features?.[0];
							if (!feature) return;
							const item =
								feature.properties as unknown as MicroZonePolygonProperties;
							openPopupRef.current(
								view,
								Popup,
								item,
								event.lngLat.lng,
								event.lngLat.lat,
							);
						});
					}

					view.on("click", roadLineLayer, (event) => {
						const feature = event.features?.[0];
						if (!feature) return;
						const item =
							feature.properties as unknown as ProvinceRoadProperties;
						const content = document.createElement("div");
						content.className = "airport-popup micro-location-popup";
						const title = document.createElement("strong");
						title.textContent = item.name;
						content.append(title);
						popupRef.current?.remove();
						popupRef.current = new Popup({ maxWidth: "250px" })
							.setLngLat([event.lngLat.lng, event.lngLat.lat])
							.setDOMContent(content)
							.addTo(view);
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
						const hitLayers: string[] = [];
						for (const candidateLayer of [
							microLocationLayer,
							buildingBlocksFillLayer,
							zoneBoundaryFillLayer,
							roadLineLayer,
							airportLayer,
						]) {
							if (
								view.getLayer(candidateLayer) &&
								view.getLayoutProperty(candidateLayer, "visibility") ===
									"visible"
							) {
								hitLayers.push(candidateLayer);
							}
						}
						if (
							hitLayers.length > 0 &&
							view.queryRenderedFeatures(event.point, {
								layers: hitLayers,
							}).length
						)
							return;
						const id = event.features?.[0]?.properties.id;
						if (typeof id === "string") onSelectRef.current(id);
					});
					for (const interactiveLayer of [
						fillLayer,
						airportLayer,
						microLocationLayer,
						buildingBlocksFillLayer,
						zoneBoundaryFillLayer,
						roadLineLayer,
					]) {
						view.on("mouseenter", interactiveLayer, () => {
							view.getCanvas().style.cursor = "pointer";
						});
						view.on("mouseleave", interactiveLayer, () => {
							view.getCanvas().style.cursor = "";
						});
					}
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

		const BoundsClass = boundsCtorRef.current;
		if (!BoundsClass) return;
		if (selectedId) {
			const feature = featuresRef.current.find(
				(item) => item.properties.id === selectedId,
			);
			if (feature) {
				const provBounds = new BoundsClass();
				const polygons =
					feature.geometry.type === "MultiPolygon"
						? feature.geometry.coordinates
						: [feature.geometry.coordinates];
				for (const polygon of polygons) {
					for (const [longitude, latitude] of polygon[0]) {
						provBounds.extend([longitude, latitude]);
					}
				}
				map.fitBounds(provBounds, {
					padding: 56,
					maxZoom: 11,
					duration: 450,
				});
			}
		} else if (countryBoundsRef.current) {
			popupRef.current?.remove();
			map.fitBounds(countryBoundsRef.current, {
				padding: 28,
				duration: 400,
			});
		}
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

		const showDetailStreets = Boolean(selectedId && streetMode);
		if (map.getLayer(streetBasemapLayer)) {
			map.setPaintProperty(
				streetBasemapLayer,
				"raster-opacity",
				showDetailStreets ? 1 : 0,
			);
		}
		if (map.getLayer(outlineLayer)) {
			map.setPaintProperty(
				outlineLayer,
				"line-width",
				showDetailStreets ? 3 : 1.2,
			);
			map.setPaintProperty(
				outlineLayer,
				"line-color",
				showDetailStreets ? "#d9480f" : "#a4cebf",
			);
		}

		if (showDetailStreets && selectedId) {
			// 0% tint inside the selected province so streets, road labels, and building blocks are 100% sharp
			map.setPaintProperty(fillLayer, "fill-opacity", [
				"case",
				["==", ["get", "id"], selectedId],
				0,
				0.18,
			]);
			return;
		}

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
	}, [matchIds, layer, status, selectedId, streetMode]);

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

	useEffect(() => {
		const map = mapRef.current;
		if (status !== "ready" || !map?.getLayer(microLocationLayer)) return;
		const hasPoints = Boolean(
			microLocations && microLocations.features.length > 0,
		);
		if (hasPoints && microLocations) {
			map.getSource<GeoJSONSource>(microLocationLayer)?.setData(microLocations);
		} else {
			map
				.getSource<GeoJSONSource>(microLocationLayer)
				?.setData({ type: "FeatureCollection", features: [] });
		}
		map.setLayoutProperty(
			microLocationLayer,
			"visibility",
			hasPoints ? "visible" : "none",
		);
	}, [microLocations, status]);

	useEffect(() => {
		const map = mapRef.current;
		if (status !== "ready" || !map?.getSource(zoneFootprintsSource)) return;
		const hasZones = Boolean(
			zoneFootprints && zoneFootprints.features.length > 0,
		);
		map
			.getSource<GeoJSONSource>(zoneFootprintsSource)
			?.setData(
				hasZones && zoneFootprints
					? zoneFootprints
					: { type: "FeatureCollection", features: [] },
			);
		for (const layerId of [
			zoneBoundaryFillLayer,
			zoneBoundaryLineLayer,
			buildingBlocksFillLayer,
			buildingBlocksLineLayer,
		]) {
			if (map.getLayer(layerId)) {
				map.setLayoutProperty(
					layerId,
					"visibility",
					hasZones ? "visible" : "none",
				);
			}
		}
	}, [zoneFootprints, status]);

	useEffect(() => {
		const map = mapRef.current;
		if (status !== "ready" || !map?.getSource(roadNetworkSource)) return;
		const hasRoads = Boolean(roadNetwork && roadNetwork.features.length > 0);
		map
			.getSource<GeoJSONSource>(roadNetworkSource)
			?.setData(
				hasRoads && roadNetwork
					? roadNetwork
					: { type: "FeatureCollection", features: [] },
			);
		for (const layerId of [roadCasingLayer, roadLineLayer]) {
			if (map.getLayer(layerId)) {
				map.setLayoutProperty(
					layerId,
					"visibility",
					hasRoads ? "visible" : "none",
				);
			}
		}
	}, [roadNetwork, status]);

	useEffect(() => {
		const map = mapRef.current;
		if (!map || status !== "ready") return;
		if (!map.getSource(districtSource)) {
			map.addSource(districtSource, {
				type: "geojson",
				data: toDistrictBoundaryGeoJson(),
			});
			map.addLayer(
				{
					id: districtSource,
					type: "line",
					source: districtSource,
					paint: { "line-color": "#087b75", "line-width": 4 },
				},
				microLocationLayer,
			);
		}
		const source = map.getSource<GeoJSONSource>(districtSource);
		source?.setData(toDistrictBoundaryGeoJson());
		if (!district || !selectedId) return;
		popupRef.current?.remove();
		const request = new AbortController();
		if (district.longitude !== null && district.latitude !== null)
			map.flyTo({
				center: [district.longitude, district.latitude],
				zoom: 13.5,
			});
		if (district.scope === "current") {
			void fetch(
				`/api/geographies/${encodeURIComponent(selectedId)}/districts?unit=${encodeURIComponent(district.id)}`,
				{ signal: request.signal },
			)
				.then(async (response) => {
					if (!response.ok) return;
					const result: { data: DistrictBoundary | null } =
						await response.json();
					if (!request.signal.aborted)
						source?.setData(toDistrictBoundaryGeoJson(district, result.data));
				})
				.catch(() => {});
		}
		return () => request.abort();
	}, [district, selectedId, status]);

	useEffect(() => {
		const map = mapRef.current;
		const PopupClass = popupCtorRef.current;
		if (status !== "ready" || !map || !PopupClass || !focusedLocation) return;
		map.flyTo({
			center: [focusedLocation.longitude, focusedLocation.latitude],
			zoom: 14,
			duration: 450,
		});
		openMicroLocationPopup(
			map,
			PopupClass,
			focusedLocation,
			focusedLocation.longitude,
			focusedLocation.latitude,
		);
	}, [focusedLocation, status, openMicroLocationPopup]);

	return (
		<>
			<div
				className="province-map"
				ref={container}
				role="region"
				aria-label={t("map.aria")}
				data-map-status={status}
			/>
			{selectedId && status === "ready" && (
				<div className="province-map-overlay-bar">
					{onResetProvince && (
						<button
							type="button"
							className="map-reset-view-btn"
							onClick={() => {
								popupRef.current?.remove();
								onResetProvince();
							}}
						>
							← {t("micro.resetVietnamMap")}
						</button>
					)}
					<button
						type="button"
						className="map-reset-view-btn"
						aria-pressed={streetMode}
						onClick={() => setStreetMode((current) => !current)}
					>
						{streetMode
							? t("micro.streetModeActive")
							: t("micro.choroplethModeActive")}
					</button>
					<aside
						className="micro-map-legend"
						aria-label={t("micro.legendAria")}
					>
						<span>
							<i className="micro-dot industrial_zone" aria-hidden="true" />
							{t("micro.badgeIndustrial")}
						</span>
						<span>
							<i className="micro-dot residential_zone" aria-hidden="true" />
							{t("micro.badgeResidential")}
						</span>
						<span>
							<i className="micro-dot logistics_hub" aria-hidden="true" />
							{t("micro.badgeLogistics")}
						</span>
						<span>
							<i className="micro-road-line" aria-hidden="true" />
							{t("micro.badgeRoadBlocks")}
						</span>
					</aside>
				</div>
			)}
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
