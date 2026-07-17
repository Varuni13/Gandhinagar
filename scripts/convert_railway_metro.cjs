const fs = require('fs');
const path = require('path');

const RAW_PATH = process.argv[2];
const RAIL_OUT = path.join(__dirname, '..', 'public', 'transport', 'Gandhinagar_railway.geojson');
const METRO_OUT = path.join(__dirname, '..', 'public', 'transport', 'Gandhinagar_metro.geojson');

const data = JSON.parse(fs.readFileSync(RAW_PATH, 'utf8'));

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

    const feature = {
      type: 'Feature',
      properties: {
        name: tags.name || null,
        railway: tags.railway,
        network: tags.network || null,
        operator: tags.operator || null,
      },
      geometry: { type: 'LineString', coordinates },
    };
    (isMetro(tags) ? metroFeatures : railFeatures).push(feature);
  } else if (el.type === 'node' && (tags.railway === 'station' || tags.railway === 'halt')) {
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
