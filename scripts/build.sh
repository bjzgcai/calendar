#!/bin/bash
set -Eeuo pipefail

echo "Installing dependencies..."
pnpm install --prefer-frozen-lockfile --prefer-offline

echo "Building the project..."
npx next build

echo "Build completed successfully!"
