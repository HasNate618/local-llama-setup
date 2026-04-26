#!/usr/bin/env python3
"""
Simple HTTP server for Galaga Clone
Run this file to start the web server:
    python3 server.py

Then open http://localhost:8000 in your browser.
"""

import http.server
import socketserver
import threading
import sys
import os

PORT = 8000

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    """Custom handler that serves files from the galaga directory."""
    def __init__(self, *args, **kwargs):
        # Set directory to parent of this script
        self.directory = os.path.dirname(os.path.abspath(__file__))
        super().__init__(*args, **kwargs)

    def translate(self, path):
        """Translate URL paths to filesystem paths."""
        # Remove leading slash and serve from our directory
        return os.path.join(self.directory, path.lstrip('/'))

# Override the default directory behavior
original_serve_file = http.server.SimpleHTTPRequestHandler.serve_file

def custom_serve_file(self, path):
    """Custom serve_file that handles relative paths."""
    if not os.path.isabs(path):
        path = os.path.join(self.directory, path)
    return original_serve_file(self, path)

http.server.SimpleHTTPRequestHandler.serve_file = custom_serve_file

def run_server():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
        print(f"Starting Galaga Clone server on http://localhost:{PORT}")
        print("Press Ctrl+C to stop")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")

if __name__ == "__main__":
    print(f"\n=== Galaga Clone ===")
    print(f"Server running at: http://localhost:{PORT}")
    print(f"\nTo play the game:")
    print(f"  1. Open your browser and go to: http://localhost:{PORT}")
    print(f"\nControls:")
    print(f"  WASD/Arrows - Move ship")
    print(f"  Mouse + Click - Shoot")
    print(f"  Space - Shoot")
    print(f"  P - Pause")
    print(f"  R - Restart")

    # Start server in foreground
    print("\nStarting HTTP server...")
    sys.stdout.flush()

    run_server()
