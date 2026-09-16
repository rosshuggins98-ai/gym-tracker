#!/usr/bin/env python3
"""Gym Tracker server: static files plus an auto-backup endpoint.

    python3 serve.py [--port 8000] [--host 127.0.0.1] [--dir app] [--backups DIR]

GET  /<file>       static, served with no-store so edits show on refresh (the
                   service worker does its own caching for offline use)
GET  /api/status   {"ok":true,"backups":N,"latest":"gym-backup-....json"|null}
POST /api/save     body = the app's backup JSON; written to
                   <backups>/gym-backup-YYYY-MM-DD.json (one file per day,
                   later finishes that day overwrite it) and mirrored to
                   <backups>/gym-latest.json. Keeps the newest 20 dated files.

The app calls POST /api/save after every finished session, so a phone with the
Termux server running gets a backup on disk without the manual export. It's
best-effort on the app side -- no server, no endpoint, no problem. Binds to
localhost by default: the endpoint writes to disk, so don't expose it to the
LAN without meaning to (--host 0.0.0.0).

Stdlib only. This exact file is also embedded in termux/gym-setup.sh; the
test suite checks the two copies match, so edit here and re-run the tests.
"""
import argparse, glob, http.server, json, os, sys, datetime

MAX_BODY = 32 * 1024 * 1024
KEEP = 20

def parse_args(argv):
    here = os.path.dirname(os.path.abspath(__file__))
    p = argparse.ArgumentParser(description="Gym Tracker server")
    p.add_argument("--port", type=int, default=8000)
    p.add_argument("--host", default="127.0.0.1")
    p.add_argument("--dir", default=os.path.join(here, "app"), help="directory to serve")
    p.add_argument("--backups", default=os.path.join(here, "gym-backups"), help="where POST /api/save writes")
    return p.parse_args(argv)

def make_handler(backups):
    class Handler(http.server.SimpleHTTPRequestHandler):
        def end_headers(self):
            self.send_header("Cache-Control", "no-store, must-revalidate")
            super().end_headers()

        def log_message(self, fmt, *args):
            # keep the Termux notification log quiet; errors still go to stderr
            if args and str(args[0]).startswith("POST"):
                sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

        def _json(self, code, obj):
            body = json.dumps(obj).encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def do_GET(self):
            if self.path.split("?")[0] == "/api/status":
                files = dated_backups(backups)
                return self._json(200, {"ok": True, "backups": len(files),
                                        "latest": os.path.basename(files[-1]) if files else None})
            return super().do_GET()

        def do_POST(self):
            if self.path.split("?")[0] != "/api/save":
                return self._json(404, {"ok": False, "error": "no such endpoint"})
            try:
                n = int(self.headers.get("Content-Length") or 0)
            except ValueError:
                n = 0
            if n <= 0 or n > MAX_BODY:
                return self._json(413 if n > MAX_BODY else 400, {"ok": False, "error": "bad length"})
            raw = self.rfile.read(n)
            try:
                data = json.loads(raw.decode("utf-8"))
            except Exception:
                return self._json(400, {"ok": False, "error": "not json"})
            if not isinstance(data, dict) or data.get("app") != "gym-tracker":
                return self._json(400, {"ok": False, "error": "not a gym-tracker backup"})
            try:
                name = save_backup(backups, data)
            except OSError as e:
                return self._json(500, {"ok": False, "error": str(e)})
            self._json(200, {"ok": True, "file": name})
    return Handler

def dated_backups(backups):
    return sorted(glob.glob(os.path.join(backups, "gym-backup-????-??-??.json")))

def save_backup(backups, data, today=None):
    """Write one dated file (overwriting today's) plus gym-latest.json, prune to KEEP."""
    os.makedirs(backups, exist_ok=True)
    day = today or datetime.date.today().isoformat()
    name = "gym-backup-%s.json" % day
    text = json.dumps(data, indent=1, ensure_ascii=False)
    for fn in (name, "gym-latest.json"):
        tmp = os.path.join(backups, "." + fn + ".tmp")
        with open(tmp, "w", encoding="utf-8") as fh:
            fh.write(text)
        os.replace(tmp, os.path.join(backups, fn))   # atomic: never a half-written backup
    files = dated_backups(backups)
    for old in files[:-KEEP] if len(files) > KEEP else []:
        try:
            os.remove(old)
        except OSError:
            pass
    return name

def main(argv=None):
    a = parse_args(sys.argv[1:] if argv is None else argv)
    os.chdir(a.dir)
    srv = http.server.ThreadingHTTPServer((a.host, a.port), make_handler(os.path.abspath(a.backups)))
    print("http://localhost:%d/gym-tracker.html  (backups -> %s)" % (a.port, a.backups), flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        srv.server_close()

if __name__ == "__main__":
    main()
