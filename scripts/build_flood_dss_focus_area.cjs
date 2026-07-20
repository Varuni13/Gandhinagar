const fs = require('fs');
const path = require('path');
const turf = require('@turf/turf');

const POLY_RAW = path.join(__dirname, '..', 'data-raw', 'gandhinagar_flood_dss_focus_polygons_raw.json');
const TRACED_RAW = path.join(__dirname, '..', 'data-raw', 'gandhinagar_flood_dss_traced_sectors.geojson');
const OUT = path.join(__dirname, '..', 'public', 'administrative', 'Gandhinagar_flood_dss_focus_area.geojson');

const polyData = JSON.parse(fs.readFileSync(POLY_RAW, 'utf8'));
const tracedData = JSON.parse(fs.readFileSync(TRACED_RAW, 'utf8'));

const features = [];
const hullInputPoints = [];

// Real mapped polygons: Sector 8, Sector 10, Sector 21, Indroda
for (const el of polyData.elements) {
  if (el.type !== 'way' || !Array.isArray(el.geometry)) continue;
  const coordinates = [el.geometry.map((pt) => [pt.lon, pt.lat])];
  const feature = {
    type: 'Feature',
    properties: {
      name: el.tags.name,
      kind: el.tags.name === 'Indroda' ? 'village' : 'sector',
      geometry_source: 'osm_mapped_polygon',
    },
    geometry: { type: 'Polygon', coordinates },
  };
  features.push(feature);
  coordinates[0].forEach(([lon, lat]) => hullInputPoints.push([lon, lat]));
}

// Sectors 9, 18, 19, 20, 30 and Borij: no polygon mapped in OSM, so these are
// manually traced from satellite imagery (see scripts/trace_missing_sectors.cjs
// and data-raw/README.md for the tracing method and per-area confidence notes).
for (const feature of tracedData.features) {
  features.push(feature);
  feature.geometry.coordinates[0].forEach(([lon, lat]) => hullInputPoints.push([lon, lat]));
}

// Unifying "study area" outline: convex hull of every polygon vertex + point,
// buffered slightly so it visually encloses the areas rather than just
// touching their outermost points.
const hullPoints = turf.featureCollection(hullInputPoints.map((c) => turf.point(c)));
const hull = turf.convex(hullPoints);
const bufferedHull = hull ? turf.buffer(hull, 0.25, { units: 'kilometers' }) : null;

const outFeatures = [...features];
if (bufferedHull) {
  outFeatures.unshift({
    type: 'Feature',
    properties: {
      name: 'Flood Mobility DSS Project Area',
      kind: 'study_area_outline',
      geometry_source: 'convex_hull_of_focus_areas_buffered_250m',
    },
    geometry: bufferedHull.geometry,
  });
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ type: 'FeatureCollection', features: outFeatures }));

console.log(`${outFeatures.length} features -> ${OUT}`);
console.log(`  - 1 study-area outline (convex hull)`);
console.log(`  - ${features.filter((f) => f.properties.geometry_source === 'osm_mapped_polygon').length} real OSM polygons`);
console.log(`  - ${features.filter((f) => f.properties.geometry_source?.startsWith('manually_traced')).length} manually traced from satellite imagery`);
