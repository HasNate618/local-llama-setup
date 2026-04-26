#!/bin/bash
# Quick start script for Galaga Clone

cd "$(dirname "$0")"

if command -v python3 &> /dev/null; then
    echo "Starting Galaga Clone server..."
    python3 server.py
else
    echo "Python 3 not found. Install it or use another HTTP server."
    echo "Try: python3 -m http.server 8000"
fi
