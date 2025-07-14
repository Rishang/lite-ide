#!/bin/bash
set -e

echo "Building UI..."
cd ui
pnpm install
pnpm build
cd ..

echo "Building Go binary..."
cd src
go build -o ../boxy-ide ./cmd/server
cd ..

echo "Build complete! Run with: ./boxy-ide" 