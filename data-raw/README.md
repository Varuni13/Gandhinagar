# data-raw/

Intermediate files fetched from open sources (OpenStreetMap via Overpass/Nominatim,
Copernicus DEM) while sourcing Gandhinagar data, kept for provenance/reprocessing.

- `Copernicus_DSM_N23_00_E072_00_DEM.tif` — source DEM tile, processed into
  `public/DEM/Gandhinagar_dem*`.
- `gandhinagar_way_boundary.json` — verified correct Gandhinagar (Gujarat) city boundary from
  OSM Nominatim, converted into `public/administrative/Gandhinagar_wards.kml`.
- `Gandhinagar_district_boundary.geojson` / `gandhinagar_district_boundary_1950886.json` —
  OSM district boundary (superseded by the official shapefile in `data/` for the app's
  District Boundary layer, kept here for comparison).
- `Gandhinagar_waterways.geojson` / `gandhinagar_waterways_raw.json` — OSM waterways,
  copied into `public/hydrology/Gandhinagar_waterways.geojson`.
- `gandhinagar_roads_raw.json` — OSM roads via Overpass (`highway=*`, all vehicle classes
  including residential/service), city bbox (23.14,72.58,23.31,72.72), converted into
  `public/transport/Gandhinagar_roads.geojson` via `scripts/convert_roads.cjs`. Clipped to
  the actual `Gandhinagar_city_boundary.geojson` polygon (not just its bbox) so roads
  don't spill into neighboring areas (Kolavada, Nava Dharmpur, etc.) beyond the city.
- `gandhinagar_railway_raw.json` — OSM rail infrastructure via Overpass
  (`railway=rail|light_rail|subway|monorail|tram` ways + `railway=station|halt` nodes),
  fetched with a wide bbox (22.97,72.30,23.60,73.06) since corridors extend beyond the
  city, then clipped down to the actual `Gandhinagar_city_boundary.geojson` polygon by
  `scripts/convert_railway_metro.cjs` (lines via bboxClip + intersects, stations via
  point-in-polygon) — so only the portion actually inside/crossing the city survives.
  Split into two separate layers based on OSM tags (`station=subway` / `network`
  containing "Metro" / `railway=subway`):
  - `public/transport/Gandhinagar_railway.geojson` — Indian Railways (Western Railway):
    just the short stretch that clips the city's edge, plus Gandhinagar Capital station.
  - `public/transport/Gandhinagar_metro.geojson` — Gandhinagar/Ahmedabad Metro (Gujarat
    Metro Rail Corporation): the in-city corridor with 12 stations (Sachivalaya,
    Akshardham, Mahatma Mandir, Infocity, etc.).

  Note: an earlier version of this fetch only queried `rail|light_rail` and missed the
  metro line's `railway=subway` tagging entirely, so metro stations appeared as floating
  points with no connecting line. Fixed by including `subway` in the way filter. An even
  earlier version didn't clip to the boundary at all, so both layers sprawled into
  Ahmedabad, Kadi, Mansa, etc. — now clipped the same way as Roads.

- `gandhinagar_flood_dss_focus_polygons_raw.json` / `gandhinagar_flood_dss_focus_points_raw.json`
  — OSM data for the Gandhinagar Flood Mobility DSS project's scope-of-work area (Sector
  8-10, 18-21, 30, and the villages of Indroda and Borij), fetched via Overpass and
  Nominatim. Combined into `public/administrative/Gandhinagar_flood_dss_focus_area.geojson`
  by `scripts/build_flood_dss_focus_area.cjs`, which also computes a buffered convex hull
  outline enclosing everything as a single "Project Focus Area" study boundary.

  Data availability was inconsistent: only Sector 8, Sector 10, Sector 21, and Indroda have
  real mapped polygons in OSM. Sectors 9, 18, 19, 20, and 30 exist only as unmapped
  neighbourhood point markers (no boundary drawn yet). **Borij is not mapped as a distinct
  place in OSM at all** — the only "Borij"-named entity found is a Jain temple ("Borij Jain
  Derasar").

- `gandhinagar_flood_dss_traced_sectors.geojson` — for the 6 areas above with no real OSM
  polygon (Sectors 9, 18, 19, 20, 30, Borij), boundaries were manually traced by hand from
  satellite imagery (Esri World Imagery, fetched via `scripts/trace_missing_sectors.cjs`,
  which overlays a pixel grid on each image to read off corner coordinates precisely, then
  converts pixel -> lon/lat via linear interpolation over the known image bbox). Each
  feature carries a `trace_confidence` (`high`/`medium`/`low`) and `trace_note` describing
  what was actually visible:
  - **High confidence** (Sector 19): clear road-bounded residential block, all four sides
    visible.
  - **Medium confidence** (Sector 20, Sector 30, Borij): partially bounded — some sides
    are real roads, others are the image frame edge (actual extent may be larger), or (Borij)
    traced from the visible informal settlement cluster near the temple proxy rather than
    any authoritative boundary.
  - **Low confidence** (Sector 9, Sector 18): mostly forest/park land (Indroda-adjacent
    green belt), not a built residential grid — only 1-2 bounding roads were clearly
    identifiable, so these traces are the least reliable of the six.

  This is disclosed via the `geometry_source` property
  (`manually_traced_from_satellite_imagery_approximate`) and shown directly in the layer's
  popup — never presented as equivalent to the real OSM-mapped polygons.

None of these are read by the app directly — `public/` holds the processed, live files.
