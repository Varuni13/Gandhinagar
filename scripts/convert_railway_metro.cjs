const fs = require('fs');
const path = require('path');
const turf = require('@turf/turf');

const RAW_PATH = process.argv[2];
const RAIL_OUT = path.join(__dirname, '..', 'public', 'transport', 'Gandhinagar_railway.geojson');
const METRO_OUT = path.join(__dirname, '..', 'public', 'transport', 'Gandhinagar_metro.geojson');
const BOUNDARY_PATH = path.join(__dirname, '..', 'public', 'administrative', 'Gandhinagar_city_boundary.geojson');

const data = JSON.parse(fs.readFileSync(RAW_PATH, 'utf8'));
const boundaryGeojson = JSON.parse(fs.readFileSync(BOUNDARY_PATH, 'utf8'));
const boundaryPolygon = turf.getGeom(boundaryGeojson.features[0]);
const boundaryBbox = turf.bbox(boundaryGeojson.features[0]);

function isMetro(tags) {
  return tags.railway === 'subway' || tags.station === 'subway' || /metro/i.test(tags.network || '');
}

const railFeatures = [];
const metroFeatures = [];

for (const el of data.elements) {
  const tags = el.tags || {};
  if (!tags.railway) continue;

  if (el.type === 'way' && Array.isArray(el.geometry)) {
    const coordinates = el.geometry.map((pt) => [pt.lon, pt.lat]);
    if (coordinates.length < 2) continue;

    const line = turf.lineString(coordinates);
    const clipped = turf.bboxClip(line, boundaryBbox);
    if (!clipped.geometry || clipped.geometry.coordinates.length === 0) continue;
    if (!turf.booleanIntersects(clipped, boundaryPolygon)) continue;

    const feature = {
      type: 'Feature',
      properties: {
        name: tags.name || null,
        railway: tags.railway,
        network: tags.network || null,
        operator: tags.operator || null,
      },
      geometry: clipped.geometry,
    };
    (isMetro(tags) ? metroFeatures : railFeatures).push(feature);
  } else if (el.type === 'node' && (tags.railway === 'station' || tags.railway === 'halt')) {
    const point = turf.point([el.lon, el.lat]);
    if (!turf.booleanPointInPolygon(point, boundaryPolygon)) continue;

    const feature = {
      type: 'Feature',
      properties: {
        name: tags.name || 'Station',
        railway: tags.railway,
        network: tags.network || null,
        operator: tags.operator || null,
        ref: tags.ref || null,
      },
      geometry: { type: 'Point', coordinates: [el.lon, el.lat] },
    };
    (isMetro(tags) ? metroFeatures : railFeatures).push(feature);
  }
}

fs.mkdirSync(path.dirname(RAIL_OUT), { recursive: true });
fs.writeFileSync(RAIL_OUT, JSON.stringify({ type: 'FeatureCollection', features: railFeatures }));
fs.writeFileSync(METRO_OUT, JSON.stringify({ type: 'FeatureCollection', features: metroFeatures }));

console.log(`railway (Indian Railways): ${railFeatures.length} features -> ${RAIL_OUT}`);
console.log(`metro (Ahmedabad/Gandhinagar Metro): ${metroFeatures.length} features -> ${METRO_OUT}`);
