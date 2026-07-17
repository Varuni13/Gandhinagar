import React from 'react';

function LayerIcon({ label, className = '' }) {
  const normalized = label.toLowerCase();

  if (
    normalized.includes('sewage treatment plant') ||
    normalized.includes('sewage pumping station') ||
    normalized.includes('stp') ||
    normalized.includes('sps')
  ) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <circle cx="12" cy="12" r="5.2" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="1.9" fill="currentColor" />
      </svg>
    );
  }

  if (normalized.includes('administrative') || normalized.includes('boundary') || normalized.includes('ward')) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path
          d="M5 6.5 9 5l6 2 4-1.5v12L15 19l-6-2-4 1.5z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M9 5v12M15 7v12" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }

  if (normalized.includes('drain') || normalized.includes('sewer') || normalized.includes('manhole')) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path d="M4 8c3 0 3 8 6 8s3-8 6-8 3 8 4 8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M4 12c3 0 3 8 6 8s3-8 6-8 3 8 4 8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
      </svg>
    );
  }

  if (normalized.includes('water') || normalized.includes('river') || normalized.includes('canal') || normalized.includes('reservoir') || normalized.includes('hydrology')) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path d="M12 4c2.7 3.2 5 5.9 5 8.4A5 5 0 0 1 7 12.4C7 9.9 9.3 7.2 12 4Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M6 17.5c1.4 1 2.8 1.5 4.2 1.5 1.5 0 2.7-.5 4-1.2 1.2-.7 2.4-1.3 3.8-1.3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }

  if (normalized.includes('transport') || normalized.includes('road') || normalized.includes('rail') || normalized.includes('parking') || normalized.includes('footpath') || normalized.includes('divider')) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path d="M8 4h8l3 16h-3l-1-4H9l-1 4H5z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M12 7v2.5M12 12v2.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }

  if (normalized.includes('terrain') || normalized.includes('dem') || normalized.includes('contour')) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path d="M4 18 10 8l4 6 2-3 4 7H4Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  if (normalized.includes('observation') || normalized.includes('hotspot') || normalized.includes('garbage') || normalized.includes('location')) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
        <path d="M12 20s6-4.9 6-9a6 6 0 1 0-12 0c0 4.1 6 9 6 9Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <circle cx="12" cy="11" r="2.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function isDemLayerItem(item) {
  return String(item.fullLabel ?? '').toLowerCase().includes('dem');
}

export default function LayerCategory({
  title,
  items,
  collapsed,
  onToggleCategory,
  onToggleLayer,
  demOpacity,
  onDemOpacityChange,
}) {
  return (
    <section className="layer-category">
      <button
        type="button"
        className={`layer-category__header${collapsed ? ' is-collapsed' : ''}`}
        onClick={onToggleCategory}
      >
        <span className="layer-category__title-group">
          <span className="layer-category__icon-shell">
            <LayerIcon label={title} className="layer-category__icon" />
          </span>
          <span>{title}</span>
        </span>
        <span className="layer-category__chevron" aria-hidden="true">
          {collapsed ? '▸' : '▾'}
        </span>
      </button>
      {!collapsed && (
        <div className="layer-category__content">
          {items.map((item) => (
            <div key={item.fullLabel} className="layer-item-group">
              <label className="layer-item">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => onToggleLayer(item.fullLabel)}
                />
                <span className="layer-item__icon-shell">
                  <LayerIcon label={item.fullLabel} className="layer-item__icon" />
                </span>
                <span className="layer-item__label">{item.name}</span>
              </label>
              {isDemLayerItem(item) && item.checked && (
                <div className="layer-item__opacity">
                  <span className="layer-item__opacity-label">Opacity</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={demOpacity}
                    onChange={(event) => onDemOpacityChange(Number(event.target.value))}
                  />
                  <span className="layer-item__opacity-value">{Math.round(demOpacity * 100)}%</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
