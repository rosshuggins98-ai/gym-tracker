#!/usr/bin/env python3
"""Dev server with caching disabled, so edits show up on refresh."""
import http.server, socketserver, os

PORT = 8000
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "app"))

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

with socketserver.TCPServer(("", PORT), NoCache) as httpd:
    print("http://localhost:%d/gym-tracker.html" % PORT)
    httpd.serve_forever()
