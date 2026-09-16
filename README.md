# Gym Tracker

A single-file workout tracker that runs on a phone. Logs weight and reps per set,
charts progress per exercise, allows equipment swaps mid-workout, and lets the
training plan be edited without losing history.

Ships two 3-day presets — a beginner push/pull/legs and a full-body A/B/C — but the
plan is data and can be changed entirely from inside the app.

## Layout

```
app/gym-tracker.html     the app (no build step, no dependencies)
app/sw.js                offline shell cache; optional, the app works without it
termux/gym-setup.sh      installs the Android/Termux server + widgets
serve.py                 dev server with caching disabled
docs/ARCHITECTURE.md     data model, storage keys, migration history
docs/TRAINING-PLAN.md    the programme and the reasoning behind it
CLAUDE.md                context for Claude Code
```

## Running it locally

```bash
./serve.py         # http://localhost:8000/gym-tracker.html
```

It must be served over http:// — opened directly as a file, Chrome gives it no
storage (see ARCHITECTURE.md, "Storage modes").

## Deploying to the phone

Two options.

**Manual:** copy `app/gym-tracker.html` (and, optionally, `app/sw.js` for offline
support) to the phone's Downloads and tap the Gym widget. The server script installs
whichever of the two it finds automatically.

**Automatic (better):** host the files anywhere reachable — GitHub raw, your own
server, Netlify — and tell the phone where to look, once:

```bash
echo "https://raw.githubusercontent.com/USER/REPO/main/app/gym-tracker.html" \
  > ~/gymtools/update-url
```

From then on, every widget tap fetches the newest build before opening — `sw.js`
too, from the same directory as the URL above. Push a commit, tap the widget, you're
on the new version.

## Working offline

Once the app has loaded successfully at least once over http://, `app/sw.js`
registers a service worker that caches the shell, so the app opens (and your
already-logged data is fully readable and editable) even with the Termux server
stopped or unreachable — the biggest practical annoyance of the plain single-file
version. It's optional: if `sw.js` is missing or fails to register (older phone
setup, or a non-`localhost` origin, which isn't a secure context), the app runs
exactly as it always did, online-only.

## Principles worth keeping

1. **History belongs to the exercise, not the day.** Rearranging the plan must never
   orphan logged weights.
2. **Single file, no build step.** It has to be servable by `python3 -m http.server`
   from a phone.
3. **Never lose data silently.** Every storage mode is detected and reported.
4. **Gym-floor usability first.** Large tap targets, minimal typing, one-handed.
