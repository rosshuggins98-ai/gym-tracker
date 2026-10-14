# Gym Tracker

A single-file workout tracker that runs on a phone. Logs weight and reps per set,
charts progress per exercise, allows equipment swaps mid-workout, and lets the
training plan be edited without losing history.

Ships two 3-day presets — a beginner push/pull/legs and a full-body A/B/C — but the
plan is data and can be changed entirely from inside the app.

## Layout

```
src/                     the app's source: head/shell/tail HTML, style.css, js/NN-name.js
build.py                 concatenates src/ -> app/gym-tracker.html (stdlib, byte-for-byte)
app/gym-tracker.html     the built app, committed; what the phone installs
app/sw.js                offline shell cache; optional, the app works without it
termux/gym-setup.sh      installs the Android/Termux server + widgets
serve.py                 server: static files + POST /api/save auto-backup (dev and Termux)
test/                    node --test 'test/*.test.js'  (no npm)
docs/ARCHITECTURE.md     data model, storage keys, migration history
docs/TRAINING-PLAN.md    the programme and the reasoning behind it
docs/BACKLOG.md          agreed work, in order
docs/MARKET-REVIEW.md    October 2026 review of the leading gym trackers
CLAUDE.md                context for Claude Code
```

## Running it locally

```bash
python3 build.py   # after editing anything in src/
./serve.py         # http://localhost:8000/gym-tracker.html, backups -> ./gym-backups/
node --test 'test/*.test.js'  # the suite (includes a check that the build is current)
```

It must be served over http:// — opened directly as a file, Chrome gives it no
storage (see ARCHITECTURE.md, "Storage modes").

## Auto-backup

Every finished session is POSTed to `/api/save`; `serve.py` writes it to
`gym-backups/gym-backup-<date>.json` (one per day, newest 20 kept) and
`gym-backups/gym-latest.json`. On the phone that's `~/gym-backups/`, the same folder
the manual exports get archived to. If the app is served by anything else (or
`file://`), it silently does nothing — the manual export in the Data panel is
unchanged. The Data panel shows when the last auto-backup landed.

## Backups to GitHub (off the phone)

The auto-backups above live on the phone, so losing the phone would lose them
too. `serve.py --offsite` also sends each one to a **private** GitHub repo:
one file per day, `gym-backup-<date>.json`, at the repo root. It sends them when
the server starts, after every finished session, and every 5 minutes while one is
still waiting (no signal at the gym). It remembers what has gone up, so only new
or changed days are sent. It refuses a public repo, because backups hold your
bodyweight and notes. The finish screen says "Backed up to the phone and GitHub
✓", the Data panel shows when a backup was last sent, and if nothing has got
through for a week the finish screen warns you.

**One-off setup** (after the launcher has updated: tap the Gym widget once):

1. **Make the repo.** On github.com: **+** → **New repository**. Name it
   `gym-backups`, choose **Private**, tick **Add a README file**, then
   **Create repository**.
2. **Make a token that can only use that repo.** Settings → Developer settings →
   Personal access tokens → **Fine-grained tokens** → **Generate new token**.
   - Name: `gym backups`.
   - Expiration: the longest it offers.
   - Repository access: **Only select repositories** → `gym-backups`.
   - Permissions → Repository permissions → **Contents: Read and write**.
     Metadata: Read-only is added automatically.

   Generate it and copy the token (it starts `github_pat_`).
3. **Give it to the phone.** In Termux, run `bash ~/gymtools/offsite-setup.sh`.
   Type `rosshuggins98-ai/gym-backups` (a pasted repo URL works too), then paste
   the token. It doesn't show as you paste. The script saves both where only
   Termux can read them, checks them with GitHub, and sends the backups already
   on the phone.

To change the token (say, when it expires), run the same command again. To stop
the copy, run `bash ~/gymtools/offsite-setup.sh off`. `bash ~/gymtools/doctor.sh`
also prints the GitHub copy's status.

**Restoring on a new phone:** set up Termux and the launcher as below and open
the app. Then on GitHub, open the repo, open the newest `gym-backup-<date>.json`,
and download it (the download button above the file). In the app, go to Data →
Import, pick the file, and tap **Replace my data**.

## Deploying to the phone

Two options.

**Manual:** copy `app/gym-tracker.html` (and, optionally, `app/sw.js` for offline
support) to the phone's Downloads and tap the Gym widget. The server script installs
whichever of the two it finds automatically.

**Automatic (better):** tell the phone where the repo is, once, in Termux:

```bash
echo "https://raw.githubusercontent.com/rosshuggins98-ai/gym-tracker/main/app/gym-tracker.html" \
  > ~/gymtools/update-url
```

From then on, every tap of the Gym widget does, in order:

1. fetch `app/gym-tracker.html` and `app/sw.js` from that URL (cache-busted, so
   GitHub's ~5-minute CDN cache can't hand back the previous build) and install
   them if they differ;
2. fetch `termux/gym-setup.sh`; if it differs from the installer that produced the
   current launcher scripts, re-run it silently (`GYM_SETUP_NOLAUNCH=1`) so
   `serve.sh`, `serve.py`, `stop.sh`, `doctor.sh` are refreshed too, stop the old
   server, and hand over to the new `serve.sh`;
3. start `serve.py` if it isn't running, and open the app.

So the whole loop is *push → tap the widget*. If something doesn't show up, run
`bash ~/gymtools/doctor.sh`: it prints the installed build, the build at the
update URL (or why it can't reach it), the installer version and the server state.

Phones set up before 2026-09-16 have a launcher without step 2, so re-run
`gym-setup.sh` by hand once more; after that it self-updates. Push a commit, tap the widget, you're
on the new version.

## Working offline

Once the app has loaded successfully at least once over http://, `app/sw.js`
registers a service worker that caches the shell, so the app opens (and your
already-logged data is fully readable and editable) even with the Termux server
stopped or unreachable — the biggest practical annoyance of the plain single-file
version. It's network-first: with the server up you always get the file on disk
(so a just-installed build shows immediately), the cache only answers when the
server can't be reached. It's optional: if `sw.js` is missing or fails to register (older phone
setup, or a non-`localhost` origin, which isn't a secure context), the app runs
exactly as it always did, online-only.

## Principles worth keeping

1. **History belongs to the exercise, not the day.** Rearranging the plan must never
   orphan logged weights.
2. **Single file out, no toolchain.** Source lives in `src/`, but the shipped app is
   one HTML file servable by `python3 -m http.server` from a phone; `build.py` is a
   stdlib concatenation, not a bundler, and `serve.py` only adds the backup endpoint
   and the GitHub copy.
3. **Never lose data silently.** Every storage mode is detected and reported.
4. **Gym-floor usability first.** Large tap targets, minimal typing, one-handed.
