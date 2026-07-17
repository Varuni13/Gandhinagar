const fs = require('fs');
const path = require('path');
const turf = require('@turf/turf');

const SRC = path.join(__dirname, '..', 'public', 'hydrology', 'Gandhinagar_waterways.geojson');
// District extent (measured from Gandhinagar_district.kml) padded ~0.03deg (~3km)
const BBOX = [72.30, 22.97, 73.06, 23.60]; // [minLon, minLat, maxLon, maxLat]

const gj = JSON.parse(fs.readFileSync(SRC, 'utf8'));

const clipped = [];
for (const feature of gj.features) {
  try {
    const result = turf.bboxClip(feature, BBOX);
    if (result.geometry && result.geometry.coordinates && result.geometry.coordinates.length > 0) {
      result.properties = feature.properties;
      clipped.push(result);
    }
  } catch (err) {
    console.warn('skip feature', feature.id, err.message);
  }
}

console.log(`kept ${clipped.length} of ${gj.features.length} features after clipping`);

const out = { type: 'FeatureCollection', features: clipped };
fs.writeFileSync(SRC, JSON.stringify(out));
console.log('wrote', SRC);
