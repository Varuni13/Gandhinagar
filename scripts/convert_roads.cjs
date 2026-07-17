const fs = require('fs');
const path = require('path');
const turf = require('@turf/turf');

const RAW_PATH = process.argv[2];
const ROADS_OUT = path.join(__dirname, '..', 'public', 'transport', 'Gandhinagar_roads.geojson');
const BOUNDARY_PATH = path.join(__dirname, '..', 'public', 'administrative', 'Gandhinagar_city_boundary.geojson');

const data = JSON.parse(fs.readFileSync(RAW_PATH, 'utf8'));
const boundaryGeojson = JSON.parse(fs.readFileSync(BOUNDARY_PATH, 'utf8'));
const boundaryPolygon = turf.getGeom(boundaryGeojson.features[0]);
const boundaryBbox = turf.bbox(boundaryGeojson.features[0]);

const roadFeatures = [];

for (const el of data.elements) {
  if (el.type !== 'way' || !Array.isArray(el.geometry)) continue;
  const tags = el.tags || {};
  if (!tags.highway) continue;

  const coordinates = el.geometry.map((pt) => [pt.lon, pt.lat]);
  if (coordinates.length < 2) continue;

  const line = turf.lineString(coordinates);
  const clipped = turf.bboxClip(line, boundaryBbox);
  if (!clipped.geometry || clipped.geometry.coordinates.length === 0) continue;
  if (!turf.booleanIntersects(clipped, boundaryPolygon)) continue;

  roadFeatures.push({
    type: 'Feature',
    properties: {
      name: tags.name || null,
      highway: tags.highway,
      ref: tags.ref || null,
    },
    geometry: clipped.geometry,
  });
}

fs.mkdirSync(path.dirname(ROADS_OUT), { recursive: true });
fs.writeFileSync(ROADS_OUT, JSON.stringify({ type: 'FeatureCollection', features: roadFeatures }));

console.log(`roads: ${roadFeatures.length} features -> ${ROADS_OUT}`);
