#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/production/airesq/Gandhinagar-mobiResq"
TRAFFIC_SOURCE="/home/production/airesq/gandhinagar/traffic_collector/data"
PORT=9145

cd "$APP_DIR"

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
