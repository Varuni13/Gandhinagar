# Data Sources

Single reference for where every dataset in this dashboard actually comes from. Per-folder
detail also lives in `data/README.md` and `data-raw/README.md`; this file is the one-stop
summary for answering "where did we get this data" without digging through the repo.

| Layer / Dataset | Source | Type | Notes |
|---|---|---|---|
| **DEM / terrain overlay** | [Copernicus DEM GLO-30](https://dataspace.copernicus.eu/) (ESA/Copernicus Programme, via TanDEM-X), tile `Copernicus_DSM_N23_00_E072_00_DEM` | Official, open, 30m resolution | Cropped to Gandhinagar city bbox, elevation-to-color mapped, then masked to the actual city boundary polygon (not just the crop rectangle). Raw tile kept in `data-raw/`, not shipped to production. |
| **Waterways** (rivers, lakes, drains) | [OpenStreetMap](https://www.openstreetmap.org/copyright) via Overpass API | Open, crowdsourced | Raw export included the full Sabarmati river relation (~260km, well beyond the city) — clipped to the district extent before use. Not an official hydrological survey; good for visualization, not engineering/legal use. |
| **City / Ward Boundary** | OpenStreetMap via Nominatim | Open, crowdsourced | Currently a single city-wide polygon only — real per-ward subdivision data has not been sourced yet (Ward Boundary layer was hidden from the map for this reason; City Boundary shows the same single shape). |
| **District Boundary** (not currently shown on map) | Official Government of Gujarat district shapefile, LGD/2011-Census coded | Official, authoritative | `State_LGD: 24`, `Dist_LGD: 446`, Census-2011 `stcode11: 24` / `dtcode11: 473` — standard join keys for Indian government open-data portals (data.gov.in, PMGSY, etc.). Kept in `data/` as reference; removed from the map itself due to UX issues (auto-zoom, scale mismatch with city-level layers). |
| **Live traffic** | [TomTom Traffic API](https://developer.tomtom.com/) | Commercial API, requires key | 30 monitored points across Gandhinagar, collected every 15 min (peak) / 60 min (off-peak) by `traffic_collector/collect.py`, running continuously in production as `gandhinagar-collector.service`. |
| **Basemaps** | Google Maps (roadmap/satellite), OpenStreetMap, CartoDB Voyager | Mixed (commercial + open) | Google Maps requires `VITE_GOOGLE_MAPS_API_KEY` (see `.env.example`). |
| **Roads** | OpenStreetMap via Overpass API | Open, crowdsourced | Full vehicle road network (motorway down to residential/service), clipped to the actual city boundary polygon. 6,614 segments, ~1.8MB — deliberately complete rather than trimmed for size, per team decision. |
| **Railway** | OpenStreetMap via Overpass API | Open, crowdsourced | Indian Railways only (Western Railway), clipped to the city boundary — 34 line segments + Gandhinagar Capital station. Separate layer from Metro — see below. |
| **Metro** | OpenStreetMap via Overpass API | Open, crowdsourced | Gandhinagar/Ahmedabad Metro (Gujarat Metro Rail Corporation), clipped to the city boundary — 11 line segments + 12 in-city stations (Sachivalaya, Akshardham, Mahatma Mandir, Infocity, etc.). Split from Railway by OSM tags (`railway=subway`, `station=subway`, `network` containing "Metro") so the two systems don't render as one mixed layer. |
| **Flood Mobility DSS Project Focus Area** | OpenStreetMap via Overpass/Nominatim + computed convex hull | Open, crowdsourced + derived | Highlights the flood-mobility DSS scope of work (Sector 8-10, 18-21, 30, Indroda, Borij). Only 4 of 10 areas have real OSM polygons (Sector 8, 10, 21, Indroda); the rest are point markers or, for Borij, an approximate proxy (nearest named landmark — no OSM entity exists for Borij itself). Every feature's `geometry_source` property and popup note discloses its actual precision — see `data-raw/README.md` for the full breakdown. |

## Deployment: these files are NOT in git

The files below are git-ignored (see `.gitignore`) because they're large and don't belong
bloating the repo's history. They exist locally and must be **manually copied to the
server** — a fresh `git pull` on the server will NOT bring these along, and a build
without them will silently produce a dashboard missing those layers.

| Path | Size (approx) | Needed for |
|---|---|---|
| `public/transport/Gandhinagar_roads.geojson` | ~1.8MB | Roads layer |
| `public/transport/Gandhinagar_railway.geojson` | ~12KB | Railway layer |
| `public/transport/Gandhinagar_metro.geojson` | ~11KB | Metro layer |
| `public/DEM/Gandhinagar_dem_overlay.png` | ~1MB | Terrain/DEM overlay |
| `data-raw/*` (everything except `README.md`) | up to 43MB each | Reference/provenance only — not read by the running app, safe to skip copying unless you're re-running a conversion script |

**When you change any of these** (re-fetch roads/railway data, regenerate the DEM overlay,
etc.), remember: `git add`/`commit`/`push` will silently skip them (that's the point of the
ignore rule) — you must separately copy the updated file to the server yourself. There's no
automatic step that does this for you.

## Licensing notes

- **OpenStreetMap data** (waterways, boundaries) is © OpenStreetMap contributors, licensed
  under the [Open Database License (ODbL)](https://www.openstreetmap.org/copyright) — free
  to use with attribution, share-alike applies to derived datasets.
- **Copernicus DEM** is free and open under the [Copernicus Data Access Terms](https://dataspace.copernicus.eu/terms-and-conditions) — attribution to ESA/Copernicus expected.
- **TomTom traffic data** is commercial/API-key-gated — check TomTom's terms before any
  redistribution beyond this dashboard's own live display.
- **Official district shapefile** — government-issued, no additional licensing terms known;
  verify with GMC/state authorities before external redistribution.

## Where to look for more detail

- `data/README.md` — official government shapefile provenance and caveats
- `data-raw/README.md` — raw OSM/Copernicus source files, what they were converted into
- `traffic_collector/README.md` — TomTom collector setup, schedule, monitored points
