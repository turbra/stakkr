#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT = Path(__file__).resolve().parent
INDEX_HTML = ROOT / "index.html"
APP_JS = ROOT / "app.js"
STYLE_CSS = ROOT / "style.css"
LIVE_STATE_JSON = ROOT.parent / "generated" / "dashboard" / "live-state.json"


class DashboardBetaHandler(BaseHTTPRequestHandler):
    server_version = "StakkrDashboardBeta/1.0"

    def do_GET(self) -> None:
        path = self.path.split("?", 1)[0]

        if path in ("/", "/index.html"):
            self._send_file(INDEX_HTML, "text/html; charset=utf-8")
            return

        if path == "/static/app.js":
            self._send_file(APP_JS, "application/javascript; charset=utf-8")
            return

        if path == "/static/style.css":
            self._send_file(STYLE_CSS, "text/css; charset=utf-8")
            return

        if path == "/live-state.json":
            self._send_file(LIVE_STATE_JSON, "application/json; charset=utf-8", no_cache=True)
            return

        if path == "/healthz":
            self._send_bytes(b"ok\n", "text/plain; charset=utf-8")
            return

        self.send_error(HTTPStatus.NOT_FOUND, "Not Found")

    def log_message(self, fmt: str, *args) -> None:
        return

    def _send_file(self, file_path: Path, content_type: str, no_cache: bool = False) -> None:
        if not file_path.exists():
            self.send_error(HTTPStatus.NOT_FOUND, "Not Found")
            return

        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(file_path.stat().st_size))
        if no_cache:
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.end_headers()
        self.wfile.write(file_path.read_bytes())

    def _send_bytes(self, payload: bytes, content_type: str) -> None:
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve the Stakkr beta dashboard without exposing the repo")
    parser.add_argument("port", nargs="?", type=int, default=8082)
    args = parser.parse_args()

    server = ThreadingHTTPServer(("0.0.0.0", args.port), DashboardBetaHandler)
    print(json.dumps({"listening": f"http://0.0.0.0:{args.port}/", "json": "/live-state.json"}))
    server.serve_forever()


if __name__ == "__main__":
    main()
