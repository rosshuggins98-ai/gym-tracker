#!/usr/bin/env python3
"""Gym Tracker server: static files plus an auto-backup endpoint.

    python3 serve.py [--port 8000] [--host 127.0.0.1] [--dir app] [--backups DIR]
                     [--offsite SETTINGS.json]
    python3 serve.py --offsite-check --offsite SETTINGS.json --backups DIR

GET  /<file>       static, served with no-store so edits show on refresh (the
                   service worker does its own caching for offline use)
GET  /api/status   {"ok":true,"backups":N,"latest":"gym-backup-....json"|null,
                    "offsite":{...}} -- see offsite_status()
POST /api/save     body = the app's backup JSON; written to
                   <backups>/gym-backup-YYYY-MM-DD.json (one file per day,
                   later finishes that day overwrite it) and mirrored to
                   <backups>/gym-latest.json. Keeps the newest 20 dated files.

The app calls POST /api/save after every finished session, so a phone with the
Termux server running gets a backup on disk without the manual export. It's
best-effort on the app side -- no server, no endpoint, no problem. Binds to
localhost by default: the endpoint writes to disk, so don't expose it to the
LAN without meaning to (--host 0.0.0.0).

Off-phone copy (--offsite): when the settings file exists, every dated backup
is also sent to a PRIVATE GitHub repo through the contents API, one file per
day at the repo root -- on start, after every save, and every few minutes
while something is still waiting (no signal at the gym). The settings file is
{"repo": "owner/name", "token": "<fine-grained token: Contents read/write on
that repo only>"}, written by ~/gymtools/offsite-setup.sh. What has been sent
is remembered in <backups>/.offsite.json, so only new or changed days go up.
A public repo is refused: backups hold bodyweight and notes. The token is
never printed, logged, or returned by /api/status.

Stdlib only. This exact file is also embedded in termux/gym-setup.sh; the
test suite checks the two copies match, so edit here and re-run the tests.
"""
import argparse, base64, glob, hashlib, http.server, json, os, re, sys, threading, datetime
import urllib.error, urllib.parse, urllib.request
try:
    import fcntl
except ImportError:          # not on Termux/Linux: no cross-process lock, still fine
    fcntl = None

MAX_BODY = 32 * 1024 * 1024
KEEP = 20
GITHUB_API = "https://api.github.com"
OFFSITE_RETRY = 300          # seconds between tries while a backup is waiting
OFFSITE_TIMEOUT = 20

def parse_args(argv):
    here = os.path.dirname(os.path.abspath(__file__))
    p = argparse.ArgumentParser(description="Gym Tracker server")
    p.add_argument("--port", type=int, default=8000)
    p.add_argument("--host", default="127.0.0.1")
    p.add_argument("--dir", default=os.path.join(here, "app"), help="directory to serve")
    p.add_argument("--backups", default=os.path.join(here, "gym-backups"), help="where POST /api/save writes")
    p.add_argument("--offsite", default=None, help="settings file for the GitHub copy (off if absent)")
    p.add_argument("--offsite-check", action="store_true", help="test the GitHub settings, send what's waiting, exit")
    return p.parse_args(argv)

def make_handler(backups, offsite=None, worker=None):
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
                                        "latest": os.path.basename(files[-1]) if files else None,
                                        "offsite": offsite_status(backups, offsite)})
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
            if worker:
                worker.wake.set()      # send it off-phone in the background
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

# ---------------- off-phone copy to a private GitHub repo ----------------

MSG_SETTINGS = "The GitHub settings file can't be read. Run offsite-setup.sh again."
MSG_OFFLINE = "Couldn't reach GitHub (no signal?). It will try again."
MSG_TOKEN = "GitHub didn't accept the token. It may have expired: run offsite-setup.sh again with a new one."
MSG_NOREPO = "GitHub can't find %s with this token. Check the repo name, and that the token can use it."
MSG_PUBLIC = "%s is public. Backups hold your bodyweight and notes, so they're only sent to a private repo."
MSG_NOWRITE = "The token can see %s but can't save to it. Give it Contents: Read and write."

class OffsiteError(Exception):
    pass

def load_offsite(path):
    """The settings dict, or None when there's no settings file (off). Raises
    OffsiteError when the file is there but unusable."""
    if not path or not os.path.exists(path):
        return None
    try:
        with open(path, encoding="utf-8") as fh:
            cfg = json.load(fh)
        repo, token = cfg.get("repo", "").strip(), cfg.get("token", "").strip()
    except Exception:
        raise OffsiteError(MSG_SETTINGS)
    if not re.match(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$", repo) or not token:
        raise OffsiteError(MSG_SETTINGS)
    return {"repo": repo, "token": token, "api": (cfg.get("api") or GITHUB_API).rstrip("/"),
            "retry": float(cfg.get("retry") or OFFSITE_RETRY)}

def _state_path(backups):
    return os.path.join(backups, ".offsite.json")

def read_state(backups):
    try:
        with open(_state_path(backups), encoding="utf-8") as fh:
            st = json.load(fh)
        if isinstance(st, dict) and isinstance(st.get("files"), dict):
            return st
    except Exception:
        pass
    return {"files": {}}

def write_state(backups, st):
    os.makedirs(backups, exist_ok=True)
    tmp = _state_path(backups) + ".tmp"
    with open(tmp, "w", encoding="utf-8") as fh:
        json.dump(st, fh, indent=1)
    os.replace(tmp, _state_path(backups))

def _now():
    return datetime.datetime.now().isoformat(timespec="minutes")

def waiting(backups, st):
    """Dated backups not yet on GitHub as they are now: [(name, bytes, hash)], oldest first."""
    out = []
    for f in dated_backups(backups):
        name = os.path.basename(f)
        try:
            with open(f, "rb") as fh:
                data = fh.read()
        except OSError:
            continue
        h = hashlib.sha256(data).hexdigest()
        if (st["files"].get(name) or {}).get("hash") != h:
            out.append((name, data, h))
    return out

def offsite_status(backups, path):
    """What the app's Data panel shows: {"enabled": false} when off, else
    {"enabled", "repo", "pending", "last_ok", "error"}. No token."""
    try:
        cfg = load_offsite(path)
    except OffsiteError as e:
        return {"enabled": True, "repo": None, "pending": len(dated_backups(backups)), "last_ok": None, "error": str(e)}
    if cfg is None:
        return {"enabled": False}
    st = read_state(backups)
    if st.get("repo") != cfg["repo"]:
        st = {"files": {}}
    return {"enabled": True, "repo": cfg["repo"], "pending": len(waiting(backups, st)),
            "last_ok": st.get("last_ok"), "error": st.get("error")}

def _gh(cfg, method, path, body=None):
    """One GitHub API call: (status, json). Network trouble raises OSError/URLError."""
    req = urllib.request.Request(cfg["api"] + path, method=method,
                                 data=json.dumps(body).encode("utf-8") if body is not None else None,
                                 headers={"Authorization": "Bearer " + cfg["token"],
                                          "Accept": "application/vnd.github+json",
                                          "X-GitHub-Api-Version": "2022-11-28",
                                          "User-Agent": "gym-tracker-serve",
                                          "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=OFFSITE_TIMEOUT) as r:
            raw = r.read()
            return r.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        try:
            raw = e.read()
            return e.code, (json.loads(raw) if raw else None)
        except Exception:
            return e.code, None

def _check_repo(cfg):
    code, j = _gh(cfg, "GET", "/repos/" + cfg["repo"])
    if code == 401:
        raise OffsiteError(MSG_TOKEN)
    if code in (403, 404):
        raise OffsiteError(MSG_NOREPO % cfg["repo"])
    if code != 200 or not isinstance(j, dict):
        raise OffsiteError("GitHub answered %d when checking %s. It will try again." % (code, cfg["repo"]))
    if j.get("private") is not True:
        raise OffsiteError(MSG_PUBLIC % cfg["repo"])

def _put_file(cfg, name, data, sha):
    """Create or replace one file; returns its new sha. A sha GitHub doesn't
    expect (the file was sent from elsewhere, or the state was lost) is
    refetched once rather than treated as an error."""
    path = "/repos/%s/contents/%s" % (cfg["repo"], urllib.parse.quote(name))
    body = {"message": "Gym backup %s" % name[len("gym-backup-"):-len(".json")],
            "content": base64.b64encode(data).decode("ascii")}
    for attempt in (0, 1):
        if sha:
            body["sha"] = sha
        else:
            body.pop("sha", None)
        code, j = _gh(cfg, "PUT", path, body)
        if code in (200, 201) and isinstance(j, dict):
            return (j.get("content") or {}).get("sha")
        if code == 401:
            raise OffsiteError(MSG_TOKEN)
        if code in (404, 409, 422) and attempt == 0:
            c2, j2 = _gh(cfg, "GET", path)
            sha = j2.get("sha") if c2 == 200 and isinstance(j2, dict) else None
            continue
        if code in (403, 404):
            raise OffsiteError(MSG_NOWRITE % cfg["repo"])
        raise OffsiteError("GitHub answered %d when saving %s. It will try again." % (code, name))

class _Lock:
    """One sync at a time, across the server's thread and offsite-setup's check."""
    def __init__(self, backups):
        os.makedirs(backups, exist_ok=True)
        self.path = os.path.join(backups, ".offsite.lock")
    def __enter__(self):
        self.fh = open(self.path, "w")
        if fcntl:
            fcntl.flock(self.fh, fcntl.LOCK_EX)
        return self
    def __exit__(self, *a):
        if fcntl:
            fcntl.flock(self.fh, fcntl.LOCK_UN)
        self.fh.close()

def sync_offsite(backups, path, check=False):
    """Send every waiting backup. Returns {"enabled", "sent", "pending", "error"};
    check=True tests the repo and token even when nothing is waiting."""
    try:
        cfg = load_offsite(path)
    except OffsiteError as e:
        return {"enabled": True, "sent": 0, "pending": len(dated_backups(backups)), "error": str(e)}
    if cfg is None:
        return {"enabled": False, "sent": 0, "pending": 0, "error": None}
    sent = 0
    with _Lock(backups):
        st = read_state(backups)
        if st.get("repo") != cfg["repo"]:
            st = {"repo": cfg["repo"], "files": {}}   # a new repo gets everything
        todo = waiting(backups, st)
        if not todo and not check:
            if st.get("error"):                # everything is up there: an old error no longer applies
                st["error"] = None
                write_state(backups, st)
            return {"enabled": True, "sent": 0, "pending": 0, "error": None}
        try:
            _check_repo(cfg)
            for name, data, h in todo:
                sha = _put_file(cfg, name, data, (st["files"].get(name) or {}).get("sha"))
                st["files"][name] = {"hash": h, "sha": sha}
                st["last_ok"] = _now()
                sent += 1
                write_state(backups, st)       # keep progress if the next one fails
            st["error"] = None
        except OffsiteError as e:
            st["error"] = str(e)
        except (urllib.error.URLError, OSError, ValueError):
            st["error"] = MSG_OFFLINE
        except Exception as e:                 # never take the server down over a copy
            st["error"] = "Something went wrong sending to GitHub (%s). It will try again." % type(e).__name__
        local = {os.path.basename(f) for f in dated_backups(backups)}
        st["files"] = {k: v for k, v in st["files"].items() if k in local}
        write_state(backups, st)
        return {"enabled": True, "sent": sent, "pending": len(waiting(backups, st)), "error": st["error"]}

class OffsiteWorker(threading.Thread):
    """Syncs on start, whenever woken (a save), and every `retry` seconds
    while something is still waiting."""
    def __init__(self, backups, path):
        super().__init__(daemon=True)
        self.backups, self.path, self.wake = backups, path, threading.Event()
    def run(self):
        while True:
            try:
                r = sync_offsite(self.backups, self.path)
            except Exception as e:
                sys.stderr.write("offsite: %s\n" % type(e).__name__)
                r = {"pending": 1}
            try:
                cfg = load_offsite(self.path)
                retry = cfg["retry"] if cfg else OFFSITE_RETRY
            except OffsiteError:
                retry = OFFSITE_RETRY
            self.wake.wait(retry if r.get("pending") else None)
            self.wake.clear()

def offsite_check(backups, path):
    """`serve.py --offsite-check`: what offsite-setup.sh runs after writing the settings."""
    try:
        cfg = load_offsite(path)
    except OffsiteError as e:
        print(str(e)); return 1
    if cfg is None:
        print("No GitHub settings found (%s). Run offsite-setup.sh." % (path or "no --offsite given")); return 1
    r = sync_offsite(backups, path, check=True)
    if r["error"]:
        print("Not copied: " + r["error"]); return 1
    if r["sent"]:
        print("Copied %d backup%s to %s." % (r["sent"], "" if r["sent"] == 1 else "s", cfg["repo"]))
    elif dated_backups(backups):
        print("%s is up to date. Nothing new to copy." % cfg["repo"])
    else:
        print("%s and the token work. Nothing to copy yet: finish a session first." % cfg["repo"])
    return 0

def main(argv=None):
    a = parse_args(sys.argv[1:] if argv is None else argv)
    backups = os.path.abspath(a.backups)
    offsite = os.path.abspath(a.offsite) if a.offsite else None
    if a.offsite_check:
        sys.exit(offsite_check(backups, offsite))
    os.chdir(a.dir)
    worker = None
    if offsite:
        worker = OffsiteWorker(backups, offsite)
        worker.start()
    srv = http.server.ThreadingHTTPServer((a.host, a.port), make_handler(backups, offsite, worker))
    print("http://localhost:%d/gym-tracker.html  (backups -> %s)" % (a.port, a.backups), flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        srv.server_close()

if __name__ == "__main__":
    main()
