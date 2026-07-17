import React, { useEffect, useMemo, useRef, useState } from 'react';
import DashboardSidebar from './components/DashboardSidebar';
import MapCanvas from './components/MapCanvas';
import { loadScript, loadStylesheet } from './lib/loadExternalAssets';
import { cityDashboards, getCityById } from './config/cities';

const externalStylesheets = [
  'https://cdn.jsdelivr.net/npm/leaflet@1.9.3/dist/leaflet.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.2.2/dist/css/bootstrap.min.css',
  'https://netdna.bootstrapcdn.com/bootstrap/3.0.0/css/bootstrap-glyphicons.css',
  'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.2.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/Leaflet.awesome-markers/2.0.2/leaflet.awesome-markers.css',
  'https://cdn.jsdelivr.net/gh/python-visualization/folium/folium/templates/leaflet.awesome.rotate.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/MarkerCluster.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/MarkerCluster.Default.css',
];

const externalScripts = [
  'https://code.jquery.com/jquery-3.7.1.min.js',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.2.2/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/leaflet@1.9.3/dist/leaflet.js',
  'https://cdnjs.cloudflare.com/ajax/libs/Leaflet.awesome-markers/2.0.2/leaflet.awesome-markers.js',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/leaflet.markercluster.js',
  'https://cdn.jsdelivr.net/npm/@turf/turf@7.2.0/turf.min.js',
  'https://cdn.jsdelivr.net/npm/shpjs@6.2.0/dist/shp.min.js',
];

const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
let googleMapsLoaderPromise = null;

const animatedObservationOverlays = {
  'Observations | Severe Waterlogging Hotspots': {
    className: 'map-overlay-hotspot',
    strokeColor: '#49879A',
    fillColor: '#6BC3D2',
    radius: 8,
    weight: 2,
    fillOpacity: 0.9,
  },
  'Observations | Waterlogging Locations (129)': {
    className: 'map-overlay-waterlogging',
    strokeColor: '#5298A9',
    fillColor: '#63B5BA',
    radius: 6,
    weight: 2,
    fillOpacity: 0.85,
  },
  'Observations | Garbage Vulnerable Points': {
    className: 'map-overlay-garbage',
    strokeColor: '#49879A',
    fillColor: '#64B8C1',
    radius: 7,
    weight: 2,
    fillOpacity: 0.88,
  },
  'Observations | Secondary Garbage Collection': {
    className: 'map-overlay-secondary',
    strokeColor: '#5298A9',
    fillColor: '#5CADBA',
    radius: 7,
    weight: 2,
    fillOpacity: 0.88,
  },
  'Sensor | Top 20 Modeled Hotspots': {
    className: 'map-overlay-sensor',
    strokeColor: '#8F2D18',
    fillColor: '#FF8A5B',
    radius: 9,
    weight: 2.4,
    fillOpacity: 0.95,
  },
};

const sensorOverlayConfigs = [];

const administrativeBoundaryOverrideConfigs = [
  {
    cityId: 'gnr',
    label: 'Administrative / Boundaries | City Boundary',
    url: '/administrative/Gandhinagar_wards.kml',
    kind: 'city-boundary',
  },
];

const trafficOverlayConfigs = [
  {
    cityId: 'gnr',
    label: 'Transport | Live Traffic',
    url: '/traffic/latest_traffic_gandhinagar.json',
    refreshIntervalMs: 5 * 60 * 1000,
  },
];

const drainageNetworkOverlayConfigs = [];

const hydrologyGeoJsonOverlayConfigs = [
  {
    cityId: 'gnr',
    label: 'Hydrology | Waterways',
    url: '/hydrology/Gandhinagar_waterways.geojson',
    color: '#1d4ed8',
    weight: 2.6,
    fillColor: '#7dd3fc',
    fillOpacity: 0.45,
  },
];

const transportGeoJsonOverlayConfigs = [
  {
    cityId: 'gnr',
    label: 'Transport | Roads',
    url: '/transport/Gandhinagar_roads.geojson',
    color: '#78716c',
    weight: 2.2,
    popupFields: [
      { key: 'name', label: 'Road Name' },
      { key: 'ref', label: 'Route Ref' },
      { key: 'highway', label: 'Type' },
    ],
  },
  {
    cityId: 'gnr',
    label: 'Transport | Railway',
    url: '/transport/Gandhinagar_railway.geojson',
    color: '#b91c1c',
    weight: 2.4,
    dashArray: '8 4',
    markerRadius: 5,
    markerFillOpacity: 0.95,
    popupFields: [
      { key: 'name', label: 'Station / Line Name' },
      { key: 'railway', label: 'Type' },
      { key: 'operator', label: 'Operator' },
    ],
  },
  {
    cityId: 'gnr',
    label: 'Transport | Metro',
    url: '/transport/Gandhinagar_metro.geojson',
    color: '#0369a1',
    weight: 2.4,
    dashArray: '2 6',
    markerRadius: 5,
    markerFillOpacity: 0.95,
    popupFields: [
      { key: 'name', label: 'Station / Line Name' },
      { key: 'railway', label: 'Type' },
      { key: 'network', label: 'Network' },
    ],
  },
];

const removedAdministrativeOverlayLabels = [
  'Administrative / Boundaries | Sector Boundary',
  'Administrative / Boundaries | Colony Boundary',
  'Administrative / Boundaries | Restricted Area (900m)',
  'Administrative / Boundaries | Ward Boundary',
  'Administrative / Boundaries | District Boundary',
];

const removedDrainageOverlayPrefixes = ['Drainage |', 'SWMM Drainage |'];
const removedHydrologyOverlayPrefixes = ['Hydrology |'];
const removedDashboardOverlayPrefixes = ['Observations |', 'Transport |', 'Terrain |', 'Sensor |'];

const zoneBoundaryDefinitions = [
  {
    zoneName: 'Central Zone',
    wards: ['Dariyapur', 'Shahpur', 'Jamalpur', 'Khadia', 'Kalupur', 'Saraspur-Rakhiyal'],
  },
  {
    zoneName: 'East Zone',
    wards: [
      'Gomtipur',
      'Amraiwadi',
      'Odhav',
      'Vastral',
      'Bhaipura Hatkeshwar',
      'Khokhra',
      'India Colony',
      'Thakkarbapa Nagar',
      'Nikol',
      'Virat Nagar',
      'Bapunagar',
    ],
  },
  {
    zoneName: 'West Zone',
    wards: ['Navrangpura', 'Naranpura', 'Paldi', 'Vasna', 'Stadium'],
  },
  {
    zoneName: 'North Zone',
    wards: ['Shahibag', 'Asarwa', 'Saijpur Bogha', 'Kubernagar', 'Naroda', 'Sardarnagar', 'Sabarmati', 'Ranip'],
  },
  {
    zoneName: 'South Zone',
    wards: ['Maninagar', 'Danilimda', 'Baherampura', 'Isanpur', 'Lambha', 'Vatva'],
  },
  {
    zoneName: 'North-West Zone',
    wards: ['Gota', 'Chandlodiya', 'Chandkheda', 'Ghatlodia', 'Thaltej', 'Bodakdev'],
  },
  {
    zoneName: 'South-West Zone',
    wards: ['Vejalpur', 'Sarkhej', 'Maktampura', 'Jodhpur'],
  },
];

const swmmOverlayConfigs = [];

const swmmTimeseriesOverlayConfigs = [];

const hiddenPropertyKeys = new Set(['objectid', 'shape_leng', 'shape_area', 'area', 'objectid_1']);
const swmmTimeseriesHiddenKeys = new Set(['timeseries_meta', 'timeseries', 'summary', 'location_ts', 'from_node_ts', 'to_node_ts']);

function SidebarToggleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="dashboard-open-button__icon">
      <defs>
        <linearGradient id="menuGlow" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFFFFF" stopOpacity="0.96" />
          <stop offset="1" stopColor="#DFF5F8" stopOpacity="0.88" />
        </linearGradient>
      </defs>
      <rect x="3.5" y="4" width="17" height="16" rx="5" fill="url(#menuGlow)" fillOpacity="0.18" stroke="currentColor" strokeOpacity="0.38" />
      <path d="M8 8.5h8M8 12h8M8 15.5h5.25" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" />
      <circle cx="16.9" cy="15.5" r="1.15" fill="currentColor" />
    </svg>
  );
}

function getGoogleMapsScriptUrl(apiKey, callbackName) {
  const url = new URL('https://maps.googleapis.com/maps/api/js');
  url.searchParams.set('key', apiKey);
  url.searchParams.set('loading', 'async');
  url.searchParams.set('v', 'weekly');
  url.searchParams.set('callback', callbackName);
  return url.toString();
}

function loadGoogleMapsApi(apiKey) {
  if (window.google?.maps?.Map) {
    return Promise.resolve(window.google.maps);
  }

  if (googleMapsLoaderPromise) {
    return googleMapsLoaderPromise;
  }

  const callbackName = '__gnrGoogleMapsReady';

  googleMapsLoaderPromise = new Promise((resolve, reject) => {
    window[callbackName] = () => {
      resolve(window.google.maps);
      delete window[callbackName];
    };

    const script = document.createElement('script');
    script.src = getGoogleMapsScriptUrl(apiKey, callbackName);
    script.async = true;
    script.defer = true;
    script.dataset.googleMapsLoader = 'true';
    script.onerror = () => {
      delete window[callbackName];
      reject(new Error('Google Maps JavaScript API could not be loaded.'));
    };

    document.head.appendChild(script);
  });

  return googleMapsLoaderPromise;
}

async function initializeGoogleBasemap(containerId) {
  if (
    !googleMapsApiKey ||
    googleMapsApiKey === 'PASTE_YOUR_GOOGLE_MAPS_API_KEY_HERE' ||
    googleMapsApiKey === 'your_google_maps_api_key_here'
  ) {
    return null;
  }

  try {
    await loadGoogleMapsApi(googleMapsApiKey);

    if (!window.google?.maps?.Map) {
      return null;
    }

    return new window.google.maps.Map(document.getElementById(containerId), {
      center: { lat: 23.2156, lng: 72.6369 },
      zoom: 12,
      mapTypeId: 'roadmap',
      streetViewControl: false,
      fullscreenControl: false,
      mapTypeControl: false,
      rotateControl: false,
      keyboardShortcuts: false,
      gestureHandling: 'none',
      clickableIcons: false,
      disableDefaultUI: true,
    });
  } catch (error) {
    console.warn('Google Maps basemap unavailable, falling back to Esri satellite imagery.', error);
    return null;
  }
}

function syncGoogleBasemap(leafletMap, googleMap) {
  const syncView = () => {
    const center = leafletMap.getCenter();
    googleMap.setCenter({ lat: center.lat, lng: center.lng });
    googleMap.setZoom(leafletMap.getZoom());
  };

  syncView();
  leafletMap.on('move', syncView);
  leafletMap.on('zoom', syncView);
  leafletMap.on('zoomend', syncView);
  window.addEventListener('resize', syncView);

  return () => {
    leafletMap.off('move', syncView);
    leafletMap.off('zoom', syncView);
    leafletMap.off('zoomend', syncView);
    window.removeEventListener('resize', syncView);
  };
}

function getLeafletBasemapContainer() {
  return document.getElementById('gnr-google-basemap');
}

function setGoogleBasemapContainerVisible(isVisible) {
  const container = getLeafletBasemapContainer();
  if (!container) {
    return;
  }

  container.style.opacity = isVisible ? '1' : '0';
  container.style.pointerEvents = isVisible ? 'auto' : 'none';
}

function applyOverlayDomClasses(layer, config) {
  const target = layer?._path ?? layer?._icon;
  if (!target) {
    return;
  }

  target.classList.add('map-overlay-animated', config.className);
  target.style.setProperty('--overlay-fill', config.fillColor);
  target.style.setProperty('--overlay-stroke', config.strokeColor);
}

function styleLeafletLayer(layer, config) {
  if (!layer) {
    return;
  }

  if (typeof layer.eachLayer === 'function' && !layer._path && !layer._icon) {
    layer.eachLayer((childLayer) => styleLeafletLayer(childLayer, config));
  }

  if (typeof layer.setStyle === 'function') {
    layer.setStyle({
      color: config.strokeColor,
      fillColor: config.fillColor,
      fillOpacity: config.fillOpacity,
      opacity: 1,
      weight: config.weight,
    });
  }

  if (typeof layer.setRadius === 'function') {
    layer.setRadius(config.radius);
  }

  if (typeof layer.bringToFront === 'function') {
    layer.bringToFront();
  }

  const applyClasses = () => applyOverlayDomClasses(layer, config);
  applyClasses();

  if (typeof layer.on === 'function') {
    layer.on('add', () => {
      window.requestAnimationFrame(applyClasses);
    });
  }
}

function enhanceObservationOverlays(api) {
  const layerEntries = Object.values(api?.layerControl?._layers ?? {});
  layerEntries.forEach((entry) => {
    if (!entry?.overlay || !animatedObservationOverlays[entry.name]) {
      return;
    }

    styleLeafletLayer(entry.layer, animatedObservationOverlays[entry.name]);

    if (typeof entry.layer?.on === 'function') {
      entry.layer.on('add', () => styleLeafletLayer(entry.layer, animatedObservationOverlays[entry.name]));
    }
  });
}

async function initializeDemOverlay(api, demOverlayConfig) {
  if (!api?.map || !window.L) {
    return null;
  }

  if (!demOverlayConfig) {
    return null;
  }

  const existingEntry = Object.values(api.layerControl?._layers ?? {}).find(
    (entry) => entry?.overlay && entry.name === demOverlayConfig.label,
  );
  if (existingEntry) {
    return existingEntry.layer;
  }

  const response = await fetch(demOverlayConfig.metadataUrl);
  if (!response.ok) {
    throw new Error('DEM metadata could not be loaded.');
  }

  const metadata = await response.json();
  const paneName = 'demPane';

  if (!api.map.getPane(paneName)) {
    const pane = api.map.createPane(paneName);
    pane.style.zIndex = '250';
    pane.style.pointerEvents = 'none';
  }

  const bounds = [
    [metadata.bounds.south, metadata.bounds.west],
    [metadata.bounds.north, metadata.bounds.east],
  ];

  const demLayer = window.L.imageOverlay(demOverlayConfig.imageUrl, bounds, {
    pane: paneName,
    opacity: 0.72,
    interactive: false,
    className: 'dem-overlay-image',
  });

  api.layerControl.addOverlay(demLayer, demOverlayConfig.label);
  return demLayer;
}

function bootstrapLeafletDashboard(mapContainerId) {
  if (!window.L) {
    throw new Error('Leaflet must be loaded before initializing the city dashboard.');
  }

  const map = window.L.map(mapContainerId, {
    center: [23.2156, 72.6369],
    zoom: 12,
  });

  const baseTileLayer = window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    maxZoom: 20,
  }).addTo(map);

  const layerControl = window.L.control.layers({}, {}, { collapsed: false }).addTo(map);

  return { map, layerControl, baseTileLayer };
}

function ensureLeafletBasemapLayers(api, basemapStoreRef) {
  if (!api?.map || !window.L) {
    return;
  }

  if (!basemapStoreRef.current.cartodb && api.baseTileLayer) {
    basemapStoreRef.current.cartodb = api.baseTileLayer;
    Object.assign(basemapStoreRef.current.cartodb.options, {
      keepBuffer: 8,
      updateWhenIdle: false,
    });
  }

  if (!basemapStoreRef.current.osm) {
    basemapStoreRef.current.osm = window.L.tileLayer(
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 20,
        keepBuffer: 8,
        updateWhenIdle: false,
      },
    );
  }

  if (!basemapStoreRef.current.satellite) {
    basemapStoreRef.current.satellite = window.L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
        maxZoom: 19,
        keepBuffer: 8,
        updateWhenIdle: false,
      },
    );
  }
}

function applyBasemapSelection(api, basemapStoreRef, basemapType, googleMap) {
  if (!api?.map) {
    return;
  }

  ensureLeafletBasemapLayers(api, basemapStoreRef);

  const cartodbLayer = basemapStoreRef.current.cartodb;
  const osmLayer = basemapStoreRef.current.osm;
  const satelliteLayer = basemapStoreRef.current.satellite;
  [cartodbLayer, osmLayer, satelliteLayer].forEach((layer) => {
    if (layer && api.map.hasLayer(layer)) {
      api.map.removeLayer(layer);
    }
  });

  if (basemapType === 'satellite' && googleMap) {
    setGoogleBasemapContainerVisible(true);
    googleMap.setMapTypeId('satellite');
    return;
  }

  if (basemapType === 'google-streets' && googleMap) {
    setGoogleBasemapContainerVisible(true);
    googleMap.setMapTypeId('roadmap');
    return;
  }

  setGoogleBasemapContainerVisible(false);

  if (basemapType === 'satellite') {
    satelliteLayer?.addTo(api.map);
    return;
  }

  if (basemapType === 'google-streets') {
    osmLayer?.addTo(api.map);
    return;
  }

  if (basemapType === 'cartodb') {
    cartodbLayer?.addTo(api.map);
    return;
  }

  osmLayer?.addTo(api.map);
}

function shouldHideProperty(key) {
  return hiddenPropertyKeys.has(String(key).trim().toLowerCase());
}

function sanitizePopupOrTooltipContent(root) {
  if (!root) {
    return;
  }

  root.querySelectorAll('tr').forEach((row) => {
    const headerCell = row.querySelector('th, strong, b, td');
    const label = headerCell?.textContent?.split(':')[0]?.trim()?.toLowerCase();
    if (label && hiddenPropertyKeys.has(label)) {
      row.remove();
    }
  });

  root.querySelectorAll('li, p, div').forEach((node) => {
    const text = node.textContent?.trim();
    if (!text) {
      return;
    }
    const label = text.split(':')[0]?.trim()?.toLowerCase();
    if (hiddenPropertyKeys.has(label)) {
      node.remove();
    }
  });
}

function attachPopupSanitizer(api) {
  if (!api?.map) {
    return () => {};
  }

  const handlePopupOpen = (event) => {
    sanitizePopupOrTooltipContent(event.popup?._contentNode);
  };
  const handleTooltipOpen = (event) => {
    sanitizePopupOrTooltipContent(event.tooltip?._contentNode);
  };

  api.map.on('popupopen', handlePopupOpen);
  api.map.on('tooltipopen', handleTooltipOpen);

  return () => {
    api.map.off('popupopen', handlePopupOpen);
    api.map.off('tooltipopen', handleTooltipOpen);
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildFeatureInfoTable(properties = {}, extraHiddenKeys = new Set()) {
  const rows = Object.entries(properties)
    .filter(([key, value]) => !shouldHideProperty(key) && !extraHiddenKeys.has(key) && value !== null && value !== '' && typeof value !== 'object')
    .map(
      ([key, value]) =>
        `<tr><th>${escapeHtml(key)}</th><td>${escapeHtml(value)}</td></tr>`,
    );

  if (rows.length === 0) {
    return '<div class="foliumpopup">No attributes available.</div>';
  }

  return `<div class="foliumpopup"><table><tbody>${rows.join('')}</tbody></table></div>`;
}

function getXmlElements(node, localName) {
  if (!node?.getElementsByTagNameNS) {
    return [];
  }

  return Array.from(node.getElementsByTagNameNS('*', localName));
}

function resolveAssetUrl(assetPath) {
  return new URL(assetPath.replace(/^\//, ''), document.baseURI || window.location.href).toString();
}

function parseKmlCoordinateString(text) {
  return String(text ?? '')
    .trim()
    .split(/\s+/)
    .map((chunk) => chunk.split(',').map((value) => Number(value)))
    .filter(([longitude, latitude]) => Number.isFinite(longitude) && Number.isFinite(latitude))
    .map(([longitude, latitude]) => [longitude, latitude]);
}

function closeLinearRing(coordinates) {
  if (coordinates.length === 0) {
    return coordinates;
  }

  const [firstLongitude, firstLatitude] = coordinates[0];
  const [lastLongitude, lastLatitude] = coordinates[coordinates.length - 1];
  if (firstLongitude === lastLongitude && firstLatitude === lastLatitude) {
    return coordinates;
  }

  return [...coordinates, coordinates[0]];
}

function parseKmlPolygonElement(polygonElement) {
  const outerBoundary = getXmlElements(polygonElement, 'outerBoundaryIs')[0];
  const outerCoordinatesText = getXmlElements(outerBoundary, 'coordinates')[0]?.textContent ?? '';
  const outerRing = closeLinearRing(parseKmlCoordinateString(outerCoordinatesText));

  if (outerRing.length < 4) {
    return null;
  }

  const innerRings = getXmlElements(polygonElement, 'innerBoundaryIs')
    .map((innerBoundary) => {
      const coordinatesText = getXmlElements(innerBoundary, 'coordinates')[0]?.textContent ?? '';
      return closeLinearRing(parseKmlCoordinateString(coordinatesText));
    })
    .filter((ring) => ring.length >= 4);

  return [outerRing, ...innerRings];
}

function parseKmlPlacemarkElement(placemarkElement) {
  const properties = {};
  getXmlElements(placemarkElement, 'SimpleData').forEach((field) => {
    const key = field.getAttribute('name');
    if (!key) {
      return;
    }

    properties[key] = field.textContent?.trim() ?? '';
  });

  const name = getXmlElements(placemarkElement, 'name')[0]?.textContent?.trim();
  if (name) {
    properties.name = name;
  }

  const polygons = getXmlElements(placemarkElement, 'Polygon')
    .map((polygonElement) => parseKmlPolygonElement(polygonElement))
    .filter(Boolean);

  if (polygons.length === 0) {
    return null;
  }

  const geometry =
    polygons.length === 1
      ? { type: 'Polygon', coordinates: polygons[0] }
      : { type: 'MultiPolygon', coordinates: polygons.map((polygon) => [polygon[0], ...polygon.slice(1)]) };

  return {
    type: 'Feature',
    properties,
    geometry,
  };
}

function parseKmlToGeoJson(text) {
  const xml = new window.DOMParser().parseFromString(text, 'application/xml');
  const parserError = xml.querySelector('parsererror');
  if (parserError) {
    throw new Error('Gandhinagar ward KML could not be parsed.');
  }

  const features = getXmlElements(xml, 'Placemark')
    .map((placemark) => parseKmlPlacemarkElement(placemark))
    .filter(Boolean);

  return {
    type: 'FeatureCollection',
    features,
  };
}

function projectLngLatToMeters(longitude, latitude, latitudeReferenceRadians) {
  const earthRadiusMeters = 6371008.8;
  const longitudeRadians = (longitude * Math.PI) / 180;
  const latitudeRadians = (latitude * Math.PI) / 180;

  return {
    x: earthRadiusMeters * longitudeRadians * Math.cos(latitudeReferenceRadians),
    y: earthRadiusMeters * latitudeRadians,
  };
}

function calculateRingAreaSquareMeters(ringCoordinates = []) {
  if (!Array.isArray(ringCoordinates) || ringCoordinates.length < 4) {
    return 0;
  }

  const latitudeAverage =
    ringCoordinates.reduce((sum, coordinate) => sum + Number(coordinate[1] ?? 0), 0) /
    ringCoordinates.length;
  const latitudeReferenceRadians = (latitudeAverage * Math.PI) / 180;

  let shoelaceArea = 0;
  for (let index = 0; index < ringCoordinates.length - 1; index += 1) {
    const current = ringCoordinates[index];
    const next = ringCoordinates[index + 1];
    const currentPoint = projectLngLatToMeters(current[0], current[1], latitudeReferenceRadians);
    const nextPoint = projectLngLatToMeters(next[0], next[1], latitudeReferenceRadians);
    shoelaceArea += currentPoint.x * nextPoint.y - nextPoint.x * currentPoint.y;
  }

  return Math.abs(shoelaceArea) / 2;
}

function calculatePolygonAreaSquareMeters(polygonCoordinates = []) {
  if (!Array.isArray(polygonCoordinates) || polygonCoordinates.length === 0) {
    return 0;
  }

  const [outerRing = [], ...innerRings] = polygonCoordinates;
  const outerArea = calculateRingAreaSquareMeters(outerRing);
  const holeArea = innerRings.reduce(
    (sum, ringCoordinates) => sum + calculateRingAreaSquareMeters(ringCoordinates),
    0,
  );

  return Math.max(outerArea - holeArea, 0);
}

function calculateGeometryAreaSquareKilometers(geometry) {
  if (!geometry?.type || !geometry?.coordinates) {
    return 0;
  }

  let areaSquareMeters = 0;
  if (geometry.type === 'Polygon') {
    areaSquareMeters = calculatePolygonAreaSquareMeters(geometry.coordinates);
  } else if (geometry.type === 'MultiPolygon') {
    areaSquareMeters = geometry.coordinates.reduce(
      (sum, polygonCoordinates) => sum + calculatePolygonAreaSquareMeters(polygonCoordinates),
      0,
    );
  }

  return areaSquareMeters / 1_000_000;
}

function normalizeWardName(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function resolveZoneWardLookupKey(wardName) {
  const normalized = normalizeWardName(wardName);
  const aliases = {
    stadium: 'spstadium',
  };

  return aliases[normalized] ?? normalized;
}

function unionZoneFeatures(features) {
  if (!Array.isArray(features) || features.length === 0) {
    return null;
  }

  if (!window.turf || features.length === 1) {
    return JSON.parse(JSON.stringify(features[0]));
  }

  try {
    const dissolved = window.turf.union(window.turf.featureCollection(features));
    if (dissolved) {
      return dissolved;
    }
  } catch (error) {
    console.warn('Zone dissolve fallback engaged.', error);
  }

  const combined = window.turf.combine(window.turf.featureCollection(features));
  return combined?.features?.[0] ?? JSON.parse(JSON.stringify(features[0]));
}

function buildZoneBoundaryGeoJson(wardGeojson) {
  const wardFeatures = Array.isArray(wardGeojson?.features) ? wardGeojson.features : [];
  const wardFeatureMap = new Map();

  wardFeatures.forEach((feature) => {
    const properties = feature?.properties ?? {};
    const lookupKey = resolveZoneWardLookupKey(
      properties.sourcewardname || properties.ward_lgd_name || properties.name,
    );
    if (lookupKey) {
      wardFeatureMap.set(lookupKey, feature);
    }
  });

  const zoneFeatures = zoneBoundaryDefinitions
    .map((zone) => {
      const missingWards = [];
      const matchedWardFeatures = zone.wards
        .map((wardName) => {
          const match = wardFeatureMap.get(resolveZoneWardLookupKey(wardName));
          if (!match) {
            missingWards.push(wardName);
          }
          return match;
        })
        .filter(Boolean);

      if (matchedWardFeatures.length === 0) {
        return null;
      }

      const dissolvedFeature = unionZoneFeatures(matchedWardFeatures);
      if (!dissolvedFeature?.geometry) {
        return null;
      }

      return {
        type: 'Feature',
        properties: {
          zone_name: zone.zoneName,
          ward_count: matchedWardFeatures.length,
          wards: zone.wards.join(', '),
          missing_wards: missingWards.join(', '),
        },
        geometry: dissolvedFeature.geometry,
      };
    })
    .filter(Boolean);

  return {
    type: 'FeatureCollection',
    features: zoneFeatures,
  };
}

function buildCityBoundaryGeoJson(wardGeojson) {
  const wardFeatures = Array.isArray(wardGeojson?.features) ? wardGeojson.features : [];
  if (wardFeatures.length === 0) {
    return { type: 'FeatureCollection', features: [] };
  }

  const dissolvedFeature = unionZoneFeatures(wardFeatures);
  if (!dissolvedFeature?.geometry) {
    return { type: 'FeatureCollection', features: [] };
  }

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          boundary_name: 'City Boundary',
          ward_count: wardFeatures.length,
        },
        geometry: dissolvedFeature.geometry,
      },
    ],
  };
}

function getWardBoundaryLayerStyle(isSelected = false) {
  if (isSelected) {
    return {
      color: '#1d4ed8',
      weight: 3.5,
      opacity: 1,
      fill: true,
      fillColor: '#60a5fa',
      fillOpacity: 0.18,
    };
  }

  return {
    color: '#000000',
    weight: 2,
    opacity: 0.95,
    fill: true,
    fillColor: '#000000',
    fillOpacity: 0.04,
  };
}

function getZoneBoundaryLayerStyle(isSelected = false) {
  if (isSelected) {
    return {
      color: '#7c3aed',
      weight: 4,
      opacity: 1,
      fill: true,
      fillColor: '#c4b5fd',
      fillOpacity: 0.22,
    };
  }

  return {
    color: '#4c1d95',
    weight: 3,
    opacity: 0.95,
    fill: true,
    fillColor: '#a78bfa',
    fillOpacity: 0.1,
  };
}

function buildZoneBoundaryPopupContent(feature) {
  const properties = feature?.properties ?? {};
  const areaSquareKilometers = calculateGeometryAreaSquareKilometers(feature?.geometry);

  return buildFeatureInfoTable({
    'Zone Name': properties.zone_name || 'Unknown',
    'Ward Count': properties.ward_count || 0,
    Wards: properties.wards || '',
    'Area (km2)': areaSquareKilometers > 0 ? areaSquareKilometers.toFixed(2) : '0.00',
  });
}

function getCityBoundaryLayerStyle(isSelected = false) {
  if (isSelected) {
    return {
      color: '#d97706',
      weight: 4,
      opacity: 1,
      fill: true,
      fillColor: '#fcd34d',
      fillOpacity: 0.14,
    };
  }

  return {
    color: '#111827',
    weight: 3,
    opacity: 0.98,
    fill: true,
    fillColor: '#111827',
    fillOpacity: 0.03,
  };
}

function getTimeSeriesValue(properties, key, index) {
  const values = properties?.timeseries?.[key];
  const value = Array.isArray(values) ? Number(values[index] ?? 0) : 0;
  return Number.isFinite(value) ? value : 0;
}

function formatSwmmNumber(value) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return '0';
  }
  if (Math.abs(numeric) >= 100) return numeric.toFixed(1);
  if (Math.abs(numeric) >= 10) return numeric.toFixed(2);
  return numeric.toFixed(3);
}

function formatMetricValue(value, unit) {
  const text = formatSwmmNumber(value);
  return unit ? `${text} ${unit}` : text;
}

function buildSummaryValue(item, unit, timeLabels = []) {
  if (!item || item.value == null) {
    return null;
  }

  const label = formatMetricValue(item.value, unit);
  const timeLabel = Number.isInteger(item.t_i) ? timeLabels[item.t_i] : null;
  return timeLabel ? `${label} at ${timeLabel}` : label;
}

function getNodeLayerVisual(properties, timeIndex, isSelected = false) {
  const depth = getTimeSeriesValue(properties, 'depth', timeIndex);
  const flooding = getTimeSeriesValue(properties, 'flooding', timeIndex);
  let fillColor = '#78d5e3';
  let strokeColor = '#0c5460';
  let radius = 4;

  if (depth > 1) {
    radius = 6;
    fillColor = '#4fa8ff';
    strokeColor = '#1e5f94';
  }

  if (depth > 2) {
    radius = 7;
    fillColor = '#1d78d8';
    strokeColor = '#174f87';
  }

  if (flooding > 0.001) {
    radius = 8;
    fillColor = '#f08c6c';
    strokeColor = '#a63d1f';
  }

  if (isSelected) {
    radius += 2;
    strokeColor = '#062f37';
  }

  return {
    radius,
    color: strokeColor,
    weight: isSelected ? 2.4 : 1.5,
    fillColor,
    fillOpacity: 0.92,
    opacity: 1,
  };
}

function getLinkLayerVisual(properties, timeIndex, isSelected = false) {
  const flow = Math.abs(getTimeSeriesValue(properties, 'flow', timeIndex));
  const capacity = getTimeSeriesValue(properties, 'capacity', timeIndex);
  const depth = getTimeSeriesValue(properties, 'depth', timeIndex);
  let color = '#1f6f8b';
  let weight = 2.5;
  let dashArray = '0';

  // Depth-based visual
  if (depth > 0.5) {
    color = '#0e4f63';
    weight = 3;
  }

  if (depth > 1.5) {
    color = '#0a3a52';
    weight = 3.5;
  }

  if (depth > 2.5) {
    color = '#052535';
    weight = 4;
  }

  // Flow-based width
  if (flow > 0.5) {
    weight = Math.max(weight, 3.5);
  }

  if (flow > 2) {
    weight = Math.max(weight, 4.5);
  }

  // Capacity stress indicator
  if (capacity > 0.6) {
    color = '#d99032';
    weight = Math.max(weight, 3.5);
  }

  if (capacity > 0.9) {
    color = '#c34d3c';
    weight = Math.max(weight, 5);
    dashArray = '4';
  }

  if (isSelected) {
    color = '#062f37';
    weight += 1.4;
    dashArray = '0';
  }

  return {
    color,
    weight,
    opacity: isSelected ? 1 : 0.92,
    dashArray,
  };
}

function applySwmmFeatureVisual(layer, kind, properties, timeIndex, isSelected = false) {
  if (kind === 'node') {
    const nextStyle = getNodeLayerVisual(properties, timeIndex, isSelected);
    if (typeof layer.setStyle === 'function') {
      layer.setStyle(nextStyle);
    }
    if (typeof layer.setRadius === 'function') {
      layer.setRadius(nextStyle.radius);
    }
  } else {
    const nextStyle = getLinkLayerVisual(properties, timeIndex, isSelected);
    if (typeof layer.setStyle === 'function') {
      layer.setStyle(nextStyle);
    }
  }

  if (isSelected && typeof layer.bringToFront === 'function') {
    layer.bringToFront();
  }
}

function updateSwmmTimeseriesVisualization(store, api, timeIndex, selectedFeature) {
  if (!store?.loaded || !api?.map) {
    return;
  }

  for (const config of swmmTimeseriesOverlayConfigs) {
    const layer = store.layers?.[config.key];
    if (!layer || !api.map.hasLayer(layer) || typeof layer.eachLayer !== 'function') {
      continue;
    }

    layer.eachLayer((childLayer) => {
      const properties = childLayer.feature?.properties ?? {};
      const currentId = config.kind === 'node' ? properties.NODE_ID : properties.LINK_ID;
      const isSelected = Boolean(selectedFeature && selectedFeature.kind === config.kind && selectedFeature.id === currentId);
      
      applySwmmFeatureVisual(childLayer, config.kind, properties, timeIndex, isSelected);
      
      if (typeof childLayer.setPopupContent === 'function' && childLayer.isPopupOpen?.()) {
        childLayer.setPopupContent(
          buildSelectedSwmmPopupContent(
            normalizeSelectedSwmmFeature(config.kind, properties),
            timeIndex,
          ),
        );
      }
    });
  }
}

function getSwmmFeatureLayer(store, selectedFeature) {
  if (!store?.layerIndex || !selectedFeature) {
    return null;
  }

  const layerKey = selectedFeature.kind === 'node' ? 'nodes' : 'links';
  return store.layerIndex[layerKey]?.[selectedFeature.id] ?? null;
}

function updateSwmmSelectedFeatureVisualization(store, api, timeIndex, previousFeature, nextFeature) {
  if (!store?.loaded || !api?.map) {
    return;
  }

  const previousLayer = getSwmmFeatureLayer(store, previousFeature);
  if (previousLayer) {
    const previousProperties = previousLayer.feature?.properties ?? {};
    applySwmmFeatureVisual(previousLayer, previousFeature.kind, previousProperties, timeIndex, false);
    if (typeof previousLayer.setPopupContent === 'function' && previousLayer.isPopupOpen?.()) {
      previousLayer.setPopupContent(buildSelectedSwmmPopupContent(previousFeature, timeIndex));
    }
  }

  const nextLayer = getSwmmFeatureLayer(store, nextFeature);
  if (nextLayer) {
    const nextProperties = nextLayer.feature?.properties ?? {};
    applySwmmFeatureVisual(nextLayer, nextFeature.kind, nextProperties, timeIndex, true);
    if (typeof nextLayer.setPopupContent === 'function') {
      nextLayer.setPopupContent(buildSelectedSwmmPopupContent(nextFeature, timeIndex));
    }
    if (typeof nextLayer.bringToFront === 'function') {
      nextLayer.bringToFront();
    }
  }
}

function refreshActiveSwmmPopup(store, timeIndex, selectedFeature, popupLayerRef) {
  const activeLayer = popupLayerRef.current;
  if (!activeLayer || !selectedFeature) {
    return;
  }

  if (typeof activeLayer.setPopupContent === 'function') {
    activeLayer.setPopupContent(buildSelectedSwmmPopupContent(selectedFeature, timeIndex));
  }
}

function openSwmmPopupForFeature(store, timeIndex, selectedFeature, popupLayerRef) {
  const nextLayer = getSwmmFeatureLayer(store, selectedFeature);
  const previousLayer = popupLayerRef.current;

  if (previousLayer && previousLayer !== nextLayer && typeof previousLayer.closePopup === 'function') {
    previousLayer.closePopup();
  }

  if (!nextLayer) {
    popupLayerRef.current = null;
    return;
  }

  const popupContent = buildSelectedSwmmPopupContent(selectedFeature, timeIndex);
  if (typeof nextLayer.bindPopup === 'function' && !nextLayer.getPopup?.()) {
    nextLayer.bindPopup(popupContent, {
      maxWidth: 360,
      className: 'foliumpopup',
    });
  } else if (typeof nextLayer.setPopupContent === 'function') {
    nextLayer.setPopupContent(popupContent);
  }

  if (typeof nextLayer.openPopup === 'function') {
    nextLayer.openPopup();
  }

  popupLayerRef.current = nextLayer;
}

function cleanupSwmmTimeseriesLayers(api, storeRef) {
  const store = storeRef.current;
  if (store?.layers && api?.map) {
    Object.values(store.layers).forEach((layer) => {
      if (layer && api.map.hasLayer(layer)) {
        api.map.removeLayer(layer);
      }
    });
  }

  storeRef.current = {
    cityId: null,
    loaded: false,
    loadPromise: null,
    layers: {},
    timeLabels: [],
    layerIndex: {
      nodes: {},
      links: {},
    },
  };
}

function normalizeSelectedSwmmFeature(kind, properties) {
  return {
    kind,
    id: kind === 'node' ? properties.NODE_ID : properties.LINK_ID,
    properties,
  };
}

async function ensureSwmmTimeseriesLayers(api, cityId, storeRef, options) {
  if (cityId !== 'gnr' || !api?.map || !window.L) {
    return null;
  }

  const store = storeRef.current;
  if (store.loaded && store.cityId === cityId) {
    return store;
  }

  if (store.loadPromise) {
    return store.loadPromise;
  }

  store.loadPromise = (async () => {
    const renderer = window.L.canvas({ padding: 0.5 });
    const configs = swmmTimeseriesOverlayConfigs.filter((config) => config.cityId === cityId);
    const payloads = await Promise.all(
      configs.map(async (config) => {
        const response = await fetch(resolveAssetUrl(config.url));
        if (!response.ok) {
          throw new Error(`Could not load ${config.label}.`);
        }
        try {
          return await response.json();
        } catch (e) {
          throw new Error(`Invalid JSON for ${config.label}: ${e.message}`);
        }
      }),
    );

    const nextStore = {
      cityId,
      loaded: true,
      loadPromise: null,
      layers: {},
      timeLabels: [],
      layerIndex: {
        nodes: {},
        links: {},
      },
    };

    configs.forEach((config, index) => {
      const geojson = payloads[index];
      const layer = window.L.geoJSON(geojson, {
        renderer,
        style: (feature) =>
          config.kind === 'link'
            ? getLinkLayerVisual(feature?.properties ?? {}, options.timeIndex ?? 0, false)
            : undefined,
        pointToLayer: (feature, latlng) =>
          window.L.circleMarker(latlng, {
            renderer,
            ...getNodeLayerVisual(feature?.properties ?? {}, options.timeIndex ?? 0, false),
          }),
        onEachFeature: (feature, featureLayer) => {
          const properties = feature?.properties ?? {};
          const normalizedFeature = normalizeSelectedSwmmFeature(config.kind, properties);
          nextStore.layerIndex[config.key][config.kind === 'node' ? properties.NODE_ID : properties.LINK_ID] = featureLayer;
          featureLayer.__swmmSelectedFeature = normalizedFeature;

          featureLayer.on('click', function(e) {
            e.stopPropagation();
            if (typeof options.onFeatureSelect === 'function') {
              options.onFeatureSelect(normalizedFeature, featureLayer);
            }
          });
        },
      });

      nextStore.layers[config.key] = layer;
      if (nextStore.timeLabels.length === 0) {
        nextStore.timeLabels = geojson?.features?.[0]?.properties?.timeseries_meta?.time ?? [];
      }
    });

    storeRef.current = nextStore;
    options.onTimeLabels?.(nextStore.timeLabels);
    updateSwmmTimeseriesVisualization(nextStore, api, options.timeIndex ?? 0, null);
    return nextStore;
  })();

  try {
    return await store.loadPromise;
  } finally {
    if (storeRef.current?.loadPromise) {
      storeRef.current.loadPromise = null;
    }
  }
}

function buildSelectedSwmmFeatureView(selectedFeature, timeIndex) {
  if (!selectedFeature) {
    return null;
  }

  const properties = selectedFeature.properties ?? {};
  const meta = properties.timeseries_meta ?? {};
  const units = meta.units ?? {};
  const timeLabels = meta.time ?? [];
  const clampedIndex = Math.max(0, Math.min(timeIndex, Math.max(timeLabels.length - 1, 0)));
  const timestamp = timeLabels[clampedIndex] ?? '';
  const summary = properties.summary ?? {};

  if (selectedFeature.kind === 'node') {
    const depthSeries = Array.isArray(properties.timeseries?.depth) ? properties.timeseries.depth.map((value) => Number(value) || 0) : [];
    return {
      title: properties.NODE_ID || 'Node',
      subtitle: 'Node time series',
      timestamp,
      metrics: [
        { label: 'Depth', value: formatMetricValue(getTimeSeriesValue(properties, 'depth', clampedIndex), units.depth || 'm') },
        { label: 'Flooding', value: formatMetricValue(getTimeSeriesValue(properties, 'flooding', clampedIndex), units.flooding || '') },
        { label: 'Total Flow', value: formatMetricValue(getTimeSeriesValue(properties, 'total_inflow', clampedIndex), units.total_inflow || '') },
        { label: 'Lateral Inflow', value: formatMetricValue(getTimeSeriesValue(properties, 'lateral_inflow', clampedIndex), units.lateral_inflow || '') },
      ],
      chart: {
        label: 'Depth Over Time',
        values: depthSeries,
        currentIndex: clampedIndex,
        currentValue: formatMetricValue(getTimeSeriesValue(properties, 'depth', clampedIndex), units.depth || 'm'),
      },
      summary: [],
    };
  }

  const flowSeries = Array.isArray(properties.timeseries?.flow) ? properties.timeseries.flow.map((value) => Number(value) || 0) : [];
  return {
    title: properties.LINK_ID || 'Conduit',
    subtitle: `${properties.FROM_NODE || properties.from_node_ts || 'From'} to ${properties.TO_NODE || properties.to_node_ts || 'To'}`,
    timestamp,
    metrics: [
      { label: 'Total Flow', value: formatMetricValue(getTimeSeriesValue(properties, 'flow', clampedIndex), units.flow || '') },
      { label: 'Depth', value: formatMetricValue(getTimeSeriesValue(properties, 'depth', clampedIndex), units.depth || 'm') },
      { label: 'Velocity', value: formatMetricValue(getTimeSeriesValue(properties, 'velocity', clampedIndex), units.velocity || 'm/s') },
      { label: 'Capacity', value: formatMetricValue(getTimeSeriesValue(properties, 'capacity', clampedIndex), units.capacity || '') },
    ],
    chart: {
      label: 'Flow Over Time',
      values: flowSeries,
      currentIndex: clampedIndex,
      currentValue: formatMetricValue(getTimeSeriesValue(properties, 'flow', clampedIndex), units.flow || ''),
    },
    summary: [],
  };
}


function buildSelectedSwmmPopupContent(selectedFeature, timeIndex) {
  if (!selectedFeature) {
    return '<div class="foliumpopup">No attributes available.</div>';
  }

  const properties = selectedFeature.properties ?? {};
  const meta = properties.timeseries_meta ?? {};
  const units = meta.units ?? {};
  const timeLabels = meta.time ?? [];
  const clampedIndex = Math.max(0, Math.min(timeIndex, Math.max(timeLabels.length - 1, 0)));
  const rows = [];
  const pushRow = (label, value) => {
    rows.push(`<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`);
  };

  if (selectedFeature.kind === 'node') {
    pushRow('NODE_ID', properties.NODE_ID || '');
    pushRow('Time', timeLabels[clampedIndex] || '');
    pushRow('Depth', formatMetricValue(getTimeSeriesValue(properties, 'depth', clampedIndex), units.depth || 'm'));
    pushRow('Flooding', formatMetricValue(getTimeSeriesValue(properties, 'flooding', clampedIndex), units.flooding || ''));
    pushRow('Total Flow', formatMetricValue(getTimeSeriesValue(properties, 'total_inflow', clampedIndex), units.total_inflow || ''));
    pushRow('Lateral Inflow', formatMetricValue(getTimeSeriesValue(properties, 'lateral_inflow', clampedIndex), units.lateral_inflow || ''));
  } else {
    pushRow('LINK_ID', properties.LINK_ID || '');
    pushRow('Time', timeLabels[clampedIndex] || '');
    pushRow('Total Flow', formatMetricValue(getTimeSeriesValue(properties, 'flow', clampedIndex), units.flow || ''));
    pushRow('Depth', formatMetricValue(getTimeSeriesValue(properties, 'depth', clampedIndex), units.depth || 'm'));
    pushRow('Velocity', formatMetricValue(getTimeSeriesValue(properties, 'velocity', clampedIndex), units.velocity || 'm/s'));
    pushRow('Capacity', formatMetricValue(getTimeSeriesValue(properties, 'capacity', clampedIndex), units.capacity || ''));
  }

  return `<div class="foliumpopup"><table><tbody>${rows.join('')}</tbody></table></div>`;
}

async function initializeSwmmOverlays(api, cityId) {
  if (!api?.map || !api?.layerControl || !window.L) {
    return [];
  }

  const applicableOverlays = swmmOverlayConfigs.filter((overlay) => overlay.cityId === cityId);
  const createdLayers = [];

  for (const overlay of applicableOverlays) {
    const existingEntry = Object.values(api.layerControl?._layers ?? {}).find(
      (entry) => entry?.overlay && entry.name === overlay.label,
    );
    if (existingEntry) {
      createdLayers.push(existingEntry.layer);
      continue;
    }

    const response = await fetch(overlay.url);
    if (!response.ok) {
      throw new Error(`Could not load ${overlay.label}.`);
    }

    const geojson = await response.json();
    const layer = window.L.geoJSON(geojson, {
      style: () =>
        overlay.styleType === 'line'
          ? {
              color: '#1f6f8b',
              weight: 3,
              opacity: 0.9,
            }
          : undefined,
      pointToLayer: (_feature, latlng) =>
        window.L.circleMarker(latlng, {
          radius: 5,
          color: '#0c5460',
          weight: 1.5,
          fillColor: '#78d5e3',
          fillOpacity: 0.92,
        }),
      onEachFeature: (feature, featureLayer) => {
        const properties = feature?.properties ?? {};
        const content = buildFeatureInfoTable(properties);
        featureLayer.bindPopup(content, {
          maxWidth: 360,
          className: 'foliumpopup',
        });
        featureLayer.on('click', () => {
          featureLayer.openPopup();
        });
      },
    });

    api.layerControl.addOverlay(layer, overlay.label);
    createdLayers.push(layer);
  }

  return createdLayers;
}

function removeOverlayEntry(api, overlayLabel) {
  const existingEntry = Object.values(api?.layerControl?._layers ?? {}).find(
    (entry) => entry?.overlay && entry.name === overlayLabel,
  );

  if (!existingEntry?.layer) {
    return { existingEntry: null, wasVisible: false };
  }

  const wasVisible = api.map.hasLayer(existingEntry.layer);
  if (wasVisible) {
    api.map.removeLayer(existingEntry.layer);
  }

  if (typeof api.layerControl.removeLayer === 'function') {
    api.layerControl.removeLayer(existingEntry.layer);
  }

  if (existingEntry.layer._leaflet_id && api.layerControl?._layers?.[existingEntry.layer._leaflet_id]) {
    delete api.layerControl._layers[existingEntry.layer._leaflet_id];
  }

  return { existingEntry, wasVisible };
}

function removeOverlayEntriesByPrefix(api, prefixes = []) {
  if (!Array.isArray(prefixes) || prefixes.length === 0) {
    return { removedCount: 0, hadVisibleLayer: false };
  }

  const overlayEntries = Object.values(api?.layerControl?._layers ?? {}).filter(
    (entry) =>
      entry?.overlay &&
      prefixes.some((prefix) => String(entry.name ?? '').startsWith(prefix)),
  );

  let hadVisibleLayer = false;
  overlayEntries.forEach((entry) => {
    const { wasVisible } = removeOverlayEntry(api, entry.name);
    if (wasVisible) {
      hadVisibleLayer = true;
    }
  });

  return {
    removedCount: overlayEntries.length,
    hadVisibleLayer,
  };
}

function collectGeoJsonFeatures(value, collector = []) {
  if (!value) {
    return collector;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectGeoJsonFeatures(item, collector));
    return collector;
  }

  if (value.type === 'FeatureCollection') {
    (value.features ?? []).forEach((feature) => {
      if (feature?.type === 'Feature') {
        collector.push(feature);
      }
    });
    return collector;
  }

  if (value.type === 'Feature') {
    collector.push(value);
    return collector;
  }

  if (typeof value === 'object') {
    Object.values(value).forEach((item) => collectGeoJsonFeatures(item, collector));
  }

  return collector;
}

function normalizeShapefileGeoJson(value) {
  return {
    type: 'FeatureCollection',
    features: collectGeoJsonFeatures(value),
  };
}

function getShapefileOverlayStyle(overlay, geometryType = '') {
  const normalizedType = String(geometryType).toLowerCase();
  const isPoint = normalizedType.includes('point');
  const isPolygon = normalizedType.includes('polygon');

  if (isPoint) {
    return getShapefilePointMarkerStyle(overlay);
  }

  return {
    color: overlay.color,
    weight: overlay.weight ?? 2.5,
    opacity: 0.95,
    lineCap: 'round',
    lineJoin: 'round',
    dashArray: overlay.dashArray,
    fill: isPolygon,
    fillColor: isPolygon ? overlay.fillColor ?? overlay.color : undefined,
    fillOpacity: isPolygon ? overlay.fillOpacity ?? 0.18 : 0,
  };
}

function getShapefilePointMarkerStyle(overlay) {
  return {
    radius: overlay.markerRadius ?? 6,
    stroke: overlay.markerStroke ?? true,
    color: overlay.color,
    weight: overlay.markerWeight ?? 1.8,
    fill: true,
    fillColor: overlay.fillColor ?? overlay.color,
    fillOpacity: overlay.markerFillOpacity ?? 0.92,
    opacity: 1,
  };
}

function collectCoordinatePairs(coordinates, collector = []) {
  if (!Array.isArray(coordinates)) {
    return collector;
  }

  if (
    coordinates.length >= 2 &&
    typeof coordinates[0] === 'number' &&
    typeof coordinates[1] === 'number'
  ) {
    collector.push([coordinates[0], coordinates[1]]);
    return collector;
  }

  coordinates.forEach((entry) => collectCoordinatePairs(entry, collector));
  return collector;
}

function getFeatureMarkerLatLng(feature) {
  const coordinates = collectCoordinatePairs(feature?.geometry?.coordinates);
  if (coordinates.length === 0) {
    return null;
  }

  let minLng = coordinates[0][0];
  let maxLng = coordinates[0][0];
  let minLat = coordinates[0][1];
  let maxLat = coordinates[0][1];

  coordinates.forEach(([lng, lat]) => {
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      return;
    }

    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  });

  return window.L.latLng((minLat + maxLat) / 2, (minLng + maxLng) / 2);
}

function getOverlayDisplayName(overlay) {
  return overlay?.popupTitle || String(overlay?.label ?? '').split('|').pop()?.trim() || 'Feature';
}

function getPopupFieldValue(properties = {}, key) {
  const value = properties?.[key];
  if (value == null) {
    return '';
  }

  const trimmed = String(value).trim();
  return trimmed;
}

function buildOverlayPopupContent(overlay, feature = {}) {
  const properties = feature?.properties ?? {};
  const rows = [];

  if (Array.isArray(overlay?.popupFields) && overlay.popupFields.length > 0) {
    overlay.popupFields.forEach((field) => {
      const value = getPopupFieldValue(properties, field.key);
      if (!value) {
        return;
      }

      rows.push(`<tr><th>${escapeHtml(field.label)}</th><td>${escapeHtml(value)}</td></tr>`);
    });
  }

  if (Array.isArray(overlay?.popupComputedMetrics) && overlay.popupComputedMetrics.length > 0) {
    overlay.popupComputedMetrics.forEach((metric) => {
      if (metric.type === 'area') {
        const areaSquareKilometers = calculateGeometryAreaSquareKilometers(feature?.geometry);
        if (areaSquareKilometers > 0) {
          rows.push(
            `<tr><th>${escapeHtml(metric.label)}</th><td>${escapeHtml(
              areaSquareKilometers.toFixed(metric.decimals ?? 2),
            )}</td></tr>`,
          );
        }
      }
    });
  }

  if (rows.length > 0) {
    return `
      <div class="foliumpopup">
        <div class="foliumpopup__title">${escapeHtml(getOverlayDisplayName(overlay))}</div>
        <table><tbody>${rows.join('')}</tbody></table>
      </div>
    `;
  }

  const infoTable = buildFeatureInfoTable(properties);
  return `
    <div class="foliumpopup">
      <div class="foliumpopup__title">${escapeHtml(getOverlayDisplayName(overlay))}</div>
      ${infoTable.replace('<div class="foliumpopup">', '').replace('</div>', '')}
    </div>
  `;
}

function createShapefilePointMarker(overlay, latlng) {
  return window.L.circleMarker(latlng, getShapefilePointMarkerStyle(overlay));
}

function createShapefilePointDotIcon(overlay) {
  const style = getShapefilePointMarkerStyle(overlay);
  const diameter = style.radius * 2;
  return window.L.divIcon({
    className: 'shapefile-point-dot-icon',
    iconSize: [diameter, diameter],
    iconAnchor: [diameter / 2, diameter / 2],
    html: `<span style="
      display:block;
      width:${diameter}px;
      height:${diameter}px;
      border-radius:50%;
      background:${style.fillColor};
      opacity:${style.fillOpacity};
      border:${style.weight}px solid ${style.color};
      box-sizing:border-box;
    "></span>`,
  });
}

function createPointSymbolOverlayLayer(overlay, geojson) {
  const clusteringEnabled = typeof window.L.markerClusterGroup === 'function';
  const markerLayer = clusteringEnabled
    ? window.L.markerClusterGroup({
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        maxClusterRadius: 45,
      })
    : window.L.featureGroup();
  const features = Array.isArray(geojson?.features) ? geojson.features : [];
  const dotIcon = clusteringEnabled ? createShapefilePointDotIcon(overlay) : null;

  features.forEach((feature) => {
    const latlng = getFeatureMarkerLatLng(feature);
    if (!latlng) {
      return;
    }

    const marker = clusteringEnabled
      ? window.L.marker(latlng, { icon: dotIcon })
      : createShapefilePointMarker(overlay, latlng);
    marker.bindPopup(buildOverlayPopupContent(overlay, feature), {
      maxWidth: 360,
      className: 'foliumpopup',
    });
    markerLayer.addLayer(marker);
  });

  return markerLayer;
}

async function initializeDrainageNetworkOverlays(api, cityId) {
  if (!api?.map || !api?.layerControl || !window.L) {
    return [];
  }

  if (typeof window.shp !== 'function') {
    throw new Error('Shapefile loader could not be initialized.');
  }

  const applicableOverlays = drainageNetworkOverlayConfigs.filter((overlay) => overlay.cityId === cityId);
  if (applicableOverlays.length === 0) {
    return [];
  }

  const { hadVisibleLayer } = removeOverlayEntriesByPrefix(api, removedDrainageOverlayPrefixes);
  const createdLayers = [];

  for (const overlay of applicableOverlays) {
    const existingEntry = Object.values(api.layerControl?._layers ?? {}).find(
      (entry) => entry?.overlay && entry.name === overlay.label,
    );
    if (existingEntry?.layer) {
      createdLayers.push(existingEntry.layer);
      continue;
    }

    const response = await fetch(resolveAssetUrl(overlay.url));
    if (!response.ok) {
      throw new Error(`Could not load ${overlay.label}.`);
    }

    const parsed = await window.shp(await response.arrayBuffer());
    const geojson = normalizeShapefileGeoJson(parsed);
    const layer = overlay.renderAsPoint
      ? createPointSymbolOverlayLayer(overlay, geojson)
      : window.L.geoJSON(geojson, {
          style: (feature) => getShapefileOverlayStyle(overlay, feature?.geometry?.type),
          pointToLayer: (_feature, latlng) => createShapefilePointMarker(overlay, latlng),
          onEachFeature: (feature, featureLayer) => {
            featureLayer.bindPopup(buildOverlayPopupContent(overlay, feature), {
              maxWidth: 360,
              className: 'foliumpopup',
            });
          },
        });

    api.layerControl.addOverlay(layer, overlay.label);
    if (hadVisibleLayer) {
      api.map.addLayer(layer);
    }

    createdLayers.push(layer);
  }

  return createdLayers;
}

async function initializeHydrologyOverlays(api, cityId) {
  if (!api?.map || !api?.layerControl || !window.L) {
    return [];
  }

  const applicableOverlays = hydrologyGeoJsonOverlayConfigs.filter((overlay) => overlay.cityId === cityId);
  if (applicableOverlays.length === 0) {
    return [];
  }

  const { hadVisibleLayer } = removeOverlayEntriesByPrefix(api, removedHydrologyOverlayPrefixes);
  const createdLayers = [];

  for (const overlay of applicableOverlays) {
    const existingEntry = Object.values(api.layerControl?._layers ?? {}).find(
      (entry) => entry?.overlay && entry.name === overlay.label,
    );
    if (existingEntry?.layer) {
      createdLayers.push(existingEntry.layer);
      continue;
    }

    const response = await fetch(resolveAssetUrl(overlay.url));
    if (!response.ok) {
      throw new Error(`Could not load ${overlay.label}.`);
    }

    const geojson = await response.json();
    const layer = window.L.geoJSON(geojson, {
      style: (feature) => getShapefileOverlayStyle(overlay, feature?.geometry?.type),
      pointToLayer: (_feature, latlng) => createShapefilePointMarker(overlay, latlng),
      onEachFeature: (feature, featureLayer) => {
        featureLayer.bindPopup(buildOverlayPopupContent(overlay, feature), {
          maxWidth: 360,
          className: 'foliumpopup',
        });
      },
    });

    api.layerControl.addOverlay(layer, overlay.label);
    if (hadVisibleLayer) {
      api.map.addLayer(layer);
    }

    createdLayers.push(layer);
  }

  return createdLayers;
}

async function initializeTransportGeoJsonOverlays(api, cityId) {
  if (!api?.map || !api?.layerControl || !window.L) {
    return [];
  }

  const applicableOverlays = transportGeoJsonOverlayConfigs.filter((overlay) => overlay.cityId === cityId);
  if (applicableOverlays.length === 0) {
    return [];
  }

  const createdLayers = [];

  for (const overlay of applicableOverlays) {
    const existingEntry = Object.values(api.layerControl?._layers ?? {}).find(
      (entry) => entry?.overlay && entry.name === overlay.label,
    );
    if (existingEntry?.layer) {
      createdLayers.push(existingEntry.layer);
      continue;
    }

    const response = await fetch(resolveAssetUrl(overlay.url));
    if (!response.ok) {
      throw new Error(`Could not load ${overlay.label}.`);
    }

    const geojson = await response.json();
    const layer = window.L.geoJSON(geojson, {
      style: (feature) => getShapefileOverlayStyle(overlay, feature?.geometry?.type),
      pointToLayer: (_feature, latlng) => createShapefilePointMarker(overlay, latlng),
      onEachFeature: (feature, featureLayer) => {
        featureLayer.bindPopup(buildOverlayPopupContent(overlay, feature), {
          maxWidth: 360,
          className: 'foliumpopup',
        });
      },
    });

    api.layerControl.addOverlay(layer, overlay.label);
    createdLayers.push(layer);
  }

  return createdLayers;
}

function getAdministrativeOverlayGeoJson(overlay, wardGeojson) {
  if (overlay.kind === 'zone') {
    return buildZoneBoundaryGeoJson(wardGeojson);
  }

  if (overlay.kind === 'city-boundary') {
    return buildCityBoundaryGeoJson(wardGeojson);
  }

  return wardGeojson;
}

function getAdministrativeOverlayStyle(overlay, isSelected = false) {
  if (overlay.kind === 'zone') {
    return getZoneBoundaryLayerStyle(isSelected);
  }

  if (overlay.kind === 'city-boundary') {
    return getCityBoundaryLayerStyle(isSelected);
  }

  return getWardBoundaryLayerStyle(isSelected);
}

async function initializeAdministrativeBoundaryOverrides(api, cityId) {
  if (!api?.map || !api?.layerControl || !window.L) {
    return [];
  }

  const applicableOverrides = administrativeBoundaryOverrideConfigs.filter(
    (overlay) => overlay.cityId === cityId,
  );
  const createdLayers = [];
  const geojsonCache = new Map();

  for (const overlay of applicableOverrides) {
    if (!geojsonCache.has(overlay.url)) {
      const response = await fetch(resolveAssetUrl(overlay.url));
      if (!response.ok) {
        throw new Error(`Could not load ${overlay.label}.`);
      }

      geojsonCache.set(overlay.url, parseKmlToGeoJson(await response.text()));
    }

    const wardGeojson = geojsonCache.get(overlay.url);
    const geojson = getAdministrativeOverlayGeoJson(overlay, wardGeojson);
    const { wasVisible } = removeOverlayEntry(api, overlay.sourceLabel ?? overlay.label);
    let selectedWardLayer = null;

    const layer = window.L.geoJSON(geojson, {
      interactive: true,
      style: () => getAdministrativeOverlayStyle(overlay, false),
      onEachFeature: (feature, featureLayer) => {
        if (overlay.kind === 'zone') {
          const zoneName = feature?.properties?.zone_name;
          if (zoneName) {
            featureLayer.bindTooltip(zoneName, {
              permanent: true,
              direction: 'center',
              className: 'dashboard-zone-label',
              opacity: 1,
            });
          }
        }

        featureLayer.on('click', () => {
          if (selectedWardLayer && selectedWardLayer !== featureLayer) {
            selectedWardLayer.setStyle(getAdministrativeOverlayStyle(overlay, false));
          }

          selectedWardLayer = featureLayer;
          featureLayer.setStyle(getAdministrativeOverlayStyle(overlay, true));
          if (typeof featureLayer.bringToFront === 'function') {
            featureLayer.bringToFront();
          }
        });
      },
    });

    if (typeof layer.bringToFront === 'function') {
      layer.bringToFront();
    }

    api.layerControl.addOverlay(layer, overlay.label);
    if (wasVisible) {
      api.map.addLayer(layer);
    }

    createdLayers.push(layer);
  }

  return createdLayers;
}

function parseCsvRows(text) {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return [];
  }

  const headers = lines[0].split(',').map((value) => value.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((value) => value.trim());
    return headers.reduce((row, header, index) => {
      row[header] = values[index] ?? '';
      return row;
    }, {});
  });
}

async function initializeSensorOverlays(api, cityId) {
  if (!api?.map || !api?.layerControl || !window.L) {
    return [];
  }

  const applicableOverlays = sensorOverlayConfigs.filter((overlay) => overlay.cityId === cityId);
  const createdLayers = [];
  const paneName = 'sensorPane';

  if (!api.map.getPane(paneName)) {
    const pane = api.map.createPane(paneName);
    pane.style.zIndex = '640';
  }

  for (const overlay of applicableOverlays) {
    const existingEntry = Object.values(api.layerControl?._layers ?? {}).find(
      (entry) => entry?.overlay && entry.name === overlay.label,
    );
    if (existingEntry) {
      createdLayers.push(existingEntry.layer);
      continue;
    }

    const response = await fetch(resolveAssetUrl(overlay.url));
    if (!response.ok) {
      throw new Error(`Could not load ${overlay.label}.`);
    }

    const rows = parseCsvRows(await response.text());
    const markerLayer = window.L.featureGroup();

    rows.forEach((row) => {
      const latitude = Number(row.latitude);
      const longitude = Number(row.longitude);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return;
      }

      const marker = window.L.circleMarker([latitude, longitude], {
        pane: paneName,
        radius: 7,
        color: '#8F2D18',
        weight: 2,
        fillColor: '#FF8A5B',
        fillOpacity: 0.9,
      });

      marker.bindPopup(
        buildFeatureInfoTable({
          rank: row.rank,
          flood_id: row.flood_id,
          latitude,
          longitude,
        }),
        {
          maxWidth: 320,
          className: 'foliumpopup',
        },
      );

      markerLayer.addLayer(marker);
    });

    api.layerControl.addOverlay(markerLayer, overlay.label);
    api.map.addLayer(markerLayer);
    createdLayers.push(markerLayer);
  }

  return createdLayers;
}

function getTrafficMarkerColor(speedRatio) {
  if (!Number.isFinite(speedRatio)) {
    return '#9ca3af';
  }
  if (speedRatio >= 0.85) {
    return '#22c55e';
  }
  if (speedRatio >= 0.65) {
    return '#f97316';
  }
  return '#ef4444';
}

function getTrafficStatusLabel(speedRatio) {
  if (!Number.isFinite(speedRatio)) {
    return 'Unknown';
  }
  if (speedRatio >= 0.85) {
    return 'Smooth';
  }
  if (speedRatio >= 0.65) {
    return 'Moderate';
  }
  return 'Heavy';
}

function buildTrafficPopupContent(point) {
  const color = getTrafficMarkerColor(point.speed_ratio);
  const status = getTrafficStatusLabel(point.speed_ratio);
  const currentSpeed = point.currentSpeed_kmph ?? '—';
  const freeFlowSpeed = point.freeFlowSpeed_kmph ?? '—';
  const ratioPercent = point.speed_ratio != null ? `${(point.speed_ratio * 100).toFixed(1)}%` : '—';
  const updated = point.timestamp_local ?? 'Unknown';

  return `
    <div style="font-family:'Inter',sans-serif;min-width:190px">
      <div style="font-weight:700;font-size:13px;margin-bottom:6px">${escapeHtml(point.name ?? 'Traffic point')}</div>
      <div style="font-size:12px;color:#555;margin-bottom:6px">Updated: ${escapeHtml(updated)}</div>
      <div style="display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:${color};margin-bottom:6px">
        <span style="width:8px;height:8px;border-radius:50%;background:${color};display:inline-block"></span>
        ${status}
      </div>
      <div style="font-size:12px;color:#333">Speed: <strong>${escapeHtml(String(currentSpeed))} km/h</strong></div>
      <div style="font-size:12px;color:#333">Free-flow: <strong>${escapeHtml(String(freeFlowSpeed))} km/h</strong></div>
      <div style="font-size:12px;color:#333">Ratio: <strong>${escapeHtml(ratioPercent)}</strong></div>
    </div>
  `;
}

async function fetchTrafficSnapshot(overlay) {
  const response = await fetch(resolveAssetUrl(overlay.url), { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Could not load ${overlay.label}.`);
  }
  return response.json();
}

function renderTrafficMarkers(markerLayer, paneName, snapshot, markerIndexRef, onPointsUpdate) {
  markerLayer.clearLayers();
  const points = Array.isArray(snapshot?.points) ? snapshot.points : [];
  const markerIndex = {};

  points.forEach((point) => {
    const latitude = Number(point.query_lat);
    const longitude = Number(point.query_lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }

    const color = getTrafficMarkerColor(point.speed_ratio);
    const marker = window.L.circleMarker([latitude, longitude], {
      pane: paneName,
      radius: 8,
      color,
      weight: 2,
      fillColor: color,
      fillOpacity: 0.85,
    });

    marker.bindPopup(buildTrafficPopupContent(point), {
      maxWidth: 320,
      className: 'foliumpopup',
    });

    markerLayer.addLayer(marker);
    markerIndex[point.name] = marker;
  });

  if (markerIndexRef) {
    markerIndexRef.current = markerIndex;
  }
  onPointsUpdate?.(points);
}

async function initializeTrafficOverlays(api, cityId, refreshTimerStoreRef, markerIndexRef, onPointsUpdate) {
  if (!api?.map || !api?.layerControl || !window.L) {
    return [];
  }

  const applicableOverlays = trafficOverlayConfigs.filter((overlay) => overlay.cityId === cityId);
  const createdLayers = [];
  const paneName = 'trafficPane';

  if (!api.map.getPane(paneName)) {
    const pane = api.map.createPane(paneName);
    pane.style.zIndex = '630';
  }

  for (const overlay of applicableOverlays) {
    const existingEntry = Object.values(api.layerControl?._layers ?? {}).find(
      (entry) => entry?.overlay && entry.name === overlay.label,
    );
    if (existingEntry) {
      createdLayers.push(existingEntry.layer);
      continue;
    }

    const markerLayer = window.L.featureGroup();

    try {
      const snapshot = await fetchTrafficSnapshot(overlay);
      renderTrafficMarkers(markerLayer, paneName, snapshot, markerIndexRef, onPointsUpdate);
    } catch (error) {
      console.warn(`Initial load of ${overlay.label} failed.`, error);
    }

    api.layerControl.addOverlay(markerLayer, overlay.label);
    createdLayers.push(markerLayer);

    if (overlay.refreshIntervalMs > 0) {
      const timerId = window.setInterval(async () => {
        try {
          const snapshot = await fetchTrafficSnapshot(overlay);
          renderTrafficMarkers(markerLayer, paneName, snapshot, markerIndexRef, onPointsUpdate);
        } catch (error) {
          console.warn(`Refresh of ${overlay.label} failed.`, error);
        }
      }, overlay.refreshIntervalMs);

      refreshTimerStoreRef.current.push(timerId);
    }
  }

  return createdLayers;
}

function buildSections(api, collapsedMap) {
  const sections = new Map();
  const overlayEntries = Object.values(api?.layerControl?._layers ?? {}).filter((entry) => entry?.overlay);

  overlayEntries.forEach((entry) => {
    const fullLabel = entry.name.trim();
    const parts = fullLabel.split('|').map((part) => part.trim());
    const sectionName = parts.length > 1 ? parts[0] : 'General';
    const itemName = parts.length > 1 ? parts.slice(1).join(' | ') : parts[0];

    if (!sections.has(sectionName)) {
      sections.set(sectionName, []);
    }

    sections.get(sectionName).push({
      fullLabel,
      name: itemName,
      checked: api?.map?.hasLayer(entry.layer) ?? false,
    });
  });

  return Array.from(sections.entries())
    .map(([name, items], index) => ({
      name,
      collapsed: collapsedMap[name] ?? (name === 'SWMM Drainage'),
      items,
      index,
    }))
    .sort((left, right) => {
      if (left.name === 'Administrative / Boundaries' && right.name !== 'Administrative / Boundaries') {
        return -1;
      }

      if (right.name === 'Administrative / Boundaries' && left.name !== 'Administrative / Boundaries') {
        return 1;
      }

      return left.index - right.index;
    })
    .map(({ index, ...section }) => section);
}

function ensureDefaultVisibleOverlays(api, overlayNames = []) {
  if (!api?.map || !api?.layerControl?._layers || overlayNames.length === 0) {
    return;
  }

  overlayNames.forEach((overlayName) => {
    const layerEntry = Object.values(api.layerControl._layers).find(
      (entry) => entry?.overlay && entry.name === overlayName,
    );

    if (layerEntry?.layer && !api.map.hasLayer(layerEntry.layer)) {
      api.map.addLayer(layerEntry.layer);
    }
  });
}

function focusOverlayBounds(api, overlayName) {
  if (!api?.map || !api?.layerControl?._layers || !overlayName) {
    return;
  }

  const layerEntry = Object.values(api.layerControl._layers).find(
    (entry) => entry?.overlay && entry.name === overlayName,
  );

  if (!layerEntry?.layer || typeof layerEntry.layer.getBounds !== 'function') {
    return;
  }

  const bounds = layerEntry.layer.getBounds();
  if (bounds?.isValid?.()) {
    api.map.fitBounds(bounds, { padding: [24, 24] });
  }
}

export default function App() {
  const [selectedCityId, setSelectedCityId] = useState(cityDashboards[0].id);
  const [loading, setLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Starting dashboard experience...');
  const [error, setError] = useState('');
  const [infoSidebarOpen, setInfoSidebarOpen] = useState(true);
  const [layerSidebarOpen, setLayerSidebarOpen] = useState(false);
  const [sections, setSections] = useState([]);
  const [collapsedMap, setCollapsedMap] = useState({});
  const [swmmSectionCollapsed, setSwmmSectionCollapsed] = useState(true);
  const [swmmLayerVisibility, setSwmmLayerVisibility] = useState({ nodes: false, links: false });
  const [swmmLayersLoading, setSwmmLayersLoading] = useState(false);
  const [swmmTimeLabels, setSwmmTimeLabels] = useState([]);
  const [swmmTimeIndex, setSwmmTimeIndex] = useState(0);
  const [selectedSwmmFeature, setSelectedSwmmFeature] = useState(null);
  const [basemapType, setBasemapType] = useState('google-streets');
  const [demOpacity, setDemOpacity] = useState(0.72);
  const [googleBasemapEnabled, setGoogleBasemapEnabled] = useState(false);
  const [trafficPoints, setTrafficPoints] = useState([]);
  const [trafficPanelCollapsed, setTrafficPanelCollapsed] = useState(false);
  const [trafficStatusFilter, setTrafficStatusFilter] = useState('All');
  const mapApiRef = useRef(null);
  const demLayerRef = useRef(null);
  const trafficRefreshTimersRef = useRef([]);
  const trafficMarkerIndexRef = useRef({});
  const googleMapRef = useRef(null);
  const leafletBasemapLayersRef = useRef({ osm: null, cartodb: null, satellite: null });
  const collapsedMapRef = useRef({});
  const swmmTimeseriesLayersRef = useRef({ cityId: null, loaded: false, loadPromise: null, layers: {}, timeLabels: [] });
  const swmmFeatureSelectCallbackRef = useRef(null);
  const previousSelectedSwmmFeatureRef = useRef(null);
  const activeSwmmPopupLayerRef = useRef(null);
  const selectedCity = useMemo(() => getCityById(selectedCityId), [selectedCityId]);

  const allCollapsed = useMemo(
    () => sections.length > 0 && sections.every((section) => section.collapsed),
    [sections],
  );

  const refreshSections = () => {
    if (!mapApiRef.current) {
      return;
    }

    setSections(buildSections(mapApiRef.current, collapsedMapRef.current));
  };

  useEffect(() => {
    collapsedMapRef.current = collapsedMap;
  }, [collapsedMap]);

  useEffect(() => {
    cleanupSwmmTimeseriesLayers(mapApiRef.current, swmmTimeseriesLayersRef);
    setCollapsedMap({});
    collapsedMapRef.current = {};
    setSections([]);
    setSwmmSectionCollapsed(true);
    setSwmmLayerVisibility({ nodes: false, links: false });
    setSwmmLayersLoading(false);
    setSwmmTimeLabels([]);
    setSwmmTimeIndex(0);
    setSelectedSwmmFeature(null);
    previousSelectedSwmmFeatureRef.current = null;
    activeSwmmPopupLayerRef.current = null;
    setLoading(true);
  }, [selectedCityId]);

  useEffect(() => {
    let cancelled = false;
    let cleanupSync = null;
    let cleanupPopupSanitizer = null;

    const syncSections = () => {
      if (!mapApiRef.current || cancelled) {
        return;
      }

      refreshSections();
    };

    const initialize = async () => {
      setError('');
      setLoadingMessage(`Loading ${selectedCity.loadingLabel} dashboard styles and interface...`);
      for (const stylesheet of externalStylesheets) {
        await loadStylesheet(stylesheet);
      }

      window.L_NO_TOUCH = false;
      window.L_DISABLE_3D = false;

      setLoadingMessage(`Loading ${selectedCity.loadingLabel} map libraries...`);
      for (const script of externalScripts) {
        await loadScript(script);
      }

      if (cancelled) {
        return;
      }

      setLoadingMessage(`Rendering ${selectedCity.loadingLabel} geospatial layers...`);
      const api = bootstrapLeafletDashboard('gnr-dashboard-map');
      if (!api) {
        throw new Error('Dashboard initialization function is unavailable.');
      }

      mapApiRef.current = api;
      removedAdministrativeOverlayLabels.forEach((overlayLabel) => {
        removeOverlayEntry(api, overlayLabel);
      });
      removeOverlayEntriesByPrefix(api, removedDashboardOverlayPrefixes);
      setLoadingMessage(`Preparing ${selectedCity.loadingLabel} basemap and overlays...`);
      await initializeAdministrativeBoundaryOverrides(api, selectedCity.id);
      await initializeDrainageNetworkOverlays(api, selectedCity.id);
      await initializeHydrologyOverlays(api, selectedCity.id);
      await initializeTransportGeoJsonOverlays(api, selectedCity.id);
      await initializeTrafficOverlays(
        api,
        selectedCity.id,
        trafficRefreshTimersRef,
        trafficMarkerIndexRef,
        setTrafficPoints,
      );
      demLayerRef.current = await initializeDemOverlay(api, selectedCity.demOverlay);
      demLayerRef.current?.setOpacity(demOpacity);
      ensureDefaultVisibleOverlays(api, selectedCity.defaultVisibleOverlays);
      focusOverlayBounds(api, selectedCity.initialFocusOverlay);
      applyBasemapSelection(api, leafletBasemapLayersRef, basemapType, null);
      cleanupPopupSanitizer = attachPopupSanitizer(api);
      document.querySelector('.leaflet-control-layers')?.classList.add('dashboard-native-layer-control');
      syncSections();

      api.map.on('overlayadd', syncSections);
      api.map.on('overlayremove', syncSections);

      const googleMap = await initializeGoogleBasemap('gnr-google-basemap');
      if (cancelled) {
        return;
      }

      if (googleMap) {
        googleMapRef.current = googleMap;
        setGoogleBasemapEnabled(true);
        applyBasemapSelection(api, leafletBasemapLayersRef, basemapType, googleMap);
        cleanupSync = syncGoogleBasemap(api.map, googleMap);
      } else {
        setGoogleBasemapEnabled(false);
      }

      setLoadingMessage(`Finalizing ${selectedCity.loadingLabel} map frame...`);
      setLoading(false);
    };

    initialize().catch((error) => {
      console.error(error);
      setError(error.message);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      cleanupSync?.();
      cleanupPopupSanitizer?.();
      if (mapApiRef.current?.map) {
        mapApiRef.current.map.off('overlayadd', syncSections);
        mapApiRef.current.map.off('overlayremove', syncSections);
      }
      if (mapApiRef.current?.map) {
        mapApiRef.current.map.remove();
        mapApiRef.current = null;
      }
      cleanupSwmmTimeseriesLayers(mapApiRef.current, swmmTimeseriesLayersRef);
      activeSwmmPopupLayerRef.current = null;
      leafletBasemapLayersRef.current = { osm: null, cartodb: null, satellite: null };
      demLayerRef.current = null;
      trafficRefreshTimersRef.current.forEach((timerId) => window.clearInterval(timerId));
      trafficRefreshTimersRef.current = [];
      trafficMarkerIndexRef.current = {};
      setTrafficPoints([]);
      googleMapRef.current = null;
      setGoogleBasemapEnabled(false);
    };
  }, [selectedCity]);

  useEffect(() => {
    if (!mapApiRef.current?.map) {
      return;
    }

    applyBasemapSelection(
      mapApiRef.current,
      leafletBasemapLayersRef,
      basemapType,
      googleBasemapEnabled ? googleMapRef.current : null,
    );
  }, [basemapType, googleBasemapEnabled]);

  useEffect(() => {
    demLayerRef.current?.setOpacity(demOpacity);
  }, [demOpacity]);

  useEffect(() => {
    if (!mapApiRef.current?.map) {
      return;
    }

    const timeout = window.setTimeout(() => {
      mapApiRef.current?.map.invalidateSize();
    }, 320);

    return () => window.clearTimeout(timeout);
  }, [infoSidebarOpen, layerSidebarOpen]);

  useEffect(() => {
    if (!mapApiRef.current?.map || !swmmTimeseriesLayersRef.current.loaded) {
      return;
    }

    updateSwmmTimeseriesVisualization(
      swmmTimeseriesLayersRef.current,
      mapApiRef.current,
      swmmTimeIndex,
      selectedSwmmFeature,
    );
  }, [swmmTimeIndex]);

  useEffect(() => {
    if (!mapApiRef.current?.map || !swmmTimeseriesLayersRef.current.loaded) {
      previousSelectedSwmmFeatureRef.current = selectedSwmmFeature;
      return;
    }

    updateSwmmSelectedFeatureVisualization(
      swmmTimeseriesLayersRef.current,
      mapApiRef.current,
      swmmTimeIndex,
      previousSelectedSwmmFeatureRef.current,
      selectedSwmmFeature,
    );
    previousSelectedSwmmFeatureRef.current = selectedSwmmFeature;
  }, [selectedSwmmFeature, swmmTimeIndex]);

  const handleToggleLayer = (fullLabel) => {
    const api = mapApiRef.current;
    if (!api?.map || !api?.layerControl?._layers) {
      return;
    }

    const layerEntry = Object.values(api.layerControl._layers).find(
      (entry) => entry?.overlay && entry.name === fullLabel,
    );

    if (!layerEntry?.layer) {
      return;
    }

    if (api.map.hasLayer(layerEntry.layer)) {
      api.map.removeLayer(layerEntry.layer);
    } else {
      api.map.addLayer(layerEntry.layer);
    }

    refreshSections();
  };

  const handleUntickAll = () => {
    const api = mapApiRef.current;
    if (!api?.map || !api?.layerControl?._layers) {
      return;
    }

    Object.values(api.layerControl._layers).forEach((entry) => {
      if (entry?.overlay && entry.layer && api.map.hasLayer(entry.layer)) {
        api.map.removeLayer(entry.layer);
      }
    });

    refreshSections();
  };

  const handleToggleSection = (sectionName) => {
    setCollapsedMap((current) => ({
      ...current,
      [sectionName]: !current[sectionName],
    }));
    setSections((current) =>
      current.map((section) =>
        section.name === sectionName
          ? { ...section, collapsed: !section.collapsed }
          : section,
      ),
    );
  };

  const handleToggleAllSections = () => {
    const nextValue = !allCollapsed;
    const nextMap = Object.fromEntries(sections.map((section) => [section.name, nextValue]));
    setCollapsedMap(nextMap);
    setSections((current) => current.map((section) => ({ ...section, collapsed: nextValue })));
  };


  const handleToggleSwmmSection = () => {
    setSwmmSectionCollapsed((current) => !current);
  };

  const handleToggleTrafficPanel = () => {
    setTrafficPanelCollapsed((current) => !current);
  };

  const ensureTrafficLayerVisible = () => {
    const api = mapApiRef.current;
    if (!api?.map || !api?.layerControl?._layers) {
      return;
    }

    const entry = Object.values(api.layerControl._layers).find(
      (candidate) => candidate?.overlay && candidate.name === 'Transport | Live Traffic',
    );
    if (entry?.layer && !api.map.hasLayer(entry.layer)) {
      api.map.addLayer(entry.layer);
      refreshSections();
    }
  };

  const handleFocusTrafficPoint = (pointName) => {
    const api = mapApiRef.current;
    const marker = trafficMarkerIndexRef.current[pointName];
    if (!api?.map || !marker) {
      return;
    }

    ensureTrafficLayerVisible();
    api.map.setView(marker.getLatLng(), Math.max(api.map.getZoom(), 15));
    marker.openPopup();
  };

  const handleHoverTrafficPoint = (pointName) => {
    const api = mapApiRef.current;
    const marker = trafficMarkerIndexRef.current[pointName];
    if (!api?.map || !marker) {
      return;
    }

    ensureTrafficLayerVisible();
    api.map.panTo(marker.getLatLng(), { animate: true, duration: 0.4 });
    marker.setStyle({ radius: 12, weight: 3 });
    marker.bringToFront();
  };

  const handleUnhoverTrafficPoint = (pointName) => {
    const marker = trafficMarkerIndexRef.current[pointName];
    if (!marker) {
      return;
    }

    marker.setStyle({ radius: 8, weight: 2 });
  };

  const handleToggleSwmmLayer = async (layerKey) => {
    const api = mapApiRef.current;
    if (!api?.map || selectedCity.id !== 'gnr') {
      return;
    }

    const nextChecked = !swmmLayerVisibility[layerKey];
    setSwmmLayersLoading(true);

    try {
      swmmFeatureSelectCallbackRef.current = (feature) => {
        setSelectedSwmmFeature(feature);
        setSwmmSectionCollapsed(false);
      };

      const store = await ensureSwmmTimeseriesLayers(api, selectedCity.id, swmmTimeseriesLayersRef, {
        timeIndex: swmmTimeIndex,
        onTimeLabels: setSwmmTimeLabels,
        onFeatureSelect: swmmFeatureSelectCallbackRef.current,
      });

      if (!store?.layers?.[layerKey]) {
        return;
      }

      const layer = store.layers[layerKey];
      if (nextChecked) {
        if (!api.map.hasLayer(layer)) {
          api.map.addLayer(layer);
        }
      } else if (api.map.hasLayer(layer)) {
        api.map.removeLayer(layer);
      }

      setSwmmLayerVisibility((current) => ({
        ...current,
        [layerKey]: nextChecked,
      }));

      if (!nextChecked) {
        const deselectedKind = layerKey === 'nodes' ? 'node' : 'link';
        setSelectedSwmmFeature((current) => (current?.kind === deselectedKind ? null : current));
      }

      updateSwmmTimeseriesVisualization(store, api, swmmTimeIndex, selectedSwmmFeature);
    } catch (layerError) {
      console.error(layerError);
      setError(layerError.message);
    } finally {
      setSwmmLayersLoading(false);
    }
  };

  const swmmLayerItems = useMemo(() => {
    if (selectedCity.id !== 'gnr') {
      return [];
    }

    return swmmTimeseriesOverlayConfigs
      .filter((config) => config.cityId === selectedCity.id)
      .map((config) => ({
        key: config.key,
        label: config.label,
        checked: swmmLayerVisibility[config.key] ?? false,
      }));
  }, [selectedCity.id, swmmLayerVisibility]);

  const swmmSelectedFeatureView = useMemo(
    () => buildSelectedSwmmFeatureView(selectedSwmmFeature, swmmTimeIndex),
    [selectedSwmmFeature, swmmTimeIndex],
  );

  const trafficPanelItems = useMemo(() => {
    return trafficPoints
      .map((point) => ({
        name: point.name,
        speed: point.currentSpeed_kmph,
        speedRatio: point.speed_ratio,
        status: getTrafficStatusLabel(point.speed_ratio),
        updated: point.timestamp_local ?? null,
      }))
      .sort((left, right) => {
        const leftRatio = Number.isFinite(left.speedRatio) ? left.speedRatio : 1;
        const rightRatio = Number.isFinite(right.speedRatio) ? right.speedRatio : 1;
        return leftRatio - rightRatio;
      });
  }, [trafficPoints]);

  const trafficLayerChecked = useMemo(() => {
    for (const section of sections) {
      const item = section.items.find((entry) => entry.fullLabel === 'Transport | Live Traffic');
      if (item) {
        return item.checked;
      }
    }
    return false;
  }, [sections]);

  const trafficSummary = useMemo(() => {
    if (!trafficLayerChecked) {
      return null;
    }

    return trafficPanelItems.reduce(
      (summary, item) => {
        if (item.status === 'Smooth') summary.smooth += 1;
        else if (item.status === 'Moderate') summary.moderate += 1;
        else if (item.status === 'Heavy') summary.heavy += 1;
        return summary;
      },
      { smooth: 0, moderate: 0, heavy: 0 },
    );
  }, [trafficPanelItems, trafficLayerChecked]);

  const filteredTrafficPanelItems = useMemo(() => {
    if (trafficStatusFilter === 'All') {
      return trafficPanelItems;
    }
    return trafficPanelItems.filter((item) => item.status === trafficStatusFilter);
  }, [trafficPanelItems, trafficStatusFilter]);

  return (
    <div className="dashboard-app">
      <DashboardSidebar
        isInfoOpen={infoSidebarOpen}
        isLayerOpen={layerSidebarOpen}
        cities={cityDashboards}
        selectedCityId={selectedCity.id}
        selectedCityTitle={selectedCity.title}
        selectedCitySubtitle={selectedCity.subtitle}
        sourceLabel={selectedCity.sourceLabel}
        sections={sections}
        onCityChange={setSelectedCityId}
        onCloseInfo={() => setInfoSidebarOpen(false)}
        onCloseLayers={() => setLayerSidebarOpen(false)}
        onToggleSection={handleToggleSection}
        onToggleLayer={handleToggleLayer}
        demOpacity={demOpacity}
        onDemOpacityChange={setDemOpacity}
        swmmSectionVisible={false}
        swmmSectionCollapsed={swmmSectionCollapsed}
        swmmLayersLoading={swmmLayersLoading}
        swmmLayerItems={swmmLayerItems}
        swmmTimeLabels={swmmTimeLabels}
        swmmTimeIndex={swmmTimeIndex}
        swmmSelectedFeature={swmmSelectedFeatureView}
        onToggleSwmmSection={handleToggleSwmmSection}
        onToggleSwmmLayer={handleToggleSwmmLayer}
        onSwmmTimeIndexChange={setSwmmTimeIndex}
        trafficPanelVisible={trafficPanelItems.length > 0}
        trafficPanelCollapsed={trafficPanelCollapsed}
        trafficPanelItems={filteredTrafficPanelItems}
        trafficPanelTotal={trafficPanelItems.length}
        trafficSummary={trafficSummary}
        trafficStatusFilter={trafficStatusFilter}
        onTrafficStatusFilterChange={setTrafficStatusFilter}
        onToggleTrafficPanel={handleToggleTrafficPanel}
        onFocusTrafficPoint={handleFocusTrafficPoint}
        onHoverTrafficPoint={handleHoverTrafficPoint}
        onUnhoverTrafficPoint={handleUnhoverTrafficPoint}
      />

      {!infoSidebarOpen && (
        <button
          type="button"
          className="dashboard-open-button dashboard-open-button--left"
          onClick={() => setInfoSidebarOpen(true)}
          aria-label="Open city panel"
          title="Open city panel"
        >
          <SidebarToggleIcon collapsed />
        </button>
      )}

      {!layerSidebarOpen && (
        <button
          type="button"
          className="dashboard-open-button dashboard-open-button--right"
          onClick={() => setLayerSidebarOpen(true)}
          aria-label="Open layers panel"
          title="Open layers panel"
        >
          <SidebarToggleIcon collapsed />
        </button>
      )}

      <main className={`dashboard-main${infoSidebarOpen ? ' has-left-sidebar' : ''}`}>
        <MapCanvas
          loading={loading}
          loadingMessage={loadingMessage}
          basemapType={basemapType}
          onBasemapChange={setBasemapType}
          trafficSummary={trafficSummary}
        />
        {error && <div className="dashboard-error-banner">{error}</div>}
      </main>
    </div>
  );
}
