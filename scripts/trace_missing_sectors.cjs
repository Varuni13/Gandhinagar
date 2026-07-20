// Converts manually-traced pixel corners (from gridded satellite images) into
// lon/lat polygons. Images were fetched via Esri World Imagery export with
// bboxSR=imageSR=4326, so pixel->lonlat is a direct linear (equirectangular)
// interpolation across the known bbox - no Mercator correction needed.
const fs = require('fs');
const path = require('path');

const IMAGE_SIZE = { width: 900, height: 765 };

const traces = [
  {
    name: 'Sector 9',
    kind: 'sector',
    confidence: 'low',
    bbox: [72.657655, 23.209173, 72.668655, 23.218523],
    // Top edge capped at py=262 (~lat 23.2153, the Sector 9/18 midpoint) - the
    // original trace extended to the full frame (py=0) and overlapped Sector 18
    // by 47% of its area. Sector 9 and 18 are both low-confidence forest traces
    // with no clear dividing feature visible, so this is a deliberate midpoint
    // split rather than a real observed boundary.
    pixels: [[40, 262], [900, 262], [900, 765], [40, 765]],
    note: 'Mostly forest/park land (Indroda-adjacent green belt), not a built residential grid - only 1-2 clear bounding roads visible. Northern edge is an arbitrary midpoint split with Sector 18, not an observed boundary (the two traces originally overlapped 47%).',
  },
  {
    name: 'Sector 18',
    kind: 'sector',
    confidence: 'low',
    bbox: [72.659244, 23.212112, 72.670244, 23.221462],
    // Bottom edge capped at py=502 (~lat 23.2153, the Sector 9/18 midpoint) -
    // same overlap fix as Sector 9, from the other side. Right/east edge
    // pulled back from the frame edge (px=900) to px=470 (~lon 72.6650) to
    // defer to Sector 19's high-confidence western boundary, which it was
    // overlapping by ~20% of Sector 18's area.
    pixels: [[0, 90], [470, 142], [470, 502], [0, 502]],
    note: 'Mostly forest/park land, not a built residential grid - only 1-2 clear bounding roads visible. Southern and eastern edges are arbitrary splits deferring to the adjacent Sector 9 and Sector 19 traces, not observed boundaries.',
  },
  {
    name: 'Sector 19',
    kind: 'sector',
    confidence: 'high',
    bbox: [72.663973, 23.217578, 72.674973, 23.226928],
    pixels: [[60, 30], [790, 250], [790, 765], [100, 765]],
    note: null,
  },
  {
    name: 'Sector 20',
    kind: 'sector',
    confidence: 'medium',
    bbox: [72.666567, 23.223598, 72.677567, 23.232948],
    pixels: [[150, 0], [700, 0], [700, 765], [60, 765]],
    note: 'Mixed institutional (Sachivalaya/Mahatma Mandir complex) and residential area.',
  },
  {
    name: 'Sector 30',
    kind: 'sector',
    confidence: 'medium',
    bbox: [72.665703, 23.235608, 72.676703, 23.244958],
    pixels: [[0, 0], [820, 20], [820, 765], [0, 765]],
    note: 'Frame edges used for two sides - actual sector likely extends further; only the eastern bounding road was clearly visible.',
  },
  {
    name: 'Borij',
    kind: 'village',
    confidence: 'medium',
    bbox: [72.672089, 23.229953, 72.683089, 23.239303],
    pixels: [[480, 380], [900, 400], [900, 765], [550, 765]],
    note: 'Traced from the visible dense/organic settlement cluster near the "Borij Jain Derasar" temple - no OSM entity exists for Borij itself, so this is a satellite-derived approximation, not sourced boundary data.',
  },
];

function pixelToLonLat([px, py], bbox) {
  const [minlon, minlat, maxlon, maxlat] = bbox;
  const lon = minlon + (px / IMAGE_SIZE.width) * (maxlon - minlon);
  const lat = maxlat - (py / IMAGE_SIZE.height) * (maxlat - minlat);
  return [Number(lon.toFixed(6)), Number(lat.toFixed(6))];
}

const features = traces.map((trace) => {
  const ring = trace.pixels.map((px) => pixelToLonLat(px, trace.bbox));
  ring.push(ring[0]); // close the ring
  return {
    type: 'Feature',
    properties: {
      name: trace.name,
      kind: trace.kind,
      geometry_source: 'manually_traced_from_satellite_imagery_approximate',
      trace_confidence: trace.confidence,
      trace_note: trace.note,
    },
    geometry: { type: 'Polygon', coordinates: [ring] },
  };
});

const OUT = path.join(__dirname, '..', 'data-raw', 'gandhinagar_flood_dss_traced_sectors.geojson');
fs.writeFileSync(OUT, JSON.stringify({ type: 'FeatureCollection', features }, null, 2));
console.log(`${features.length} traced polygons -> ${OUT}`);
