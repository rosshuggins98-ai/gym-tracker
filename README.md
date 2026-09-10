# Gym Tracker

A single-file workout tracker that runs on a phone. Logs weight and reps per set,
charts progress per exercise, allows equipment swaps mid-workout, and lets the
training plan be edited without losing history.

Built around a 3-day beginner push/pull/legs programme, but the plan is data — it
can be changed entirely from inside the app.

## Layout

```
app/gym-tracker.html     the whole app (no build step, no dependencies)
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

**Manual:** copy `app/gym-tracker.html` to the phone's Downloads and tap the Gym
widget. The server script installs it automatically.

**Automatic (better):** host the file anywhere reachable — GitHub raw, your own
server, Netlify — and tell the phone where to look, once:

```bash
echo "https://raw.githubusercontent.com/USER/REPO/main/app/gym-tracker.html" \
  > ~/gymtools/update-url
```

From then on, every widget tap fetches the newest build before opening. Push a
commit, tap the widget, you're on the new version.

## Principles worth keeping

1. **History belongs to the exercise, not the day.** Rearranging the plan must never
   orphan logged weights.
2. **Single file, no build step.** It has to be servable by `python3 -m http.server`
   from a phone.
3. **Never lose data silently.** Every storage mode is detected and reported.
4. **Gym-floor usability first.** Large tap targets, minimal typing, one-handed.
