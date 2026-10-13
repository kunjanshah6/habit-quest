#!/usr/bin/env bash
set -euo pipefail

# HabitQuest Production Start Script
# Usage: ./scripts/start-production.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${PROJECT_ROOT}"

echo "=== Starting HabitQuest Production Services ==="
echo "Working directory: ${PROJECT_ROOT}"

# Load environment variables if .env exists
if [ -f ".env" ]; then
    echo "Loading environment configuration from .env..."
    # shellcheck disable=SC2046
    export $(grep -v '^#' .env | xargs -0 2>/dev/null || grep -v '^#' .env | xargs)
fi

# Set defaults
HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-8000}"
APP_ENV="${APP_ENV:-production}"

echo "Environment: ${APP_ENV}"
echo "Host: ${HOST}"
echo "Port: ${PORT}"

# 1. Build frontend if dist/ does not exist or if FRONTEND_BUILD=1
if [ ! -d "dist" ] || [ "${FRONTEND_BUILD:-0}" = "1" ]; then
    echo "Building frontend assets..."
    if command -v npm >/dev/null 2>&1; then
        npm run build
    else
        echo "Warning: npm not found. Assuming static dist/ is already built."
    fi
fi

# 2. Check if a Python backend exists
if [ -f "requirements.txt" ] || [ -f "app.py" ] || [ -f "main.py" ] || [ -d "backend" ] || [ -d "api" ]; then
    echo "Python backend detected."
    
    # Activate virtual environment
    if [ -d "venv" ]; then
        echo "Activating virtualenv at venv/..."
        # shellcheck disable=SC1091
        source "venv/bin/activate"
    elif [ -d ".venv" ]; then
        echo "Activating virtualenv at .venv/..."
        # shellcheck disable=SC1091
        source ".venv/bin/activate"
    else
        echo "Warning: No virtual environment found at venv or .venv. Using system python."
    fi

    # Determine backend entry point and start server
    if [ -f "main.py" ]; then
        if command -v uvicorn >/dev/null 2>&1; then
            echo "Starting FastAPI/ASGI application with Uvicorn on ${HOST}:${PORT}..."
            exec uvicorn main:app --host "${HOST}" --port "${PORT}" --workers 2
        elif command -v gunicorn >/dev/null 2>&1; then
            echo "Starting application with Gunicorn on ${HOST}:${PORT}..."
            exec gunicorn -w 2 -b "${HOST}:${PORT}" main:app
        else
            echo "Starting with python3..."
            exec python3 main.py
        fi
    elif [ -f "app.py" ]; then
        if command -v gunicorn >/dev/null 2>&1; then
            echo "Starting Flask application with Gunicorn on ${HOST}:${PORT}..."
            exec gunicorn -w 2 -b "${HOST}:${PORT}" app:app
        else
            echo "Starting with python3..."
            exec python3 app.py
        fi
    fi
else
    echo "Frontend build verified at dist/. Static assets are ready to be served by Nginx."
    echo "No background Python server required for purely static SPA mode."
fi
