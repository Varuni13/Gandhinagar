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

None of these are read by the app directly — `public/` holds the processed, live files.
