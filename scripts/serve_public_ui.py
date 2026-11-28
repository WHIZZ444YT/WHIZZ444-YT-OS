"""Serve the generated UI for Chromium with the production homepage alias redirect."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


class PublicUIHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        url = urlsplit(self.path)
        if url.path == "/index.html":
            self.send_response(308)
            self.send_header("Location", "/" + ("?" + url.query if url.query else ""))
            self.send_header("Content-Length", "0")
            self.end_headers()
            return None
        return super().send_head()


if __name__ == "__main__":
    dist = Path(__file__).resolve().parents[1] / "dist"
    handler = partial(PublicUIHandler, directory=str(dist))
    with ThreadingHTTPServer(("127.0.0.1", 8798), handler) as server:
        server.serve_forever()
