#!/usr/bin/env bash
# Build Docker images for linux/amd64 and push to Docker Hub.
# Repository: c3t4r4/azure-devops-analytics
# Tags: 1.0, latest
#
# Usage: ./scripts/docker-build-push.sh [version]
#   version defaults to 1.0
#
# Prerequisite: docker login (docker login -u c3t4r4)

set -e

VERSION="${1:-1.0}"
REGISTRY="c3t4r4"
REPO="azure-devops-analytics"
PLATFORM="linux/amd64"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "=== Building and pushing ${REGISTRY}/${REPO} version ${VERSION} (platform: ${PLATFORM}) ==="

# Backend
echo "--- Building backend (amd64) ---"
docker build \
  --platform "$PLATFORM" \
  -t "${REGISTRY}/${REPO}-backend:${VERSION}" \
  -t "${REGISTRY}/${REPO}-backend:latest" \
  -f "$ROOT/backend/Dockerfile" \
  "$ROOT/backend"

echo "--- Pushing backend ---"
docker push "${REGISTRY}/${REPO}-backend:${VERSION}"
docker push "${REGISTRY}/${REPO}-backend:latest"

# Frontend
echo "--- Building frontend (amd64) ---"
docker build \
  --platform "$PLATFORM" \
  -t "${REGISTRY}/${REPO}-frontend:${VERSION}" \
  -t "${REGISTRY}/${REPO}-frontend:latest" \
  -f "$ROOT/frontend/Dockerfile" \
  "$ROOT/frontend"

echo "--- Pushing frontend ---"
docker push "${REGISTRY}/${REPO}-frontend:${VERSION}"
docker push "${REGISTRY}/${REPO}-frontend:latest"

echo "=== Done. Images pushed: ==="
echo "  ${REGISTRY}/${REPO}-backend:${VERSION}"
echo "  ${REGISTRY}/${REPO}-backend:latest"
echo "  ${REGISTRY}/${REPO}-frontend:${VERSION}"
echo "  ${REGISTRY}/${REPO}-frontend:latest"
