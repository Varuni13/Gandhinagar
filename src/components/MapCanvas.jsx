import React from 'react';

const logoUrl = 'https://home.airesqclimsols.com/assets/White-logo-small-DosekXhA.png';

function LoadingScreen({ message }) {
  return (
    <div className="dashboard-loading-screen" role="status" aria-live="polite">
      <div className="dashboard-loading-screen__panel">
        <div className="dashboard-loading-screen__halo dashboard-loading-screen__halo--one" />
        <div className="dashboard-loading-screen__halo dashboard-loading-screen__halo--two" />
        <div className="dashboard-loading-screen__brand-shell">
          <div className="dashboard-loading-screen__brand">
            <img src={logoUrl} alt="AIRESQ" className="dashboard-loading-screen__logo" />
          </div>
        </div>
        <p className="dashboard-loading-screen__eyebrow">AIRESQ Geospatial Intelligence</p>
        <h2>Preparing the Gandhinagar Dashboard</h2>
        <p className="dashboard-loading-screen__message">{message}</p>
        <div className="dashboard-loading-screen__bar">
          <span />
        </div>
        <div className="dashboard-loading-screen__pills">
          <span>OpenStreetMap</span>
          <span>Municipal Layers</span>
          <span>CartoDB Map</span>
        </div>
      </div>
    </div>
  );
}

function TrafficLegendCard({ summary }) {
  if (!summary || summary.smooth + summary.moderate + summary.heavy === 0) {
    return null;
  }

  return (
    <div className="hotspot-card">
      <span className="tc-context">Gandhinagar roads right now</span>
      <div className="tc-items-row">
        <div className="tc-item">
          <span className="tc-num tc-num--smooth">{summary.smooth}</span>
          <span className="tc-label">Smooth</span>
        </div>
        <div className="tc-item">
          <span className="tc-num tc-num--moderate">{summary.moderate}</span>
          <span className="tc-label">Moderate</span>
        </div>
        <div className="tc-item">
          <span className="tc-num tc-num--heavy">{summary.heavy}</span>
          <span className="tc-label">Heavy</span>
        </div>
      </div>
    </div>
  );
}

export default function MapCanvas({
  loading,
  loadingMessage,
  basemapType,
  onBasemapChange,
  trafficSummary,
}) {
  return (
    <section className="dashboard-map-panel">
      <div className="dashboard-map-card">
        <div id="gnr-google-basemap" className="dashboard-map dashboard-map--google" />
        <div id="gnr-dashboard-map" className="dashboard-map dashboard-map--leaflet" />
        <div className="dashboard-map-toolbar">
          <div className="dashboard-map-toolbar__group">
            <span className="dashboard-map-toolbar__label">Base Map</span>
            <div className="dashboard-map-toolbar__tabs">
              {[
                { value: 'satellite', label: 'Satellite' },
                { value: 'google-streets', label: 'Google Streets' },
                { value: 'osm', label: 'OpenStreetMap' },
                { value: 'cartodb', label: 'CartoDB Map' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`dashboard-map-toolbar__tab${
                    basemapType === option.value ? ' is-active' : ''
                  }`}
                  onClick={() => onBasemapChange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <TrafficLegendCard summary={trafficSummary} />
        {loading && <LoadingScreen message={loadingMessage} />}
      </div>
    </section>
  );
}
