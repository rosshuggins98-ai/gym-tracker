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
  `dropDupeDays()` (a session saved twice a day apart) runs once at boot behind
  `gt4_dedupe1`, and on every import.
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
supersets, rest) → `50-render` → `55-rest` → `57-place` (gym / home) → `58-coach` → `59-effort` → `60-progress` → `61-week` (sets per
muscle group, check-in, still-to-do strip, days done this week) → `62-cues` →
`63-compare` (Progress "How you're doing": span vs the span before) → `64-swap` →
`66-plates` → `68-chart` → `70-editor` → `72-routines` → `74-theme` → `76-data`
(export/import) → `78-onthefly` (today-only extras, skips) → `80-bodyweight` → `82-summary` → `84-autobackup` → `86-actions`
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
- **Today-only changes**: `it.extra` (added from the workout screen) and `it.skip`
  (skipped today) are flags on plan items, so they ride along with the plan in storage
  and backups. `doNewSession()` records history, then `endOfSession()` drops extras
  and clears skips. Anything snapshotting a plan (routines, `loadPreset`) goes through
  `cleanDays()`. Skipping also deletes the item's `cur` slots, so its prefills don't
  ride into `prev`.
- **Only ticked sets count.** `topOf`, `topWithReps`, `setVol` and `doneSets` all skip
  unticked slots, which still hold last session's prefill. Ties at the top weight go
  to the set with more reps.
- **History entries**: `{date, top, reps, vol, sets}`. `sets` (every ticked set as
  `{w, r, t?}`, warm-ups included and flagged) exists from 2026-09-23 on; older
  entries only have the top set, so every reader must fall back to `top`/`reps`.
- **Rep ranges**: `it.reps` is the top of the range per set, `it.lo` the bottom.
  `lo` is optional — `loFor(it)` defaults it from the top (10 → 8, 12 → 8,
  15 → 12, else ~¾), which is the migration for every pre-2026-10-07 plan, so
  never make it required.
- **Coach** (`58-coach`): double progression, "top set + floor", from the last
  history entry for the slot's key. `judged(e)` drops warm-ups plus a ramp-up
  (leading sets >10% lighter than the top weight, marked or not); `setsNeeded()`
  works out how many working sets were due (a warm-up in a planned row uses one up,
  one in a warm-up row or an extra row doesn't). First of those at the top weight
  ≥ the top of the range and none below `lo` → `up` one jump; under `lo` two
  sessions running at the same weight → `down` to the weight before; `stall` (drop
  ~10%) when none of the last 3 sessions beat the best before them, unless the
  weight climbed at least a jump across those 3 (a reset under way); else `stay`.
  Everything but a hit carries `why`, shown on the card. No plan item (exercise not
  planned) → always `stay`. Jumps come from `incFor(k)`: kit defaults (DB 2, pin
  machine 5, else 2.5, bodyweight 0 = reps only), overridden per key in `gt4_incs`
  (in backups; moved by `promoteSwap`); the card's weight +/− buttons step by the
  same jump. Rep records (`repRecords`) are the heaviest weight for ≥N reps and
  feed a third PB kind, `range`. Estimated 1RM is displayed only for ≤10 reps
  (`e1RMShown`); `trendFor`/`stalled` still use raw Epley because they only compare
  an exercise with itself.
- **Warm-up rows**: `it.wu` rows above set 1, always typed `'warm'`, not planned
  sets. They're a plan property (kept by `endOfSession` and `cleanDays`), so
  `prev` lines up row for row. Anything indexing working sets in `cur` must offset
  by `wuOf(it)`: `done`, `updateProgress`, `applyCoach`, `removeSet`.
- **Unconfirmed reps**: ticking a set with empty reps still fills the target (two
  taps per set stays), but a slot only gets `rt` once its reps are typed or
  stepped. Without it the row is flagged, and `finishChecks()` lists untyped sets
  and exercises identical to their last entry on the finish sheet.
- **Week balance** (`61-week`): working sets per muscle group against the plan's
  weekly sets (every day once), not kg. Only plan days count from `cur`
  (`liveDays()`) — a previous plan's unfinished sets stay in `cur` indefinitely.
- **Gym / home** (`57-place`): `PLACE` (`gt4_place`, in backups) is where today's
  session is and stays on whatever was picked last. Finishing stamps `at` on each
  history entry and `_at` on `prev`; no `at` means gym (everything before
  2026-10-08). `coach()` judges only the entries at `PLACE` when there are any
  (`coachOn` is the old body); with none it uses them all and, for dumbbell lifts,
  snaps the weight onto `rackAt(PLACE)`, the dumbbells logged there. `lastSrc()`
  skips a prev from the other place once this place has history. PBs, the
  check-in and Compare are still place-blind (Compare labels home sessions).
  Past sessions are re-tagged a whole date at a time (`tagDate`).
- **Home kit** (`57-place`): home is adjustable dumbbells + an adjustable bench.
  At home `swaps` is a computed map (`homeSwapMap()`, marked `__home`) and the gym
  map waits in `gymSwaps`; at the gym `swaps` is the gym map, as always. Anything
  that replaces `swaps` or the plan must be followed by `enterPlace()` (`render()`
  calls it). Each slot's home pick: the user's choice made at home (`homePicks`,
  `gt4_homeswaps`, `''` = planned), else the gym swap if `homeOk()`, else the
  planned exercise if it is, else `HOME_PREF`, else the first workable alt.
  Backups and the URL hash store the gym map (`gymSwapMap()`). `prev._keys`
  (stamped on finish) records the history key each slot was logged as, so a
  prefill never crosses exercises; older prevs count as logged under the gym map.
- **Effort** (`59-effort`): Easy / Solid / Hard / Off day, one tap on the summary
  sheet, kept per date in `efforts` (`gt4_effort`, `effort` in backups), not on
  history entries. `coach()` drops off-day entries before judging (unless that
  leaves none) and says so in `why`; the other ratings are only shown.
- **Days done this week**: read from `prev[dayId]._date` (stamped on finish), not
  history -- history entries don't record which day they came from. The tabs show
  "✓ Done Tue" and mark the not-done day finished longest ago as "Up next".
- **Compare** (`63-compare`): per lift, best entry in the span by `entryScore`
  vs the best in the span before (else the latest before it, else its first
  session). Early entries with no reps are skipped as baselines when a rep-logged
  one exists, and compared by top weight when not -- otherwise a weight-only
  entry scores as one rep and every gain looks huge.
- **Supersets**: `it.super` on a plan item = "paired with the next item". Roles come
  from `ssRole(d, idx)` — always pass the day and index, never infer from the item
  alone, since the pairing is positional. Rest fires after the second half only.
- **Session summary**: `summarise(d)` runs *before* `doNewSession` writes history,
  so its PB list compares against the previous record. Keep that ordering.
- **Presets vs routines**: `PRESETS` are the three built-in plans; `routines` are the
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

## Backlog
Everything agreed but not built yet lives in `docs/BACKLOG.md`. Read it at the start
of a session when looking for the next thing to do, and move items to its "Done"
section (with the commit hash) as they ship.
