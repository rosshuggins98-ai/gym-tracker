# Architecture

## Data model

```js
PLAN = { name, startedISO, days: [ { id, name, tag, av, warm, items:[ {ex, sets, reps[], rest?, super?} ] } ] }
LIB  = { exerciseId: { n, g: group, alts: [...], c: [form cues], custom?: true } }
```

The plan references exercises by id. **All logged data is keyed by exercise id**, so
moving an exercise between days, reordering, removing, or re-adding preserves
history. This is the central design decision.

`rest` is seconds between sets for that slot, used by the auto-starting rest timer;
absent means `REST_DEFAULT` (60s), which is what every plan saved before 2026-09-16
gets without migration. Two built-in presets exist, `DEFAULT_PLAN()` (push/pull/legs)
and `FULL_BODY_PLAN()` (3-day A/B/C, source of record `docs/full-body-plan.json`);
`loadPreset()` snapshots the outgoing plan into `gt4_routines` first unless an
identical one is already saved.

`super: true` pairs an item with the *next* item in the day as a superset
(`ssRole()`/`ssPartner()`): the cards render joined, no rest timer fires after the
first half (the bar points at the partner instead, `restCue()`), and the second
half's `rest` is the pair's rest (`restAfter()`). A chain of flags is one long round.

Two things are *not* keyed by exercise alone: `gt4_prev` and `gt4_cur` are keyed
`dayId -> exId`, and `gt4_swaps` is keyed by `exId` only, so an exercise that
appears on two days is swapped on both. The inline "last" hint (`lastSrc()`) covers
the prev gap: this day's prev, else the same exercise's prev on the most recently
finished other day, else the top set from history (weight only), else pre-v4
legacy weights. So a new preset shows real numbers from its first session.

## Storage keys

| Key | Contents |
|---|---|
| `gt4_plan` | the editable plan |
| `gt4_cur` | in-progress session `{dayId: {exId: [{w,r,done,t?}]}}` -- `t` is the set type: undefined ('work'), 'warm', 'amrap', or 'drop' |
| `gt4_barweight` | plate calculator's bar weight, kg (default 20) |
| `gt4_notes` | `{historyKey: text}`, per-exercise persistent notes (machine settings, bench angle, grip width) |
| `gt4_prev` | last completed session per day `{dayId: {exId: [{w,r,done,t?}], _date}}`, drives the "last" hint; `_date` (from 2026-09-16) ranks days when `lastSrc()` falls back to another day |
| `gt4_hist` | `{historyKey: [{date, top, reps, vol?}]}` -- `vol` (sets x reps x kg, working sets only) is present from 2026-09-11 onward; older entries lack it and count as 0 toward volume stats rather than being guessed at |
| `gt4_weektarget` | sessions/week target shown on the main screen (default 3) |
| `gt4_routines` | `[{id, label, savedISO, days}]`, named snapshots of `PLAN.days`, switchable from the plan editor |
| `gt4_swaps` | `{exId: alternativeName}` |
| `gt4_custom` | user-created exercises |
| `gt4_legacylast` | weights recovered from older versions |
| `gt4_warm` | warmup ticked, per day per date |
| `gt4_bodyweight` | `[{date, kg}]`, one reading per day, sorted; logged from Progress or the post-session summary; in backup and CSV (as an exercise row named "Body weight") |
| `gt4_start` | `{dayId: ms}`, when the first set of the in-progress session was ticked; only feeds the summary's minutes, cleared on finish |
| `gt4_autobackup` | `{date, file}` of the last successful POST to `/api/save` (see `serve.py`); shown in the Data panel |
| `gt4_active`, `gt4_theme` | UI state |

## Storage modes

`Store` picks one at boot:

1. `claude` — `window.storage` (Claude artifact)
2. `local` — `localStorage` (served over http://)
3. `none` — neither (file:// in Chrome); state mirrors into `location.hash` so a
   refresh survives, and a banner tells the user

## PB rules
A personal best is a heavier top set, **or** the same weight for more reps. `pbOf()`
returns `{w, reps, bestReps, sessions}`; `pbCheck()` compares the live session.

## History keys and swaps
`hkey(exId, alt)` decides where a set's history lives:
- No swap: the exercise's own id (`bench`).
- Swapped to a name that matches another library exercise's display name
  (case-insensitively): that exercise's own id — a "Bench Press" alternate on
  Incline day merges straight into Bench Press's own record, because it's the
  same lift.
- Swapped to anything else: a global `alt::slug` key, keyed by the alternate's
  name alone — not by which exercise it was swapped in for. "Machine Chest
  Press" is listed as an alt on Bench, Incline and Push-ups; all three produce
  the same key, so its PB is one number no matter which slot it stood in for.

`variantMap(exId)` returns `{key: displayName}` for an exercise and its
alternates, so a swap (or an empty variant) can still show a sibling's best as
a reference point.

## Migration
`MIGRATE` maps ids from every prior version to current library ids. `pullLegacy()`
reads old history blobs; `pullLegacyWeights()` recovers weights from sessions never
"finished". Both run only when `gt4_hist` is absent. `migrate()` additionally
recovers pre-2026-09-10 swap keys (`baseId::slug`, one per base exercise a name was
swapped into) onto the current `hkey()` scheme, by matching the slug back against
the base exercise's alt list and re-deriving the key — so history logged before
this change merges rather than going dark.

## Known rough edges
- No test coverage
- `innerHTML` throughout; safe because custom names/notes are stripped/escaped at
  input and render respectively
- Hand-rolled SVG chart, fine to ~20 points
- `app/sw.js` (see CLAUDE.md) caches the shell for offline use once loaded at least
  once over http://; it isn't build-stamp-aware, just stale-while-revalidate, so a
  brand new build still needs one successful online load to become the new cached
  version
- Set types cover warm-up/failure/drop; supersets (linking sets across two
  exercises) aren't implemented
