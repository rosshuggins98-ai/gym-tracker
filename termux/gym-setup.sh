#!/data/data/com.termux/files/usr/bin/bash
# ============================================================
#  Gym Tracker - Termux setup (v2)
#  Run once:   bash ~/storage/downloads/gym-setup.sh
#  Safe to re-run: it replaces the scripts with fixed versions.
# ============================================================
set -e
TOOLS="$HOME/gymtools"
WEB="$TOOLS/web"
SHORTCUTS="$HOME/.shortcuts"
BACKUPS="$HOME/gym-backups"

echo "Setting up Gym Tracker v2..."
mkdir -p "$TOOLS" "$WEB" "$SHORTCUTS" "$BACKUPS"

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
PORT=8000
STAMP=$(date +%s)
URL="http://localhost:$PORT/gym-tracker.html?v=$STAMP"

toast(){ command -v termux-toast >/dev/null && termux-toast -g top "$1" || echo "$1"; }

# 0. optional: pull the newest build from a URL (set it once in ~/gymtools/update-url)
#    e.g. echo "https://raw.githubusercontent.com/you/gym-tracker/main/app/gym-tracker.html" > ~/gymtools/update-url
if [ -f "$TOOLS/update-url" ]; then
  URLSRC=$(cat "$TOOLS/update-url")
  if [ -n "$URLSRC" ]; then
    TMP="$TOOLS/.fetched.html"
    if curl -fsSL --max-time 8 "$URLSRC" -o "$TMP" 2>/dev/null; then
      if [ -s "$TMP" ] && grep -q "const BUILD=" "$TMP"; then
        if ! cmp -s "$TMP" "$WEB/gym-tracker.html"; then
          cp -f "$TMP" "$WEB/gym-tracker.html"
          toast "Updated from the web: $(grep -o 'const BUILD="[^"]*"' "$TMP" | head -1 | cut -d'\"' -f2)"
        fi
      fi
      rm -f "$TMP"
    fi
  fi
fi

# 1. install newest app file from Downloads (compares content, not just dates)
NEW=$(ls -t "$DL"/gym-tracker*.html 2>/dev/null | head -n1)
if [ -n "$NEW" ]; then
  A=$(md5sum "$NEW" 2>/dev/null | cut -d' ' -f1)
  B=$(md5sum "$WEB/gym-tracker.html" 2>/dev/null | cut -d' ' -f1)
  if [ "$A" != "$B" ]; then
    cp -f "$NEW" "$WEB/gym-tracker.html"
    toast "Installed $(basename "$NEW")"
  fi
fi
[ -f "$WEB/gym-tracker.html" ] || { toast "gym-tracker.html not found in Downloads"; exit 1; }

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
  termux-wake-lock
  ( sleep 7200; termux-wake-unlock ) > /dev/null 2>&1 &
fi

# 5. start server if not already running (tracked by PID file)
RUNNING=""
if [ -f "$PIDF" ] && kill -0 "$(cat "$PIDF")" 2>/dev/null; then RUNNING=1; fi
if [ -z "$RUNNING" ]; then
  pkill -f "python3 -m http.server $PORT" 2>/dev/null   # clear any stray old server
  cd "$WEB" || exit 1
  nohup python3 -m http.server "$PORT" > /dev/null 2>&1 &
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

chmod +x "$TOOLS/serve.sh" "$TOOLS/stop.sh" "$TOOLS/open.sh" "$TOOLS/stats.py" "$SHORTCUTS/Gym.sh" "$SHORTCUTS/Gym-Stop.sh"
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
echo "Server: $(pgrep -f 'http.server 8000' >/dev/null && echo running || echo stopped)"
DOCEOF
chmod +x "$TOOLS/doctor.sh"

echo "Testing stop/start cycle..."
bash "$TOOLS/stop.sh" 2>/dev/null || true
bash "$TOOLS/serve.sh"
