#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/production/airesq/Gandhinagar-mobiResq"
TRAFFIC_SOURCE="/home/production/airesq/gandhinagar/traffic_collector/data"
PORT=9145

cd "$APP_DIR"

echo "==> Checking for manually-copied data files (not in git, see DATA_SOURCES.md)..."
missing=0
for f in \
  public/transport/Gandhinagar_roads.geojson \
  public/transport/Gandhinagar_railway.geojson \
  public/transport/Gandhinagar_metro.geojson \
  public/DEM/Gandhinagar_dem_overlay.png
do
  if [ ! -s "$f" ]; then
    echo "MISSING: $f (git pull won't bring this — copy it manually, see DATA_SOURCES.md)" >&2
    missing=1
  fi
done
if [ "$missing" -eq 1 ]; then
  echo "FAIL: one or more data files are missing. Aborting before building a broken dashboard." >&2
  exit 1
fi

echo "==> Building..."
npm run build

echo "==> Re-linking live traffic data..."
rm -rf dist/traffic
ln -s "$TRAFFIC_SOURCE" dist/traffic

echo "==> Verifying..."
if curl -sf -o /dev/null "http://127.0.0.1:${PORT}"; then
  echo "OK: site responding on port ${PORT}"
else
  echo "FAIL: site not responding on port ${PORT}" >&2
  exit 1
fi

traffic_body="$(curl -sf "http://127.0.0.1:${PORT}/traffic/latest_traffic_gandhinagar.json" || true)"
if [ -n "$traffic_body" ]; then
  echo "OK: traffic data serving"
else
  echo "FAIL: traffic data not serving" >&2
  exit 1
fi

echo "==> Done. Hard-refresh https://gandhinagar.airesqclimsols.com (Ctrl+Shift+R) to see changes."
