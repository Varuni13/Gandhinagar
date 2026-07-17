import React from 'react';
import LayerCategory from './LayerCategory';

function SidebarToggleIcon({ direction = 'left' }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="dashboard-sidebar__toggle-icon">
      <rect x="3.5" y="4" width="17" height="16" rx="5" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeOpacity="0.24" />
      <path
        d={direction === 'left' ? 'M9.4 12h6.2M11.8 9.5 9.1 12l2.7 2.5' : 'M8.4 12h6.2M11.2 9.5 13.9 12l-2.7 2.5'}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={direction === 'left' ? 'M16.8 8.2v7.6' : 'M7.2 8.2v7.6'}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeOpacity="0.62"
      />
    </svg>
  );
}

function SectionChevron({ collapsed }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={`dashboard-sidebar__section-chevron${collapsed ? ' is-collapsed' : ''}`}>
      <path d="M4.5 6.25 8 9.75l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrafficSummaryBlock({ summary }) {
  const total = summary.smooth + summary.moderate + summary.heavy;
  const smoothPct = total > 0 ? Math.round((summary.smooth / total) * 100) : 0;
  const moderatePct = total > 0 ? Math.round((summary.moderate / total) * 100) : 0;
  const heavyPct = total > 0 ? Math.max(0, 100 - smoothPct - moderatePct) : 0;

  return (
    <div className="dashboard-sidebar__traffic-summary">
      <div className="dashboard-sidebar__traffic-summary-counts">
        <div className="dashboard-sidebar__traffic-summary-item">
          <span className="dashboard-sidebar__traffic-summary-num dashboard-sidebar__traffic-summary-num--smooth">
            {summary.smooth}
          </span>
          <span className="dashboard-sidebar__traffic-summary-label">Smooth</span>
        </div>
        <div className="dashboard-sidebar__traffic-summary-item">
          <span className="dashboard-sidebar__traffic-summary-num dashboard-sidebar__traffic-summary-num--moderate">
            {summary.moderate}
          </span>
          <span className="dashboard-sidebar__traffic-summary-label">Moderate</span>
        </div>
        <div className="dashboard-sidebar__traffic-summary-item">
          <span className="dashboard-sidebar__traffic-summary-num dashboard-sidebar__traffic-summary-num--heavy">
            {summary.heavy}
          </span>
          <span className="dashboard-sidebar__traffic-summary-label">Heavy</span>
        </div>
      </div>

      <div className="dashboard-sidebar__traffic-bar">
        <span className="dashboard-sidebar__traffic-bar-segment dashboard-sidebar__traffic-bar-segment--smooth" style={{ width: `${smoothPct}%` }} />
        <span className="dashboard-sidebar__traffic-bar-segment dashboard-sidebar__traffic-bar-segment--moderate" style={{ width: `${moderatePct}%` }} />
        <span className="dashboard-sidebar__traffic-bar-segment dashboard-sidebar__traffic-bar-segment--heavy" style={{ width: `${heavyPct}%` }} />
      </div>

      <div className="dashboard-sidebar__traffic-bar-labels">
        <span>{smoothPct}% smooth</span>
        <span>{moderatePct}% mod</span>
        <span>{heavyPct}% heavy</span>
      </div>
    </div>
  );
}

function buildChartPath(values, width, height, padding) {
  if (!Array.isArray(values) || values.length === 0) {
    return '';
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  const range = max - min || 1;

  return values
    .map((value, index) => {
      const x = padding + (usableWidth * index) / Math.max(values.length - 1, 1);
      const y = height - padding - ((value - min) / range) * usableHeight;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function SwmmTimePlot({ chart }) {
  if (!chart || !Array.isArray(chart.values) || chart.values.length === 0) {
    return null;
  }

  const width = 300;
  const height = 132;
  const padding = 14;
  const path = buildChartPath(chart.values, width, height, padding);
  const markerX = padding + ((width - padding * 2) * chart.currentIndex) / Math.max(chart.values.length - 1, 1);
  const min = Math.min(...chart.values);
  const max = Math.max(...chart.values);

  return (
    <div className="dashboard-sidebar__swmm-chart">
      <div className="dashboard-sidebar__swmm-chart-header">
        <span>{chart.label}</span>
        <strong>{chart.currentValue}</strong>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="dashboard-sidebar__swmm-chart-svg">
        <rect x="0" y="0" width={width} height={height} rx="14" fill="rgba(255,255,255,0.76)" />
        <path d={path} fill="none" stroke="#5298a9" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        <line x1={markerX} y1={padding - 2} x2={markerX} y2={height - padding + 2} stroke="#062f37" strokeDasharray="4 4" strokeWidth="1.4" />
      </svg>
      <div className="dashboard-sidebar__swmm-chart-scale">
        <span>{Number.isFinite(min) ? min.toFixed(2) : '0.00'}</span>
        <span>{Number.isFinite(max) ? max.toFixed(2) : '0.00'}</span>
      </div>
    </div>
  );
}

function SwmmSelectedFeatureCard({ feature }) {
  if (!feature) {
    return null;
  }

  return (
    <div className="dashboard-sidebar__swmm-feature">
      <div className="dashboard-sidebar__section-label">Selected Feature</div>
      <h3 className="dashboard-sidebar__swmm-feature-title">{feature.title}</h3>
      <p className="dashboard-sidebar__swmm-feature-subtitle">{feature.subtitle}</p>
      {feature.timestamp ? (
        <div className="dashboard-sidebar__swmm-timestamp">{feature.timestamp}</div>
      ) : null}
      <div className="dashboard-sidebar__swmm-metrics">
        {feature.metrics.map((metric) => (
          <div key={metric.label} className="dashboard-sidebar__swmm-metric">
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
          </div>
        ))}
      </div>
      <SwmmTimePlot chart={feature.chart} />
      {feature.summary.length > 0 ? (
        <div className="dashboard-sidebar__swmm-summary">
          {feature.summary.map((item) => (
            <div key={item.label} className="dashboard-sidebar__swmm-summary-row">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function DashboardSidebar({
  isInfoOpen,
  isLayerOpen,
  cities,
  selectedCityId,
  selectedCityTitle,
  selectedCitySubtitle,
  sourceLabel,
  sections,
  onCityChange,
  onCloseInfo,
  onCloseLayers,
  onToggleSection,
  onToggleLayer,
  demOpacity,
  onDemOpacityChange,
  swmmSectionVisible,
  swmmSectionCollapsed,
  swmmLayersLoading,
  swmmLayerItems,
  swmmTimeLabels,
  swmmTimeIndex,
  swmmSelectedFeature,
  onToggleSwmmSection,
  onToggleSwmmLayer,
  onSwmmTimeIndexChange,
  trafficPanelVisible,
  trafficPanelCollapsed,
  trafficPanelItems,
  trafficPanelTotal,
  trafficSummary,
  trafficStatusFilter,
  onTrafficStatusFilterChange,
  onToggleTrafficPanel,
  onFocusTrafficPoint,
  onHoverTrafficPoint,
  onUnhoverTrafficPoint,
}) {
  return (
    <>
      <aside className={`dashboard-sidebar${isInfoOpen ? '' : ' is-collapsed'}`}>
        <div className="dashboard-sidebar__surface">
          <header className="dashboard-sidebar__header dashboard-card">
            <div className="dashboard-sidebar__header-top">
              <div className="dashboard-sidebar__heading-row">
                <div className="dashboard-sidebar__title-mark" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="dashboard-sidebar__title-block">
                  <h1>{selectedCityTitle}</h1>
                  <p>{selectedCitySubtitle}</p>
                </div>
              </div>
              <button
                type="button"
                className="dashboard-sidebar__toggle-button"
                onClick={onCloseInfo}
                aria-label="Collapse city panel"
                title="Collapse city panel"
              >
                <SidebarToggleIcon direction="left" />
              </button>
            </div>
          </header>

          <section className="dashboard-sidebar__city-switcher dashboard-card">
            <div className="dashboard-sidebar__section-label">City</div>
            <div className="dashboard-sidebar__city-select-shell">
              <select
                className="dashboard-sidebar__city-select"
                value={selectedCityId}
                onChange={(event) => onCityChange(event.target.value)}
                aria-label="Select city dashboard"
              >
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
              <span className="dashboard-sidebar__city-select-icon" aria-hidden="true">
                ▾
              </span>
            </div>
          </section>

          {swmmSectionVisible ? (
            <section className="dashboard-sidebar__swmm-panel dashboard-card">
              <button
                type="button"
                className="dashboard-sidebar__section-toggle"
                onClick={onToggleSwmmSection}
                aria-expanded={!swmmSectionCollapsed}
              >
                <div>
                  <div className="dashboard-sidebar__section-label">SWMM Time Series</div>
                  <div className="dashboard-sidebar__section-title">Nodes & Conduits</div>
                </div>
                <SectionChevron collapsed={swmmSectionCollapsed} />
              </button>

              {!swmmSectionCollapsed ? (
                <div className="dashboard-sidebar__swmm-body">
                  {swmmLayersLoading ? (
                    <div className="dashboard-sidebar__swmm-status">Loading merged SWMM layers...</div>
                  ) : null}

                  <div className="dashboard-sidebar__swmm-checklist">
                    {swmmLayerItems.map((item) => (
                      <label key={item.key} className="dashboard-sidebar__checkbox-row">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={() => onToggleSwmmLayer(item.key)}
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>

                  {swmmTimeLabels.length > 0 ? (
                    <div className="dashboard-sidebar__swmm-slider-shell">
                      <div className="dashboard-sidebar__swmm-slider-meta">
                        <span>Time step {swmmTimeIndex + 1} / {swmmTimeLabels.length}</span>
                        <strong>{swmmTimeLabels[swmmTimeIndex] ?? ''}</strong>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max={Math.max(swmmTimeLabels.length - 1, 0)}
                        value={swmmTimeIndex}
                        onChange={(event) => onSwmmTimeIndexChange(Number(event.target.value))}
                        className="dashboard-sidebar__swmm-slider"
                      />
                    </div>
                  ) : null}

                  <SwmmSelectedFeatureCard feature={swmmSelectedFeature} />
                </div>
              ) : null}
            </section>
          ) : null}

          {trafficPanelVisible ? (
            <section className="dashboard-sidebar__traffic-panel dashboard-card">
              <button
                type="button"
                className="dashboard-sidebar__section-toggle"
                onClick={onToggleTrafficPanel}
                aria-expanded={!trafficPanelCollapsed}
              >
                <div>
                  <div className="dashboard-sidebar__section-label">Live Traffic</div>
                  <div className="dashboard-sidebar__section-title">{trafficPanelTotal} monitored points</div>
                </div>
                <SectionChevron collapsed={trafficPanelCollapsed} />
              </button>

              {!trafficPanelCollapsed ? (
                <div className="dashboard-sidebar__traffic-body">
                  {trafficSummary ? (
                    <TrafficSummaryBlock summary={trafficSummary} />
                  ) : null}

                  <div className="dashboard-sidebar__traffic-filters">
                    {['All', 'Smooth', 'Moderate', 'Heavy'].map((filterValue) => (
                      <button
                        key={filterValue}
                        type="button"
                        className={`dashboard-sidebar__traffic-filter dashboard-sidebar__traffic-filter--${filterValue.toLowerCase()}${
                          trafficStatusFilter === filterValue ? ' is-active' : ''
                        }`}
                        onClick={() => onTrafficStatusFilterChange(filterValue)}
                      >
                        {filterValue}
                      </button>
                    ))}
                  </div>

                  <div className="dashboard-sidebar__traffic-list">
                    {trafficPanelItems.map((item) => (
                      <button
                        key={item.name}
                        type="button"
                        className="dashboard-sidebar__traffic-row"
                        onClick={() => onFocusTrafficPoint(item.name)}
                        onMouseEnter={() => onHoverTrafficPoint(item.name)}
                        onMouseLeave={() => onUnhoverTrafficPoint(item.name)}
                        onFocus={() => onHoverTrafficPoint(item.name)}
                        onBlur={() => onUnhoverTrafficPoint(item.name)}
                      >
                        <span
                          className={`dashboard-sidebar__traffic-dot dashboard-sidebar__traffic-dot--${item.status
                            .toLowerCase()
                            .replace(' ', '-')}`}
                          aria-hidden="true"
                        />
                        <span className="dashboard-sidebar__traffic-row-content">
                          <span className="dashboard-sidebar__traffic-name">{item.name}</span>
                          <span className="dashboard-sidebar__traffic-meta">
                            {item.status}
                            {Number.isFinite(item.speed) ? ` · ${Math.round(item.speed)} km/h` : ''}
                            {Number.isFinite(item.speedRatio) ? ` · ${Math.round(item.speedRatio * 100)}%` : ''}
                          </span>
                          {item.updated ? (
                            <span className="dashboard-sidebar__traffic-updated">{item.updated}</span>
                          ) : null}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          <footer className="dashboard-sidebar__footer dashboard-card">
            Source: {sourceLabel}
          </footer>
        </div>
      </aside>

      <aside className={`dashboard-layer-panel${isLayerOpen ? '' : ' is-collapsed'}`}>
        <div className="dashboard-layer-panel__surface dashboard-card">
          <div className="dashboard-layer-panel__header">
            <div className="dashboard-sidebar__section-label">Layers</div>
            <button
              type="button"
              className="dashboard-sidebar__toggle-button"
              onClick={onCloseLayers}
              aria-label="Collapse layers panel"
              title="Collapse layers panel"
            >
              <SidebarToggleIcon direction="right" />
            </button>
          </div>
          <section className="dashboard-sidebar__layers">
            {sections.map((section) => (
              <LayerCategory
                key={section.name}
                title={section.name}
                items={section.items}
                collapsed={section.collapsed}
                onToggleCategory={() => onToggleSection(section.name)}
                onToggleLayer={onToggleLayer}
                demOpacity={demOpacity}
                onDemOpacityChange={onDemOpacityChange}
              />
            ))}
          </section>
        </div>
      </aside>
    </>
  );
}
