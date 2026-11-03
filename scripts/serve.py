"""Serves the app locally. Pyodide cannot load from file:// URLs.

Python's built-in server reads MIME types from the OS, and Windows often maps
.mjs to text/plain, which browsers refuse to run. This sets the types Pyodide needs.
"""

import http.server
import mimetypes
import os
import sys


PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


mimetypes.add_type("text/javascript", ".mjs")
mimetypes.add_type("text/javascript", ".js")
mimetypes.add_type("application/wasm", ".wasm")


class DevRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Disables caching so edited files show up on reload."""

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


os.chdir(ROOT)
server = http.server.ThreadingHTTPServer(("", PORT), DevRequestHandler)

# flush=True: npm pipes stdout, so Python would otherwise buffer these lines.
print(f"GraphSandbox running at http://localhost:{PORT}", flush=True)
print("Press Ctrl+C to stop.", flush=True)

try:
    server.serve_forever()
except KeyboardInterrupt:
    print("Server stopped.")
