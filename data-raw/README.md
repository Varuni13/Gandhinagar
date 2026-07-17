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
  wider bbox (22.97,72.30,23.60,73.06) since corridors extend beyond the city. Split by
  `scripts/convert_railway_metro.cjs` into two separate layers based on OSM tags
  (`station=subway` / `network` containing "Metro" / `railway=subway`):
  - `public/transport/Gandhinagar_railway.geojson` — Indian Railways (Western Railway):
    Kalol Junction, Sabarmati Junction, Naroda, etc.
  - `public/transport/Gandhinagar_metro.geojson` — Gandhinagar/Ahmedabad Metro (Gujarat
    Metro Rail Corporation): GIFT City, Mahatma Mandir, Sachivalaya, Akshardham, etc.

  Note: an earlier version of this fetch only queried `rail|light_rail` and missed the
  metro line's `railway=subway` tagging entirely, so metro stations appeared as floating
  points with no connecting line. Fixed by including `subway` in the way filter.

None of these are read by the app directly — `public/` holds the processed, live files.
