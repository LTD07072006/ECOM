# Site Visit UAT Checklist

Use this checklist for a browser-level acceptance pass. Mark each item **pass**, **blocked**, or **needs help**, and record the URL, locale, browser, and data date used.

## Candidate site

- [ ] Open `/site-visit` and confirm the page explains how to choose a candidate site.
- [ ] Open a shared URL with `label`, `lng`, and `lat`; confirm the candidate label and pin are restored.
- [ ] Click empty map space; confirm a `Pinned location` candidate is created.
- [ ] Drag the candidate pin; confirm the URL coordinates change and the label remains stable.
- [ ] Click an infrastructure marker; confirm it opens infrastructure details instead of creating a new candidate.

## Nearby infrastructure

- [ ] Confirm airport, seaport, ICD, and industrial park filters are enabled by default.
- [ ] Confirm each filter displays a nearby count.
- [ ] Turn one filter off; confirm only that kind disappears from the map.
- [ ] Use “Select all” and “Clear all”; confirm the map and counts respond without a page reload.
- [ ] With no matching POIs, confirm an explanatory empty state is shown.
- [ ] Confirm the nearby note states the 150 km radius and that filters are session-local.

## Logistics routes

- [ ] Select logistics destinations and calculate the network.
- [ ] Confirm live, baseline, and unavailable statuses are visually distinguishable.
- [ ] Confirm unavailable routes show no distance, duration, or misleading map line.
- [ ] Open “How to read route status” and confirm the three meanings and advisory disclaimer are understandable.
- [ ] Select a route row; confirm the row and corresponding map line are highlighted.
- [ ] Click a rendered route; confirm the corresponding table row becomes selected.

## Sharing and evidence

- [ ] Confirm shared links preserve candidate coordinates and itinerary/comparison state where applicable.
- [ ] Confirm nearby filters are not silently represented as shared state.
- [ ] Confirm source links are available for published infrastructure and route evidence when supplied.
- [ ] Confirm the UI does not describe a baseline estimate as live traffic or an official truck route.

## Accessibility and responsive behavior

- [ ] Navigate candidate search, filters, destination controls, and route details with keyboard only.
- [ ] Confirm every checkbox and select has an accessible label.
- [ ] Test the page at a narrow viewport and confirm the map, filters, and route table remain usable.
