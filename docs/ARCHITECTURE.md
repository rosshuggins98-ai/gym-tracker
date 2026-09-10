# Architecture

## Data model

```js
PLAN = { name, startedISO, days: [ { id, name, tag, av, warm, items:[ {ex, sets, reps[]} ] } ] }
LIB  = { exerciseId: { n, g: group, alts: [...], c: [form cues], custom?: true } }
```

The plan references exercises by id. **All logged data is keyed by exercise id**, so
moving an exercise between days, reordering, removing, or re-adding preserves
history. This is the central design decision.

## Storage keys

| Key | Contents |
|---|---|
| `gt4_plan` | the editable plan |
| `gt4_cur` | in-progress session `{dayId: {exId: [{w,r,done,t?}]}}` -- `t` is the set type: undefined ('work'), 'warm', 'amrap', or 'drop' |
| `gt4_barweight` | plate calculator's bar weight, kg (default 20) |
| `gt4_notes` | `{historyKey: text}`, per-exercise persistent notes (machine settings, bench angle, grip width) |
| `gt4_prev` | last completed session, drives the "last" hint |
| `gt4_hist` | `{historyKey: [{date, top, reps, vol?}]}` -- `vol` (sets x reps x kg, working sets only) is present from 2026-09-11 onward; older entries lack it and count as 0 toward volume stats rather than being guessed at |
| `gt4_weektarget` | sessions/week target shown on the main screen (default 3) |
| `gt4_swaps` | `{exId: alternativeName}` |
| `gt4_custom` | user-created exercises |
| `gt4_legacylast` | weights recovered from older versions |
| `gt4_warm` | warmup ticked, per day per date |
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
- `innerHTML` throughout; safe because custom names are stripped at input
- Hand-rolled SVG chart, fine to ~20 points
- No offline support; the server must be running
