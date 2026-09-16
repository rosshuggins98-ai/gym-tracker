# Context for Claude Code

## What this is
A workout tracker used on an Android phone, served locally from Termux. Single HTML
file, vanilla JS, no framework, no build step. That constraint is deliberate.

## Who uses it
One user, a gym beginner training 3 days a week, logging on a phone mid-workout.
The app's job is to make logging fast and to make progress visible enough to keep
him turning up. Motivation is a feature, not decoration.

## Hard constraints
- **One file.** `app/gym-tracker.html` must stay self-contained and runnable by
  `python3 -m http.server`. No npm, no bundler, no runtime CDN. The one narrow,
  deliberate exception is `app/sw.js` (offline shell cache) — a service worker has
  to be a same-origin file by browser security policy, a `blob:`/`data:` URL can't
  be registered as one, so it can't be inlined into the HTML. It's still no build
  step, no bundler, no CDN, and the app works fully without it if it's ever missing
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

## File order
CSS → HTML shell → `LIB` (exercise library + form cues) → `DEFAULT_PLAN` →
`FULL_BODY_PLAN` / `PRESETS` → `MIGRATE`
→ storage adapter → state helpers → PB helpers → render → rest timer → progress
sheet → cues/swap/chart sheets → plan editor → export/import → boot.

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
- **Supersets**: `it.super` on a plan item = "paired with the next item". Roles come
  from `ssRole(d, idx)` — always pass the day and index, never infer from the item
  alone, since the pairing is positional. Rest fires after the second half only.
- **Presets vs routines**: `PRESETS` are the two built-in plans; `routines` are the
  user's saved snapshots. `loadPreset()` snapshots the outgoing plan into routines
  first. `prev`/`cur` are keyed by day id; `lastSrc()` falls back across days and
  then to history so a new preset's "last" hints aren't blank.

## Testing
```bash
node --test test/
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
- Split into `src/` modules with a concat step that still emits one file (now two,
  with `sw.js` — see Hard constraints)
- Body-weight tracking, session summary screen
