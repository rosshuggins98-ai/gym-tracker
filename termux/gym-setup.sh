#!/data/data/com.termux/files/usr/bin/bash
# ============================================================
#  Gym Tracker - Termux setup (v4: self-updating launcher)
#  Run once:   bash ~/storage/downloads/gym-setup.sh
#  Safe to re-run: it replaces the scripts with fixed versions.
#
#  After that you should never need to run it by hand again: serve.sh
#  (the Gym widget) fetches this file from the repo on every tap and,
#  when it has changed, re-runs it in GYM_SETUP_NOLAUNCH=1 mode to
#  refresh the launcher scripts before starting the server.
# ============================================================
set -e
TOOLS="$HOME/gymtools"
WEB="$TOOLS/web"
SHORTCUTS="$HOME/.shortcuts"
BACKUPS="$HOME/gym-backups"
GYM_SETUP_VERSION=4

echo "Setting up Gym Tracker v$GYM_SETUP_VERSION..."
mkdir -p "$TOOLS" "$WEB" "$SHORTCUTS" "$BACKUPS"
# Keep a copy of the installer that produced the current scripts, so serve.sh
# can tell whether the one in the repo is different. (-ef: skip when this IS
# that copy, e.g. re-run by hand from ~/gymtools.)
[ "$0" -ef "$TOOLS/gym-setup.sh" ] || cp -f "$0" "$TOOLS/gym-setup.sh"

if [ ! -d "$HOME/storage" ]; then
  echo "Storage access not set up. Run: termux-setup-storage"
  echo "Then run this installer again."
  exit 1
fi

# ---------- stats tool ----------
cat > "$TOOLS/stats.py" << 'PYEOF'
#!/usr/bin/env python3
import json, os, glob, datetime, random
HOME = os.environ.get("HOME", ".")
BK   = os.path.join(HOME, "gym-backups")
LOG  = os.path.join(HOME, "gym-log.txt")
def newest():
    f = sorted(glob.glob(os.path.join(BK, "gym-backup-*.json")))
    return f[-1] if f else None
def load(p):
    try:
        with open(p) as fh: return json.load(fh)
    except Exception: return None
def visits():
    if not os.path.exists(LOG): return 0
    pre = datetime.date.today().strftime("%Y-%m"); n = 0
    try:
        with open(LOG) as fh:
            for L in fh:
                if L.startswith(pre): n += 1
    except Exception: pass
    return n
CHEER=["Consistency is the whole game.","Turning up is most of it.","Small jumps, every week.","Form first, weight second."]
def main():
    bits=[]; m=visits()
    if m: bits.append("%d gym visit%s this month" % (m,"" if m==1 else "s"))
    d=load(newest() or "")
    if d:
        h=d.get("history",{}) or {}
        dates=sorted({e["date"] for v in h.values() for e in (v or []) if e.get("date")})
        if dates:
            gap=(datetime.date.today()-datetime.date.fromisoformat(dates[-1])).days
            bits.append("last workout logged today" if gap==0 else
                        "last workout was yesterday" if gap==1 else
                        "last workout was %d days ago" % gap)
            last=dates[-1]; pbs=[]
            for k,es in h.items():
                es=es or []
                t=[e["top"] for e in es if e.get("date")==last]
                b=[e["top"] for e in es if e.get("date","")<last]
                if t and b and max(t)>max(b):
                    pbs.append("%s %gkg" % (k.split("::")[0].replace("-"," "), max(t)))
            if pbs: bits.append("PB last time: "+", ".join(pbs[:3]))
    else:
        bits.append("export a backup to unlock stats")
    print(" | ".join(bits) if bits else random.choice(CHEER))
main()
PYEOF

# ---------- HTTP server (static + POST /api/save auto-backup) ----------
# Verbatim copy of serve.py from the repo root; the test suite checks they
# match. Edit serve.py, not this heredoc.
cat > "$TOOLS/serve.py" << 'PYSRVEOF'
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
PYSRVEOF

# ---------- main server script ----------
cat > "$TOOLS/serve.sh" << 'SRVEOF'
#!/data/data/com.termux/files/usr/bin/bash
BASH=/data/data/com.termux/files/usr/bin/bash
TOOLS="$HOME/gymtools"
WEB="$TOOLS/web"
BACKUPS="$HOME/gym-backups"
DL="$HOME/storage/downloads"
LOG="$HOME/gym-log.txt"
PIDF="$TOOLS/server.pid"
PORT=${GYM_PORT:-8000}
STAMP=$(date +%s)
URL="http://localhost:$PORT/gym-tracker.html?v=$STAMP"

toast(){ command -v termux-toast >/dev/null && termux-toast -g top "$1" || echo "$1"; }

# 0. pull the newest build from the repo (set the URL once in ~/gymtools/update-url)
#    e.g. echo "https://raw.githubusercontent.com/rosshuggins98-ai/gym-tracker/main/app/gym-tracker.html" > ~/gymtools/update-url
#    Every fetch carries ?<stamp>: raw.githubusercontent.com sits behind a CDN
#    that caches for ~5 minutes, and a stale hit there is indistinguishable
#    from "nothing new" -- the single most likely reason a push doesn't show.
if [ -f "$TOOLS/update-url" ]; then
  URLSRC=$(cat "$TOOLS/update-url")
  if [ -n "$URLSRC" ]; then
    TMP="$TOOLS/.fetched.html"
    if curl -fsSL --max-time 8 "$URLSRC?$STAMP" -o "$TMP" 2>/dev/null; then
      if [ -s "$TMP" ] && grep -q "const BUILD=" "$TMP"; then
        if ! cmp -s "$TMP" "$WEB/gym-tracker.html"; then
          cp -f "$TMP" "$WEB/gym-tracker.html"
          toast "Updated from the web: $(grep -o 'const BUILD="[^"]*"' "$TMP" | head -1 | cut -d'"' -f2)"
        fi
      fi
      rm -f "$TMP"
    else
      toast "Update check failed (offline?) - using installed build"
    fi
    # sw.js (offline shell cache) lives alongside the app file at the same URL,
    # same directory. Best-effort: a missing or unreachable sw.js just means no
    # offline cache, not a broken install.
    SWURL="${URLSRC%/*}/sw.js"
    TMPSW="$TOOLS/.fetched-sw.js"
    if curl -fsSL --max-time 8 "$SWURL?$STAMP" -o "$TMPSW" 2>/dev/null; then
      if [ -s "$TMPSW" ] && grep -q "addEventListener('fetch'" "$TMPSW" && ! cmp -s "$TMPSW" "$WEB/sw.js" 2>/dev/null; then
        cp -f "$TMPSW" "$WEB/sw.js"
      fi
      rm -f "$TMPSW"
    fi
    # The launcher scripts themselves (this file, serve.py, stop.sh, ...) all
    # come from termux/gym-setup.sh in the repo. Fetch it; if it differs from
    # the installer that produced the current scripts, re-run it in NOLAUNCH
    # mode (writes the scripts, doesn't start anything) and then hand over to
    # the freshly written serve.sh. GYM_RELAUNCHED stops a loop if the new
    # installer somehow still doesn't match what it fetched.
    if [ -z "$GYM_RELAUNCHED" ]; then
      SETUPURL="${URLSRC%/app/*}/termux/gym-setup.sh"
      TMPSU="$TOOLS/.fetched-setup.sh"
      if curl -fsSL --max-time 8 "$SETUPURL?$STAMP" -o "$TMPSU" 2>/dev/null; then
        if [ -s "$TMPSU" ] && grep -q "GYM_SETUP_VERSION=" "$TMPSU" && ! cmp -s "$TMPSU" "$TOOLS/gym-setup.sh" 2>/dev/null; then
          NEWV=$(grep -o 'GYM_SETUP_VERSION=[0-9]*' "$TMPSU" | head -1 | cut -d= -f2)
          toast "Updating launcher scripts (v$NEWV)"
          if GYM_SETUP_NOLAUNCH=1 bash "$TMPSU" > "$TOOLS/setup.log" 2>&1; then
            cp -f "$TMPSU" "$TOOLS/gym-setup.sh"
            rm -f "$TMPSU"
            # the running server is the old one (old serve.py, or the bare
            # http.server from before there was a serve.py): stop it so step 5
            # of the new launcher starts the new one
            [ -f "$PIDF" ] && { kill "$(cat "$PIDF")" 2>/dev/null; rm -f "$PIDF"; }
            pkill -f "python3 -m http.server $PORT" 2>/dev/null
            pkill -f "gymtools/serve.py" 2>/dev/null
            GYM_RELAUNCHED=1 exec bash "$TOOLS/serve.sh"
          else
            toast "Launcher update failed - see ~/gymtools/setup.log"
          fi
        fi
        rm -f "$TMPSU"
      fi
    fi
  fi
else
  toast "No update-url set - app won't auto-update (see doctor.sh)"
fi

# 1. install a newer app file from Downloads, if there is one (manual override /
#    local testing without touching GitHub). Compares BUILD stamps, not just file
#    content or mtime -- a byte-different but OLDER file (e.g. a copy left over
#    from months ago) must never win over what's already installed, including
#    whatever step 0 just fetched. BUILD is "YYYY-MM-DD" + a letter suffix, so a
#    plain string compare sorts it chronologically.
NEW=$(ls -t "$DL"/gym-tracker*.html 2>/dev/null | head -n1)
if [ -n "$NEW" ]; then
  NEWBUILD=$(grep -o 'const BUILD="[^"]*"' "$NEW" 2>/dev/null | head -1 | cut -d'"' -f2)
  CURBUILD=$(grep -o 'const BUILD="[^"]*"' "$WEB/gym-tracker.html" 2>/dev/null | head -1 | cut -d'"' -f2)
  if [ -n "$NEWBUILD" ] && [ "$NEWBUILD" \> "$CURBUILD" ]; then
    cp -f "$NEW" "$WEB/gym-tracker.html"
    toast "Installed $(basename "$NEW") (build $NEWBUILD)"
  fi
fi
[ -f "$WEB/gym-tracker.html" ] || { toast "gym-tracker.html not found in Downloads"; exit 1; }
# same manual path for sw.js -- best-effort, no BUILD stamp to compare
[ -f "$DL/sw.js" ] && ! cmp -s "$DL/sw.js" "$WEB/sw.js" 2>/dev/null && cp -f "$DL/sw.js" "$WEB/sw.js"

# 2. archive backups, keep newest 20
mkdir -p "$BACKUPS"
mv -f "$DL"/gym-backup-*.json "$BACKUPS"/ 2>/dev/null
mv -f "$DL"/gym-history-*.csv "$BACKUPS"/ 2>/dev/null
ls -t "$BACKUPS"/gym-backup-*.json 2>/dev/null | tail -n +21 | xargs -r rm -f
ls -t "$BACKUPS"/gym-history-*.csv 2>/dev/null | tail -n +21 | xargs -r rm -f

# 3. attendance log, one line per day
TODAY=$(date +%F)
grep -q "^$TODAY" "$LOG" 2>/dev/null || echo "$TODAY $(date +%H:%M)" >> "$LOG"

# 4. wake lock with 2h auto-release.
#    Create ~/gymtools/no-wakelock to skip it (removes Termux's own notification).
if [ ! -f "$TOOLS/no-wakelock" ]; then
  command -v termux-wake-lock >/dev/null && termux-wake-lock
  ( sleep 7200; termux-wake-unlock ) > /dev/null 2>&1 &
fi

# 5. start server if not already running (tracked by PID file)
RUNNING=""
if [ -f "$PIDF" ] && kill -0 "$(cat "$PIDF")" 2>/dev/null; then RUNNING=1; fi
if [ -z "$RUNNING" ]; then
  pkill -f "python3 -m http.server $PORT" 2>/dev/null   # clear a pre-2026-09-16 server
  pkill -f "gymtools/serve.py" 2>/dev/null               # ...or a stray one of ours
  # serve.py = static files + POST /api/save, which the app calls after every
  # finished session so a backup lands in $BACKUPS with no manual export.
  # Falls back to the bare module server if serve.py is somehow missing.
  if [ -f "$TOOLS/serve.py" ]; then
    nohup python3 "$TOOLS/serve.py" --port "$PORT" --dir "$WEB" --backups "$BACKUPS" > "$TOOLS/server.log" 2>&1 &
  else
    cd "$WEB" || exit 1
    nohup python3 -m http.server "$PORT" > /dev/null 2>&1 &
  fi
  echo $! > "$PIDF"
  sleep 1
fi

# 6. styled ongoing notification with working Stop
STATUS=$(python3 "$TOOLS/stats.py" 2>/dev/null)
[ -z "$STATUS" ] && STATUS="Server running on port $PORT"
if command -v termux-notification > /dev/null; then
  termux-notification \
    --id gymtracker \
    --title "🏋️ Gym Tracker" \
    --content "$STATUS" \
    --icon fitness_center \
    --ongoing --alert-once --priority low \
    --action "$BASH $TOOLS/open.sh" \
    --button1 "Open" \
    --button1-action "$BASH $TOOLS/open.sh" \
    --button2 "Stop" \
    --button2-action "$BASH $TOOLS/stop.sh" \
    > /dev/null 2>&1
fi

# 7. open the app
command -v termux-open-url >/dev/null && termux-open-url "$URL" || \
  am start -a android.intent.action.VIEW -d "$URL" > /dev/null 2>&1
SRVEOF

# ---------- stop script (PID-file based, pattern fallback) ----------
cat > "$TOOLS/stop.sh" << 'STOPEOF'
#!/data/data/com.termux/files/usr/bin/bash
# Runs from notification buttons too, where HOME/PATH may be unset.
export HOME=/data/data/com.termux/files/home
export PREFIX=/data/data/com.termux/files/usr
export PATH="$PREFIX/bin:/system/bin:$PATH"
PIDF="$HOME/gymtools/server.pid"
[ -f "$PIDF" ] && { kill "$(cat "$PIDF")" 2>/dev/null; rm -f "$PIDF"; }
pkill -f "python3 -m http.server 8000" 2>/dev/null
pkill -f "gymtools/serve.py" 2>/dev/null
"$PREFIX/bin/termux-wake-unlock" 2>/dev/null
"$PREFIX/bin/termux-notification-remove" gymtracker 2>/dev/null
"$PREFIX/bin/termux-toast" -g top "Gym Tracker stopped" 2>/dev/null
exit 0
STOPEOF

cat > "$TOOLS/open.sh" << 'OPENEOF'
#!/data/data/com.termux/files/usr/bin/bash
export HOME=/data/data/com.termux/files/home
export PREFIX=/data/data/com.termux/files/usr
export PATH="$PREFIX/bin:/system/bin:$PATH"
URL="http://localhost:8000/gym-tracker.html?v=$(date +%s)"
/system/bin/am start -a android.intent.action.VIEW -d "$URL" \
  --activity-clear-top --activity-single-top >/dev/null 2>&1 \
  || "$PREFIX/bin/termux-open-url" "$URL"
exit 0
OPENEOF

# ---------- widgets ----------
cat > "$SHORTCUTS/Gym.sh" << 'W1EOF'
#!/data/data/com.termux/files/usr/bin/bash
bash "$HOME/gymtools/serve.sh"
W1EOF
cat > "$SHORTCUTS/Gym-Stop.sh" << 'W2EOF'
#!/data/data/com.termux/files/usr/bin/bash
bash "$HOME/gymtools/stop.sh"
W2EOF

chmod +x "$TOOLS/serve.sh" "$TOOLS/stop.sh" "$TOOLS/open.sh" "$TOOLS/stats.py" "$TOOLS/serve.py" "$SHORTCUTS/Gym.sh" "$SHORTCUTS/Gym-Stop.sh"
rm -f "$SHORTCUTS/gym.sh" 2>/dev/null   # retire the old shortcut

echo ""
echo "Done. Widgets: Gym (start + open) and Gym-Stop."
echo "Needs: pkg install termux-api  AND the Termux:API app from F-Droid."
echo ""
cat > "$TOOLS/doctor.sh" << 'DOCEOF'
#!/data/data/com.termux/files/usr/bin/bash
TOOLS="$HOME/gymtools"; WEB="$TOOLS/web"; DL="$HOME/storage/downloads"
echo "--- Gym Tracker doctor ---"
echo "Serving file:"
ls -l "$WEB/gym-tracker.html" 2>/dev/null || echo "  MISSING"
echo "  build stamp: $(grep -o 'const BUILD="[^"]*"' "$WEB/gym-tracker.html" 2>/dev/null | head -1)"
echo "  size: $(wc -c < "$WEB/gym-tracker.html" 2>/dev/null) bytes"
echo ""
echo "Candidates in Downloads:"
ls -lt "$DL"/gym-tracker*.html 2>/dev/null | head -5 || echo "  none"
for f in "$DL"/gym-tracker*.html; do
  [ -f "$f" ] || continue
  echo "  $(basename "$f"): $(grep -o 'const BUILD="[^"]*"' "$f" 2>/dev/null | head -1) $(wc -c < "$f") bytes"
done
echo ""
echo "Update source:"
if [ -f "$TOOLS/update-url" ]; then
  U=$(cat "$TOOLS/update-url"); echo "  $U"
  R=$(curl -fsSL --max-time 8 "$U?$(date +%s)" 2>/dev/null | grep -o 'const BUILD="[^"]*"' | head -1)
  echo "  remote build: ${R:-UNREACHABLE (offline, wrong URL, or private repo)}"
else
  echo "  NOT SET. Fix with:"
  echo "  echo 'https://raw.githubusercontent.com/rosshuggins98-ai/gym-tracker/main/app/gym-tracker.html' > ~/gymtools/update-url"
fi
echo "Installer: v$(grep -o 'GYM_SETUP_VERSION=[0-9]*' "$TOOLS/gym-setup.sh" 2>/dev/null | head -1 | cut -d= -f2) ($TOOLS/gym-setup.sh)"
echo ""
echo "Server: $(pgrep -f 'gymtools/serve.py' >/dev/null && echo "running (serve.py)" || (pgrep -f 'http.server 8000' >/dev/null && echo "running (bare http.server, no auto-backup)" || echo stopped))"
echo "Auto-backups in $HOME/gym-backups: $(ls "$HOME"/gym-backups/gym-backup-*.json 2>/dev/null | wc -l) (latest: $(ls -t "$HOME"/gym-backups/gym-backup-*.json 2>/dev/null | head -1 | xargs -r basename))"
[ -f "$TOOLS/server.log" ] && { echo "Last server log lines:"; tail -3 "$TOOLS/server.log"; }
DOCEOF
chmod +x "$TOOLS/doctor.sh"

if [ -n "$GYM_SETUP_NOLAUNCH" ]; then
  echo "Scripts refreshed (v$GYM_SETUP_VERSION); not launching (GYM_SETUP_NOLAUNCH set)."
  exit 0
fi
echo "Testing stop/start cycle..."
bash "$TOOLS/stop.sh" 2>/dev/null || true
bash "$TOOLS/serve.sh"
