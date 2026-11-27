"use client";

import "wemap-gl-js/dist/wemap-gl.css";
import type { FeatureCollection, LineString, Point } from "geojson";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import type wemap from "wemap-gl-js";
import type { StyleSpecification } from "wemap-gl-js";
import { useI18n } from "../../lib/i18n/provider";
import type { LogisticsOverview } from "../map/logistics-overview";
import type { RouteAssessment } from "./route-assessment";
import type { SiteContextProperties } from "./site-context";
import {
	createPinnedCandidate,
	type SiteVisitCandidate,
} from "./site-visit-state";

type WemapMap = InstanceType<typeof wemap.Map>;
type WemapMarker = InstanceType<typeof wemap.Marker>;
const wemapStyle = "/api/site-visit/wemap/style.json";

function fallbackStyle(): StyleSpecification {
	return {
		version: 8,
		sources: {
			osm: {
				type: "raster",
				tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
				tileSize: 256,
				maxzoom: 19,
				attribution:
					'<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>',
			},
		},
		layers: [{ id: "osm", type: "raster", source: "osm" }],
	};
}

async function loadWemapStyle(
	signal: AbortSignal,
): Promise<StyleSpecification> {
	const options = {
		signal: AbortSignal.any([signal, AbortSignal.timeout(8_000)]),
	};
	const response = await fetch(wemapStyle, options);
	if (!response.ok) throw new Error("WeMap style is unavailable");
	const style = (await response.json()) as StyleSpecification;
	if (
		style.version !== 8 ||
		!style.sources ||
		!Array.isArray(style.layers) ||
		!style.layers.length
	)
		throw new Error("Invalid WeMap style");
	// The WeMap SDK parses sprite and glyph URLs before making a request.
	if (typeof style.sprite === "string" && style.sprite.startsWith("/"))
		style.sprite = `${window.location.origin}${style.sprite}`;
	if (style.glyphs?.startsWith("/"))
		style.glyphs = `${window.location.origin}${style.glyphs}`;
	await Promise.all(
		Object.entries(style.sources).map(async ([id, source]) => {
			if (
				source.type !== "vector" ||
				!source.url?.startsWith("/api/site-visit/wemap/data/")
			)
				return;
			const metadata = await fetch(source.url, options);
			if (!metadata.ok) throw new Error("WeMap tile metadata is unavailable");
			const { tiles, bounds, minzoom, maxzoom } = await metadata.json();
			if (!Array.isArray(tiles) || !tiles.length)
				throw new Error("Invalid WeMap tile metadata");
			style.sources[id] = {
				type: "vector",
				bounds,
				minzoom,
				maxzoom,
				tiles: tiles.map((path: string) => `${window.location.origin}${path}`),
			};
		}),
	);
	return style;
}

export function SiteVisitMap({
	wemapEnabled,
	candidate,
	context,
	route,
	network,
	selectedDestinationCode,
	onCandidateChange,
	onDestinationSelect,
	onContextSelect,
}: {
	wemapEnabled: boolean;
	candidate: SiteVisitCandidate | null;
	context: FeatureCollection<Point, SiteContextProperties>;
	route: RouteAssessment | null;
	network: LogisticsOverview | null;
	selectedDestinationCode: string | null;
	onCandidateChange: (candidate: SiteVisitCandidate) => void;
	onDestinationSelect: (destinationCode: string) => void;
	onContextSelect: (properties: SiteContextProperties) => void;
}) {
	const { t } = useI18n();
	const [status, setStatus] = useState<"loading" | "ready" | "unavailable">(
		"loading",
	);
	const [provider, setProvider] = useState<"wemap" | "openstreetmap">(
		"openstreetmap",
	);
	const container = useRef<HTMLDivElement>(null);
	const mapRef = useRef<WemapMap>(null);
	const candidateMarker = useRef<WemapMarker>(null);
	const networkMarkers = useRef<WemapMarker[]>([]);
	const networkRenderVersion = useRef(0);
	const contextRef = useRef(context);
	const candidateRef = useRef(candidate);
	const onCandidateChangeRef = useRef(onCandidateChange);
	const onDestinationSelectRef = useRef(onDestinationSelect);
	const onContextSelectRef = useRef(onContextSelect);
	contextRef.current = context;
	candidateRef.current = candidate;
	onCandidateChangeRef.current = onCandidateChange;
	onDestinationSelectRef.current = onDestinationSelect;
	onContextSelectRef.current = onContextSelect;
	useEffect(() => {
		const request = new AbortController();
		let loadTimer: ReturnType<typeof setTimeout> | undefined;
		setStatus("loading");
		const styleRequest = wemapEnabled
			? loadWemapStyle(request.signal).catch(() => null)
			: Promise.resolve(null);
		void Promise.all([import("wemap-gl-js"), styleRequest])
			.then(([{ default: wemap }, style]) => {
				if (request.signal.aborted || !container.current) return;
				let usingWemap = Boolean(style);
				setProvider(usingWemap ? "wemap" : "openstreetmap");
				const initialSite = candidateRef.current;
				const map = new wemap.Map({
					container: container.current,
					style: style ?? fallbackStyle(),
					center: initialSite
						? [initialSite.longitude, initialSite.latitude]
						: [105.8542, 21.0285],
					zoom: initialSite ? 11 : 6,
				});
				mapRef.current = map;
				map.addControl(
					new wemap.NavigationControl({ showCompass: false }),
					"top-right",
				);
				const onTimeout = () => {
					if (!usingWemap) {
						setStatus("unavailable");
						return;
					}
					usingWemap = false;
					setProvider("openstreetmap");
					map.setStyle(fallbackStyle(), {
						diff: false,
						localFontFamily: null,
						localIdeographFontFamily: "sans-serif",
					});
					loadTimer = setTimeout(onTimeout, 10_000);
				};
				loadTimer = setTimeout(onTimeout, 10_000);
				map.on("style.load", () => {
					clearTimeout(loadTimer);
					map.addSource("site-visit-context", {
						type: "geojson",
						data: contextRef.current,
					});
					map.addLayer({
						id: "site-visit-context",
						type: "circle",
						source: "site-visit-context",
						paint: {
							"circle-radius": 6,
							"circle-color": [
								"match",
								["get", "kind"],
								"airport",
								"#26406B",
								"seaport",
								"#3E7C67",
								"industrial_park",
								"#B5432F",
								"icd",
								"#E0AE3A",
								"#1C1C1A",
							],
							"circle-stroke-width": 2,
							"circle-stroke-color": "#FAFAF7",
						},
					});
					map.on("click", "site-visit-context", (event: unknown) => {
						const features =
							typeof event === "object" && event !== null && "features" in event
								? (event as { features?: Array<{ properties?: unknown }> })
										.features
								: undefined;
						const feature = features?.[0];
						if (feature?.properties)
							onContextSelectRef.current(
								feature.properties as SiteContextProperties,
							);
					});
					map.on("click", (event) => {
						const layers = [
							"site-visit-context",
							"site-visit-network-routes",
						].filter((id) => map.getLayer(id));
						const features = layers.length
							? map.queryRenderedFeatures(event.point, { layers })
							: [];
						const routeFeature = features.find(
							(feature) => feature.layer?.id === "site-visit-network-routes",
						);
						const destinationCode = routeFeature?.properties?.destinationCode;
						if (typeof destinationCode === "string") {
							onDestinationSelectRef.current(destinationCode);
							return;
						}
						if (features.length > 0) return;
						onCandidateChangeRef.current(
							createPinnedCandidate(event.lngLat.lng, event.lngLat.lat),
						);
					});
					setStatus("ready");
				});
			})
			.catch(() => {
				if (!request.signal.aborted) setStatus("unavailable");
			});
		return () => {
			request.abort();
			clearTimeout(loadTimer);
			networkRenderVersion.current += 1;
			for (const marker of networkMarkers.current) marker.remove();
			networkMarkers.current = [];
			candidateMarker.current?.remove();
			mapRef.current?.remove();
			mapRef.current = null;
		};
	}, [wemapEnabled]);
	useEffect(() => {
		const map = mapRef.current;
		const source = map?.getSource("site-visit-context");
		if (source && "setData" in source) source.setData(context);
	}, [context]);
	useEffect(() => {
		if (status !== "ready") return;
		let cancelled = false;
		void import("wemap-gl-js").then(({ default: wemap }) => {
			const map = mapRef.current;
			if (cancelled || !map) return;
			candidateMarker.current?.remove();
			if (!candidate) return;
			candidateMarker.current = new wemap.Marker({
				color: "#B5432F",
				draggable: true,
				className: "site-visit-candidate-marker",
			})
				.setLngLat([candidate.longitude, candidate.latitude])
				.addTo(map);
			candidateMarker.current.on("dragend", () => {
				const position = candidateMarker.current?.getLngLat();
				if (!position) return;
				onCandidateChangeRef.current({
					label: candidateRef.current?.label ?? "Pinned location",
					longitude: position.lng,
					latitude: position.lat,
				});
			});
			map.flyTo({
				center: [candidate.longitude, candidate.latitude],
				zoom: 11,
			});
		});
		return () => {
			cancelled = true;
		};
	}, [candidate, status]);
	useEffect(() => {
		const map = mapRef.current;
		if (!map || status !== "ready") return;
		if (route) addRoute(map, route.geometry);
		else {
			const source = map.getSource("site-visit-route");
			if (source && "setData" in source)
				source.setData({ type: "FeatureCollection", features: [] });
		}
	}, [route, status]);
	useEffect(() => {
		const map = mapRef.current;
		if (!map || status !== "ready") return;
		if (network) {
			addNetwork(
				map,
				network,
				networkMarkers,
				networkRenderVersion,
				mapRef,
				selectedDestinationCode,
			);
			return;
		}
		networkRenderVersion.current += 1;
		for (const marker of networkMarkers.current) marker.remove();
		networkMarkers.current = [];
		const source = map.getSource("site-visit-network-routes");
		if (source && "setData" in source)
			source.setData({ type: "FeatureCollection", features: [] });
	}, [network, selectedDestinationCode, status]);
	return (
		<>
			<div
				ref={container}
				className="site-visit-map"
				role="img"
				aria-label="Site visit map"
				data-map-status={status}
				data-map-provider={provider}
				data-selected-destination={selectedDestinationCode ?? undefined}
			/>
			{(status !== "ready" || provider === "openstreetmap") && (
				<p className="site-visit-map-status" role="status">
					{t(
						status === "loading"
							? "siteVisit.mapLoading"
							: status === "unavailable"
								? "siteVisit.mapUnavailable"
								: "siteVisit.mapFallback",
					)}
				</p>
			)}
			{status === "ready" && (
				<p className="site-visit-map-hint">
					Click the map to place a survey point. Drag the pin to adjust it.
				</p>
			)}
		</>
	);
}

function addRoute(map: WemapMap, geometry: LineString) {
	const data: FeatureCollection<LineString> = {
		type: "FeatureCollection",
		features: [{ type: "Feature", properties: {}, geometry }],
	};
	if (map.getLayer("site-visit-route")) map.removeLayer("site-visit-route");
	if (map.getSource("site-visit-route")) map.removeSource("site-visit-route");
	map.addSource("site-visit-route", { type: "geojson", data });
	map.addLayer({
		id: "site-visit-route",
		type: "line",
		source: "site-visit-route",
		paint: { "line-color": "#26406B", "line-width": 5, "line-opacity": 0.9 },
	});
}

function addNetwork(
	map: WemapMap,
	network: LogisticsOverview,
	networkMarkers: React.MutableRefObject<WemapMarker[]>,
	networkRenderVersion: React.MutableRefObject<number>,
	mapRef: React.MutableRefObject<WemapMap | null>,
	selectedDestinationCode: string | null,
) {
	const renderVersion = ++networkRenderVersion.current;
	void import("wemap-gl-js").then(({ default: wemap }) => {
		if (
			renderVersion !== networkRenderVersion.current ||
			map !== mapRef.current
		)
			return;
		for (const marker of networkMarkers.current) marker.remove();
		networkMarkers.current = network.markers.features.map((feature) => {
			const [longitude, latitude] = feature.geometry.coordinates;
			const marker = new wemap.Marker({
				color: feature.properties.role === "origin" ? "#B5432F" : "#3E7C67",
			})
				.setLngLat([longitude, latitude])
				.addTo(map);
			return marker;
		});
	});
	const sourceId = "site-visit-network-routes";
	const layerId = "site-visit-network-routes";
	const source = map.getSource(sourceId);
	const data: FeatureCollection<
		LineString,
		{
			destinationCode: string;
			status: "live" | "baseline";
			selected: boolean;
		}
	> = {
		type: "FeatureCollection",
		features: network.routeFeatures.features.map((feature) => ({
			...feature,
			properties: {
				...feature.properties,
				selected:
					feature.properties.destinationCode === selectedDestinationCode,
			},
		})),
	};
	if (source && "setData" in source) {
		source.setData(data);
	} else {
		map.addSource(sourceId, { type: "geojson", data });
		map.addLayer({
			id: layerId,
			type: "line",
			source: sourceId,
			paint: {
				"line-color": [
					"case",
					["boolean", ["get", "selected"], false],
					"#B5432F",
					["match", ["get", "status"], "baseline", "#E0AE3A", "#26406B"],
				],
				"line-width": ["case", ["boolean", ["get", "selected"], false], 6, 3],
				"line-opacity": 0.7,
			},
		});
	}
	const selectedFeature = data.features.find(
		(feature) => feature.properties.destinationCode === selectedDestinationCode,
	);
	if (selectedFeature) {
		const coordinates = selectedFeature.geometry.coordinates;
		const longitudes = coordinates.map(([longitude]) => longitude);
		const latitudes = coordinates.map(([, latitude]) => latitude);
		const minLongitude = Math.min(...longitudes);
		const maxLongitude = Math.max(...longitudes);
		const minLatitude = Math.min(...latitudes);
		const maxLatitude = Math.max(...latitudes);
		map.fitBounds(
			[
				[minLongitude, minLatitude],
				[maxLongitude, maxLatitude],
			],
			{ padding: 72, maxZoom: 12, duration: 500 },
		);
	}
}
