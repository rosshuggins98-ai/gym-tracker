# Gym Tracker: context for Claude Code

## What this is
A workout tracker used on an Android phone, mid-workout, served locally from Termux.
Vanilla JS, no framework, no npm. Authored as modules under `src/` and concatenated
by `build.py` (stdlib only) into one self-contained file, `app/gym-tracker.html`.
That shape is deliberate.

## Who it's for, and what it has to be good at
One user, Ross. He is a beginner, training three days a week, in kg, mostly at a
gym and sometimes at home (adjustable dumbbells and a bench). His plan keeps
changing as he improves, and his history must survive every change.

He values three things. Every feature should serve at least one of them:

1. **Designing effective workouts.** He builds and adjusts his own plan, so the app
   should give enough feedback (sets per muscle, balance, session length) for him
   to know a plan is sensible.
2. **Tracking progression.** He should always know what to lift next and whether
   he is progressing.
3. **Visualising progress.** He should see progress over weeks and months, in a
   way that keeps him turning up. Motivation is a feature, not decoration.

`docs/TRAINING-PLAN.md` has his programme history, the kit his gym lacks, and what
he has tried and disliked (for example supersets in the beginner plan, face pulls,
and three leg exercises in one session). Read it before proposing any plan or
preset change.

## Product principles
Use these to decide between options.

- **Logging speed comes first.** A set that matches last time should take two
  taps. A change that adds taps mid-workout is the wrong change unless Ross asks
  for it.
- **Insight over storage.** Answer "am I getting stronger?" and "what do I lift
  next?" without him doing any arithmetic.
- **A stable plan, progressed set by set.** The coach suggests and he decides. Don't
  generate workouts or reshuffle his plan automatically.
- **History belongs to the exercise**, not to the day or the plan.
- **Local and offline.** No accounts, cloud sync, social features, nutrition or
  wearables. `docs/MARKET-REVIEW.md` explains why. The one thing that leaves the
  phone is the backup copy `serve.py` sends to Ross's own private GitHub repo
  (chosen 2026-10-14, see "Server"). The app itself never talks to anything but
  its own server.
- **Plain language in the UI.** Match the existing copy: short and direct, and any
  jargon is explained where it appears (e.g. the note under "Est. 1RM").

## Commands
```bash
python3 build.py                # after any change in src/; writes app/gym-tracker.html
python3 build.py --check        # exits 1 if app/gym-tracker.html is stale
node --test 'test/*.test.js'    # the whole suite; nothing to install
./serve.py                      # http://localhost:8000/gym-tracker.html, backups go to ./gym-backups/
```
Use the quoted glob. `node --test test/` fails on Node 22 and later because it no
longer accepts a directory.

## Hard constraints
- **Edit `src/`, ship one file.** The app is authored as modules under `src/`
  (`head.html`, `style.css`, `shell.html`, `js/NN-name.js`, `tail.html`) and
  `python3 build.py` concatenates them — byte-for-byte, no rewriting, stdlib only —
  into `app/gym-tracker.html`, which is **committed** and is what the phone
  installs. Never edit `app/gym-tracker.html` directly: the build test fails if it
  drifts from `src/`. Always run `build.py` before the tests and commit both.
- **One file out.** `app/gym-tracker.html` must stay self-contained and runnable by
  `python3 -m http.server`. No npm, no bundler, no runtime CDN, no vendored
  libraries (charts are hand-rolled SVG; extend `buildChart()` in `68-chart.js`).
  The one narrow, deliberate exception is `app/sw.js` (offline shell cache) — a
  service worker has to be a same-origin file by browser security policy, a
  `blob:`/`data:` URL can't be registered as one, so it can't be inlined into the
  HTML. It's still no bundler, no CDN, and the app works fully without it if it's
  ever missing (registration is wrapped in a no-op `.catch()`). Don't add a third
  file without an equally load-bearing platform reason.
- **Three storage modes.** Claude artifact storage, localStorage, and none (file://,
  falls back to mirroring state into the URL hash). Don't collapse this.
- **Migrate, never orphan.** Ross has real history from 13 Aug 2026 onwards. Any
  change to the data model migrates the existing `gt4_*` keys. Test it by importing
  a backup exported from the previous build.
- **Migration is load-bearing.** Several older key formats are migrated on boot.
  `dropDupeDays()` (a session saved twice a day apart) runs once at boot behind
  `gt4_dedupe1`, and on every import.
  Never remove `MIGRATE`, `pullLegacy`, or `pullLegacyWeights` without a replacement.
  `migrate()` also recovers pre-2026-09-10 `baseId::slug` swap keys onto today's
  `hkey()` scheme (see below) — keep that in step with `hkey()` if it changes again.
- **Every piece of user data is in the backup.** A new `gt4_*` key that holds user
  data goes into `backup()` and `applyImport()` (`76-data.js`) and into the storage
  key table in `docs/ARCHITECTURE.md`, with a round-trip test.
- **kg only.**
- **Custom exercise names are user input.** They're stripped of HTML-significant
  characters in `cleanName()` because the app renders with innerHTML throughout. If
  that ever changes, escape at render instead.

## How to work
- **Pushing to `main` deploys.** With the update URL set on the phone (README,
  "Deploying to the phone"), the launcher fetches `app/gym-tracker.html` from
  `main` on the next tap of the widget. Treat `main` as production and don't push
  a build that fails the tests.
- **Bump `BUILD`** in `src/js/20-plans.js` on every change, as the date plus a
  letter (e.g. `2026-10-14a`). It shows on the phone, so Ross can confirm which
  build he is running.
- **One change per commit.** Rebuild, run the tests, and commit `src/` and `app/`
  together. The message says what changed and what was tested.
- **Start a session with `docs/BACKLOG.md`.** It holds the agreed work, in order.
  Move an item to its "Done" section, with the commit hash, when it ships.
- **New ideas come from `docs/MARKET-REVIEW.md`.** Its proposals are not agreed
  yet. Confirm one with Ross, then add it to the backlog. Where the backlog and the
  review overlap, the backlog's order wins.
- **Phone first.** Every screen must work at phone width, one-handed, in both the
  light and dark themes.

## Server
`serve.py` (stdlib only) serves `app/` and handles `POST /api/save`, which the app
calls from `autoBackup()` after every finished session. It is embedded verbatim in
`termux/gym-setup.sh` as a heredoc and a test asserts the two match — edit
`serve.py`, then paste it into the heredoc (or regenerate) before committing.
`autoBackup()` must stay fire-and-forget: no UI, no error, if the endpoint is absent.

**GitHub copy** (`serve.py --offsite ~/gymtools/offsite.json`, passed by `serve.sh`).
When that settings file exists (`{"repo","token"}`, chmod 600, written by
`~/gymtools/offsite-setup.sh`), `OffsiteWorker` sends every dated backup to that
private repo through the contents API, stdlib `urllib` only. It sends on start,
after each save (`worker.wake`), and every `OFFSITE_RETRY` seconds while one is
waiting. `<backups>/.offsite.json` remembers each file's hash and sha, so only
new or changed days go up. A `.offsite.lock` flock keeps the server and
`--offsite-check` from sending at once. Rules that must hold:
- Refuse a public repo.
- Never print, log, or return the token.
- Never let a copy failure touch the save or the server.
- Errors are plain sentences, shown as they are.

`/api/status` reports `offsite: {enabled:false}` or `{enabled, repo, pending,
last_ok, error}`. The Data panel shows it, and the summary line asks it a few
times after a save (`offsiteAfterSave`), warning when nothing has got through for
`OFFSITE_STALE` (7) days. Tests use a fake GitHub on localhost via the settings
file's `api` and `retry` keys. Never point tests at the real API.

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
`BEGINNER_PLAN`, `PRESETS`, `MIGRATE`, `BUILD`) → `30-storage` → `40-state`
(helpers, PB, prefill, supersets, rest) → `50-render` → `55-rest` → `57-place`
(gym / home) → `58-coach` → `59-effort` → `60-progress` → `61-week` (sets per
muscle group, check-in, still-to-do strip, days done this week) → `62-cues` →
`63-compare` (Progress "How you're doing": span vs the span before) → `64-swap` →
`65-calendar` (Progress month grids) → `66-plates` → `67-histedit` (editing past
sets) → `68-chart` → `69-milestones` (milestones, monthly review) → `70-editor` →
`72-routines` → `74-theme` → `76-data`
(export/import) → `78-onthefly` (today-only extras, skips) → `80-bodyweight` →
`82-summary` → `84-autobackup` → `85-unsaved` (dating a workout, the unsaved-workout card) →
`86-actions` (finish) → `90-migrate` → `99-boot`.
New module: pick a free number, end the file with a newline.

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
  When an entry has `sets`, `top`/`reps`/`vol` are derived: `entryFromSets(sets)`
  is the only rule, used by `doNewSession()` (through `addHistEntry`) and by every edit in `67-histedit`
  (`histEditSet`, `histToggleWarm`, `histDeleteSet`). Never write `top`/`reps` on
  such an entry directly. Only entries without `sets` are edited by their top set
  (`histEditTop`). An edit never leaves a session without a working set; deleting
  its only set deletes the session.
- **Unsaved workouts** (`85-unsaved`, 2026-10-15): a workout is saved only when
  Finish is tapped.
  - Its date is the day of its first ticked set (`sessionDate()`, from
    `sessionStart` / `gt4_start`), not the day Finish is tapped.
  - A workout from an earlier day keeps the place it was trained
    (`sessionAt` / `gt4_startat`) and is filed under that place's swaps
    (`swapsFor()`). A same-day finish uses `PLACE`, as before.
  - A plan day with ticks from an earlier day gets a card on the workout
    screen (`staleCard()`, shown before the monthly and weekly cards): save it
    as that date, or discard it with a second tap (`discardSession()`, which
    never touches history).
  - `noteTick()` restarts the clock when the only ticked set is a new one.
  - History holds one entry per lift per date, inserted in date order by
    `addHistEntry()`. A second finish on the same date appends its sets and
    derives the entry again with `entryFromSets`; an entry without `sets`
    keeps the better top set.
  - Anything new that writes history goes through `addHistEntry()`.
- **Session note**: one per date in `sessNotes` (`gt4_sessnote`, `sessNotes` in
  backups), typed on the summary sheet beside the effort rating. Stored as typed and
  shown through `escHTML()`, unlike exercise names, which are stripped at input.
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
  sets. They prefill (and show "last") only from a past warm-up (`warmLast()`):
  the same row last time if it was a warm-up, otherwise the latest session with
  one, otherwise empty. Never a working weight. Loading a preset or routine
  rebuilds every untouched prefill (`refreshPrefills()`), so a newly added
  warm-up row never inherits the old plan's set 1. They're a plan property (kept by `endOfSession` and `cleanDays`), so
  `prev` lines up row for row. Anything indexing working sets in `cur` must offset
  by `wuOf(it)`: `done`, `updateProgress`, `applyCoach`, `removeSet`.
- **Start at the target** (2026-10-15, Ross asked): before a workout starts
  (nothing ticked on the day), `render()` calls `applyTargets(d)`, which sets
  every working set to the coach's weight for this session (`coach().w`) instead
  of last time's. Weights typed by hand, warm-up rows and drop sets keep theirs.
  Once a set is ticked the day is left alone and carryWeight takes over. The
  "last" hint under each set still shows last time's weight.
- **Coaching nudges** (2026-10-26, agreed with Ross; in `58-coach`):
  - `sinceJump(k)` / `sinceJumpTxt(k)`: sessions in a row at the current working
    weight, comparing the first set's reps and the total reps then and now. It's
    shown on the card and the chart page, so a weight that hasn't moved still
    shows progress.
  - A big default machine jump (`incDefault` ≥ 5, no `incs` override, over 5%
    of the weight) asks for 2 reps past the top of the range before "up". A jump
    set by hand on the chart page is used as it is.
  - `setNudge()` puts a note on the rest bar after a ticked set. A first set
    2+ reps past the top of its range gets "save some for sets 2 and 3". A set
    3+ reps down on the one before gets 30s more rest.
  - `warmSuggest()`: a warm-up row with no past warm-up prefills about 55% of
    the session's target (75% and 85% for later rows) on the lift's own step,
    for 10 reps.
- **Weight carries forward** (2026-10-15, Ross asked): ticking a working set
  gives the sets after it its weight (`carryWeight()`), on screen and in `cur`.
  - Ticked sets, weights typed or stepped by hand (`wt` on the slot), warm-up
    rows and drop sets keep their own weight.
  - Nothing carries from a warm-up row or a drop set, which is why a lighter
    build-up set belongs in the warm-up row.
  - Nothing carries from a set under `WARM_SHARE` (80%) of the weight the next
    sets show either. That's a warm-up done in a normal row (2026-10-23: a
    14kg warm-up had dropped the working sets to 14). One or two jumps down
    still carry.
  - Only the rows on screen change.
- **Unconfirmed reps**: ticking a set with empty reps still fills the target (two
  taps per set stays), but a slot only gets `rt` once its reps are typed or
  stepped. Without it the row is flagged, and `finishChecks()` lists untyped sets
  and exercises identical to their last entry on the finish sheet.
- **Week balance** (`61-week`): working sets per muscle against the plan's
  weekly sets (every day once), not kg. Only plan days count from `cur`
  (`liveDays()`) — a previous plan's unfinished sets stay in `cur` indefinitely.
  Muscles come from `musclesFor(k, exId)`: `LIB[id].m` (1 for the main muscle,
  .5 for a helper), a custom exercise's `MUSCLE_DEFAULT[g]`, and for an `alt::`
  key the slot's exercise or the library exercise that lists it. Counts are
  fractional; show them with `fmtSets()` and names with `muscleName()`. The coarse
  `g` only sorts lists. Every tally goes through `addSets()`, so a new view
  should too. The same model feeds the plan editor's weekly block
  (`weekVolBlock`), the still-to-do strip (four muscles, then "+N more"),
  Progress, and its week-by-week bars (`muscleWeeks`).
- **Gym / home** (`57-place`): `PLACE` (`gt4_place`, in backups) is where today's
  session is and stays on whatever was picked last. Finishing stamps `at` on each
  history entry and `_at` on `prev`; no `at` means gym (everything before
  2026-10-08). `coach()` judges only the entries at `PLACE` when there are any
  (`coachOn` is the old body); with none it uses them all and, for dumbbell lifts,
  snaps the weight onto `rackAt(PLACE)`, the dumbbells logged there. `lastSrc()`
  skips a prev from the other place once this place has history. PBs, the
  check-in and Compare are still place-blind (Compare labels home sessions).
  For PBs that is deliberate: on 2026-10-14 Ross chose one record across both
  places, so don't make PBs place-aware.
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
- **Effort** (`59-effort`): Felt strong / Normal / Hard work / Tired or unwell
  (keys `easy`/`solid`/`hard`/`off`; relabelled 2026-10-26), kept per date in
  `efforts` (`gt4_effort`, `effort` in backups), not on history entries. Picking
  one on the finish sheet is required (Ross asked, 2026-10-26): `finishSave()`
  waits on `canSave(dId)`, a rating for that workout's `sessionDate`. The
  unsaved-workout card's Save opens the same sheet (`openSheet(dId)`, place row
  hidden). The summary sheet still lets him change it. `coach()` drops off-day entries before judging (unless that
  leaves none) and says so in `why`; the other ratings are only shown.
- **Days done this week**: read from `prev[dayId]._date` (stamped on finish), not
  history -- history entries don't record which day they came from. The tabs show
  "✓ Done Tue" and mark the not-done day finished longest ago as "Up next".
- **Compare** (`63-compare`): per lift, best entry in the span by `entryScore`
  vs the best in the span before (else the latest before it, else its first
  session). Early entries with no reps are skipped as baselines when a rep-logged
  one exists, and compared by top weight when not -- otherwise a weight-only
  entry scores as one rep and every gain looks huge.
- **Calendar** (`65-calendar`): Progress month grids from `allSessionDates()`,
  newest first, three months (six on "Show 6 months"). Filled dot gym, ringed home
  (`placeOf`); tapping a day shows its lifts, place, effort and note. Dates are UTC
  ISO days, like `today()` and history.
- **Milestones** (`69-milestones`): worked out from history on every call
  (`milestones()`), never stored, so sessions from before the feature earn them
  and an edited or deleted session moves them. Thresholds are the `MS_*` arrays.
  Dumbbell milestones go by `dumbbellKey()` (a 2kg default jump); bodyweight
  ratios need a reading (`bwNear()`, nearest date) and are skipped without one.
  The summary shows the ones the session's date reached (`milestonesOn()`).
- **Monthly review**: `monthReport(ym)` gives sessions against `WEEKTARGET`, PBs,
  the three biggest gains, lifts that didn't beat their best, bodyweight and
  milestones. `monthCard()` shows it on the workout screen in a new month until
  "Got it" (`monthSeen`, `gt4_monthseen`, UI state, not backed up). `render()`
  shows one card at a time: the monthly review comes before the weekly check-in.
  Two PB counters exist. `recentPBs()` (Progress list, Compare, PB milestones)
  counts heavier and more-reps PBs. `pbEvents()` (monthly review, by kind) also
  counts rep-range PBs, like `pbCheck()` does live. A month's count can therefore
  be higher than Compare's for the same weeks.
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
python3 build.py && node --test 'test/*.test.js'
```

No npm, nothing to install: `test/harness.js` evaluates the app's `<script>` in a
`vm` sandbox with a stub DOM (every element is a Proxy that swallows everything),
so the whole file boots and every top-level function/variable is reachable as
`app.name`, assignable via `set('name', value)`. Storage lands in `Store`'s
in-memory fallback, so each `load()` is a clean slate. Sandbox values have their
own prototypes — compare with `deq()` (JSON round-trip) not `assert.deepEqual`.
Coverage: migration, PB detection, volume/trend/1RM, the coach, the finish-session
flow, backup round-trip, presets, gym/home, effort, supersets, warm-ups, the chart
(ranges, metrics, since-you-started), muscles and the weekly views (week by week
too), history editing, the per-set CSV, the session note, the calendar, milestones,
the monthly review, unsaved workouts, the build, the server, the GitHub copy and the launcher. Add a
test whenever you touch any of those, and write it first when the change touches
stored history.

The suite doesn't render anything, so still serve and click through after a UI
change: log a set, swap an exercise, edit the plan, create a custom exercise,
finish a session, open Progress, export a backup, re-import it.

To see a UI change in the cloud dev container, install headless Chromium with
`pip install --break-system-packages playwright && python3 -m playwright install
chromium`. Serve `app/`, seed `localStorage` (`gt4_hist`, `gt4_theme`) with an
init script, open the sheet with `page.evaluate` (e.g. `openChart('dbbench')`),
and screenshot it at a 360px-wide viewport in both themes. Watch for console
errors.

## Docs
| File | What it is |
|---|---|
| `docs/BACKLOG.md` | Agreed work, in order. The source of truth for what's next. |
| `docs/MARKET-REVIEW.md` | October 2026 review of Hevy, Strong, Alpha Progression, Fitbod, Boostcamp, Liftosaur, RP Hypertrophy and JEFIT. The proposals Ross agreed are now in the backlog; the rest are background. |
| `docs/TRAINING-PLAN.md` | Programme history, progression rules, and what Ross has disliked. |
| `docs/full-body-plan.json` | Source of record for `FULL_BODY_PLAN()`. |
| `docs/ARCHITECTURE.md` | Data model, every storage key, migration. Keep the key table in step whenever a key is added. |
| `docs/ROADMAP.md` | The original September brief, now delivered. **Historical only:** its cache-first service worker and "stop after item 3" instructions are superseded by this file. |

## Product direction
Logging and progression coaching were already as good as the leading apps (see
`docs/MARKET-REVIEW.md`). The thinnest areas were **visualisation**, then **plan
design**. The plan agreed on 2026-10-14 to strengthen them is complete; each item
is recorded under "Done" in `docs/BACKLOG.md`. Its phases:

0. Tidy the docs. *Done 2026-10-14.*
1. **See your progress:** chart ranges spaced by date, a metric switch, and a
   then-vs-now line. *Done 2026-10-14.*
2. **Design plans with feedback:** weekly sets per muscle group in the editor,
   then finer muscle groups with secondary muscles. *Done 2026-10-14.*
3. **Fix the record:** per-set history editing, per-set CSV, and a session note.
   *Done 2026-10-14.*
4. **Motivation over months:** a training calendar, muscle-group sets over
   time, and milestones with a monthly report. *Done 2026-10-14.*

Copying backups off the phone (backlog F) followed the same day. Agree the next
piece of work with Ross before starting it; `docs/BACKLOG.md` lists the open
candidates.
