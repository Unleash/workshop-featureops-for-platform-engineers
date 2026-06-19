#!/bin/sh
# Container entrypoint: discover Unleash projects into the catalog, then start the backend
# (which also serves the built frontend on port 7007).
set -eu

echo "[entrypoint] Generating catalog from Unleash projects..."
node scripts/generate-catalog.mjs || true

echo "[entrypoint] Starting Backstage backend on :7007..."
exec node packages/backend \
  --config app-config.yaml \
  --config app-config.docker.yaml
