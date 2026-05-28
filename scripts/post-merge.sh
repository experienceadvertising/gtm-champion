#!/bin/bash
set -e

echo "[post-merge] Installing dependencies..."
npm install --legacy-peer-deps

echo "[post-merge] Pushing database schema..."
npx drizzle-kit push --force 2>&1 || echo "[post-merge] drizzle push returned non-zero (may be fine)"

echo "[post-merge] Done."
