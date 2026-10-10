#!/usr/bin/env bash
set -e

# ==============================================================================
# ShiftSwap — Clinic Shift Swapping & Labour Rule Compliance System
# Local Single-Command Launch Script
# ==============================================================================

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "=================================================================="
echo "🏥 Launching ShiftSwap Compliance System..."
echo "=================================================================="

# 1. Check Python & Node dependencies
command -v python3 >/dev/null 2>&1 || { echo "❌ Error: python3 is required but not installed."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ Error: npm is required but not installed."; exit 1; }

echo "✓ System dependencies verified (Python $(python3 --version | cut -d' ' -f2), Node $(node --version))"

# 2. Check if frontend distribution exists; build if missing
if [ ! -d "$PROJECT_ROOT/frontend/dist" ] || [ ! -f "$PROJECT_ROOT/frontend/dist/index.html" ]; then
    echo "📦 Building frontend production bundle..."
    cd "$PROJECT_ROOT/frontend"
    npm install
    npm run build
    cd "$PROJECT_ROOT"
fi

# 3. Ensure Python dependencies are installed
echo "🐍 Ensuring backend dependencies are installed..."
python3 -m pip install fastapi uvicorn pydantic httpx pytest --quiet 2>/dev/null || true

# 4. Launch FastAPI Server (serves both REST API and React Single-Page Application)
echo "🚀 Starting ShiftSwap server on http://localhost:8000 ..."
echo "------------------------------------------------------------------"
echo "🌐 ShiftSwap UI & API:  http://localhost:8000"
echo "📖 Swagger API Docs:   http://localhost:8000/docs"
echo "------------------------------------------------------------------"
echo "Press Ctrl+C to stop the server."

export PYTHONPATH="$PROJECT_ROOT/backend"
exec python3 -m uvicorn app.main:app --app-dir "$PROJECT_ROOT/backend" --host 0.0.0.0 --port 8000
