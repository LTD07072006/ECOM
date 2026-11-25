"use client";

import "wemap-gl-js/dist/wemap-gl.css";
import type { FeatureCollection, LineString, Point } from "geojson";
import { useEffect, useRef } from "react";
import type wemap from "wemap-gl-js";
import type { RouteAssessment } from "./route-assessment";
import type { SiteContextProperties } from "./site-context";
import type { SiteVisitCandidate } from "./site-visit-state";
import { WEMAP_TOKEN } from "./wemap-config";

type WemapMap = InstanceType<typeof wemap.Map>;
type WemapMarker = InstanceType<typeof wemap.Marker>;

export function SiteVisitMap({
	candidate,
	context,
	route,
	onContextSelect,
}: {
	candidate: SiteVisitCandidate | null;
	context: FeatureCollection<Point, SiteContextProperties>;
	route: RouteAssessment | null;
	onContextSelect: (properties: SiteContextProperties) => void;
}) {
	const container = useRef<HTMLDivElement>(null);
	const mapRef = useRef<WemapMap>(null);
	const candidateMarker = useRef<WemapMarker>(null);
	const contextRef = useRef(context);
	const routeRef = useRef(route);
	const onContextSelectRef = useRef(onContextSelect);
	contextRef.current = context;
	routeRef.current = route;
	onContextSelectRef.current = onContextSelect;
	useEffect(() => {
		let disposed = false;
		void import("wemap-gl-js").then(({ default: wemap }) => {
			if (disposed || !container.current || mapRef.current) return;
			const map = new wemap.Map({
				accessToken: WEMAP_TOKEN,
				container: container.current,
				style: "wemap://osm-bright/style.json",
				center: [105.8542, 21.0285],
				zoom: 6,
			});
			mapRef.current = map;
			map.on("load", () => {
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
				if (routeRef.current) addRoute(map, routeRef.current.geometry);
			});
		});
		return () => {
			disposed = true;
			mapRef.current?.remove();
			mapRef.current = null;
		};
	}, []);
	useEffect(() => {
		const map = mapRef.current;
		const source = map?.getSource("site-visit-context");
		if (source && "setData" in source) source.setData(context);
	}, [context]);
	useEffect(() => {
		void import("wemap-gl-js").then(({ default: wemap }) => {
			const map = mapRef.current;
			if (!map || !candidate) return;
			candidateMarker.current?.remove();
			candidateMarker.current = new wemap.Marker({ color: "#B5432F" })
				.setLngLat([candidate.longitude, candidate.latitude])
				.addTo(map);
			map.flyTo({
				center: [candidate.longitude, candidate.latitude],
				zoom: 11,
			});
		});
	}, [candidate]);
	useEffect(() => {
		const map = mapRef.current;
		if (!map || !route) return;
		if (map.isStyleLoaded()) addRoute(map, route.geometry);
	}, [route]);
	return (
		<div
			ref={container}
			className="site-visit-map"
			role="img"
			aria-label="Site visit map"
		/>
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
