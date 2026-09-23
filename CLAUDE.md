# Context for Claude Code

## What this is
A workout tracker used on an Android phone, served locally from Termux. Single HTML
file, vanilla JS, no framework, no build step. That constraint is deliberate.

## Who uses it
One user, a gym beginner training 3 days a week, logging on a phone mid-workout.
The app's job is to make logging fast and to make progress visible enough to keep
him turning up. Motivation is a feature, not decoration.

## Hard constraints
- **Edit `src/`, ship one file.** The app is authored as modules under `src/`
  (`head.html`, `style.css`, `shell.html`, `js/NN-name.js`, `tail.html`) and
  `python3 build.py` concatenates them — byte-for-byte, no rewriting, stdlib only —
  into `app/gym-tracker.html`, which is **committed** and is what the phone
  installs. Never edit `app/gym-tracker.html` directly: the build test fails if it
  drifts from `src/`. Always run `build.py` before the tests and commit both.
- **One file out.** `app/gym-tracker.html` must stay self-contained and runnable by
  `python3 -m http.server`. No npm, no bundler, no runtime CDN. The one narrow,
  deliberate exception is `app/sw.js` (offline shell cache) — a service worker has
  to be a same-origin file by browser security policy, a `blob:`/`data:` URL can't
  be registered as one, so it can't be inlined into the HTML. It's still no
  bundler, no CDN, and the app works fully without it if it's ever missing
  (registration is wrapped in a no-op `.catch()`). Don't add a third file without
  an equally load-bearing platform reason.
- **Three storage modes.** Claude artifact storage, localStorage, and none (file://,
  falls back to mirroring state into the URL hash). Don't collapse this.
- **Migration is load-bearing.** Several older key formats are migrated on boot.
  Never remove `MIGRATE`, `pullLegacy`, or `pullLegacyWeights` without a replacement.
  `migrate()` also recovers pre-2026-09-10 `baseId::slug` swap keys onto today's
  `hkey()` scheme (see below) — keep that in step with `hkey()` if it changes again.
- **kg only.**
- **Custom exercise names are user input.** They're stripped of HTML-significant
  characters in `cleanName()` because the app renders with innerHTML throughout. If
  that ever changes, escape at render instead.

## Server
`serve.py` (stdlib only) serves `app/` and handles `POST /api/save`, which the app
calls from `autoBackup()` after every finished session. It is embedded verbatim in
`termux/gym-setup.sh` as a heredoc and a test asserts the two match — edit
`serve.py`, then paste it into the heredoc (or regenerate) before committing.
`autoBackup()` must stay fire-and-forget: no UI, no error, if the endpoint is absent.

The Termux launcher (`serve.sh`, written by `gym-setup.sh`) self-updates: on every
tap it fetches `termux/gym-setup.sh` from the repo and re-runs it in
`GYM_SETUP_NOLAUNCH=1` mode when it has changed, so pushing a change to any
launcher script is enough. `test/launcher.test.js` runs that whole path against a
local server — keep it passing when touching `gym-setup.sh`. All remote fetches
carry a `?stamp` because raw.githubusercontent.com caches for ~5 minutes.

`app/sw.js` is network-first with the query string stripped from cache keys. Don't
go back to cache-first: the launcher URL has a fresh `?v=` stamp per tap, and
cache-first would either never match (offline broken) or show the previous build.

## File order
One script scope; later modules call earlier ones. `src/js/`:
`10-lib` (exercise library + cues) → `20-plans` (`DEFAULT_PLAN`, `FULL_BODY_PLAN`,
`PRESETS`, `MIGRATE`, `BUILD`) → `30-storage` → `40-state` (helpers, PB, prefill,
supersets, rest) → `50-render` → `55-rest` → `60-progress` → `62-cues` → `64-swap` →
`66-plates` → `68-chart` → `70-editor` → `72-routines` → `74-theme` → `76-data`
(export/import) → `80-bodyweight` → `82-summary` → `84-autobackup` → `86-actions`
(finish) → `90-migrate` → `99-boot`. New module: pick a free number, end the file
with a newline.

## Key concepts
- **History key**: `hkey(exId, alt)`. Unswapped, it's `exerciseId`. Swapped, it
  resolves the alternate's *name* — case-insensitively — against every library
  entry's display name first: if it matches a real tracked exercise (e.g. Incline
  swapped to "Bench Press", or Pull Ups swapped to "Lat Pulldown"), the key is that
  exercise's own id, merging straight into its existing history. Only when the name
  matches nothing does it fall back to a global `alt::slug` key. That global key is
  shared by name alone, not by which slot it was swapped from — "Machine Chest
  Press" is the same machine whether it stood in for Bench, Incline or Push-ups
  (it's listed as an alt on all three), so its PB must be one number, not three.
  Never go back to prefixing alt keys with the base exercise id — that was the
  original bug (PBs on a shared alternate didn't "translate" between the
  exercises it was swapped in for).
- **PB**: heavier weight, *or* same weight for more reps. Both count.
- **Rest**: per plan item, `it.rest` seconds, read through `restFor(it)`. Absent means
  `REST_DEFAULT` (60s) — that's the migration for every pre-2026-09-16 plan and
  routine, so never make `rest` required.
- **Promoting an alt to a real exercise**: if a name that was only ever in some
  `alts:[]` list gets its own `LIB` entry (as Chest-Supported Row did), `hkey()` starts
  resolving that name to the new id. `migrate()` handles this generically — any
  `alt::<slug>` key whose slug matches a library name is merged into that id — so
  adding the entry is enough, no `MIGRATE` line needed.
- **Making a swap the planned exercise**: `promoteSwap(exId)` (the button under an
  active swap) rewrites the plan item on every day to the alt. A name that matches a
  library entry reuses that id; anything else becomes a custom exercise with the old
  main first in its `alts`, and `migrate()` moves its `alt::slug` history across — the
  same generic path as promoting an alt in `LIB`. Swaps themselves are global per
  exercise id and persist until switched back.
- **Supersets**: `it.super` on a plan item = "paired with the next item". Roles come
  from `ssRole(d, idx)` — always pass the day and index, never infer from the item
  alone, since the pairing is positional. Rest fires after the second half only.
- **Session summary**: `summarise(d)` runs *before* `doNewSession` writes history,
  so its PB list compares against the previous record. Keep that ordering.
- **Presets vs routines**: `PRESETS` are the two built-in plans; `routines` are the
  user's saved snapshots. `loadPreset()` snapshots the outgoing plan into routines
  first. `prev`/`cur` are keyed by day id; `lastSrc()` falls back across days and
  then to history so a new preset's "last" hints aren't blank.

## Testing
```bash
python3 build.py && node --test test/
```

No npm, nothing to install: `test/harness.js` evaluates the app's `<script>` in a
`vm` sandbox with a stub DOM (every element is a Proxy that swallows everything),
so the whole file boots and every top-level function/variable is reachable as
`app.name`, assignable via `set('name', value)`. Storage lands in `Store`'s
in-memory fallback, so each `load()` is a clean slate. Sandbox values have their
own prototypes — compare with `deq()` (JSON round-trip) not `assert.deepEqual`.
Coverage: migration, PB detection, volume/trend/1RM, the finish-session flow,
backup round-trip, presets. Add a test whenever you touch any of those.

The suite doesn't render anything, so still serve and click through after a UI
change: log a set, swap an exercise, edit the plan, create a custom exercise,
finish a session, open Progress, export a backup, re-import it.

## Good next tasks
- "Next up" on the main screen for A/B/C rotation — the app has no notion of
  which day comes next; with full body it's whichever of A/B/C was finished
  longest ago (`prev[dayId]._date` already holds that), so it's a small addition
- Day editor: add / rename / remove days. Presets are hard-wired to three days
  and three accent vars (`--a1..--a3`); a 4-day upper/lower would need both
- Swap to any library exercise, not only the listed `alts` — the swap sheet is
  alt-list only, so Leg Press → Bulgarian means a plan edit, not a swap
- Per-set history: `hist` keeps only the top set per session, so "vs last time"
  in the summary leans on `prev` (one session deep). Storing the set list per
  entry would make volume trends and set-by-set comparison possible
- A tiny browser smoke test (the vm harness can't render); even a script that
  opens the file in headless Chromium and checks for console errors would catch
  what the stub DOM hides
