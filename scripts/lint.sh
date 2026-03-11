#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "--- Linting .NET (backend) ---"
dotnet format backend/DashboardDevops.sln --verify-no-changes

echo "--- Linting Angular (frontend) ---"
cd frontend
npm run lint
cd ..

echo "--- Lint concluído com sucesso ---"
