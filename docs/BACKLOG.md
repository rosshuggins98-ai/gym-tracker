# Backlog

Ideas agreed with the user but not built yet. Pick from here at the start of a
session, and move an item to "Done" (with the commit) when it ships. The hard
constraints in `CLAUDE.md` still apply to everything below.

Most of this came out of a review of long-term tracking on 2026-09-23. Parts A and
B of that review are done (see the end of this file). What's left builds on them.

## What the data can support now

- History entries are `{date, top, reps, vol, sets}`. **`sets` only exists from
  2026-09-23 on.** Older entries have just the top set, so every feature here
  needs a fallback for them (`workSets(e)` in `58-coach.js` already does this).
- Only ticked sets are recorded, and warm-ups are kept but flagged `t:'warm'`.
- Bodyweight is logged per day (`bodyweight`, `80-bodyweight.js`).
- Muscle groups are coarse: `LIB[id].g` is one of Chest / Back / Shoulders / Arms /
  Legs (custom exercises can also use Other).

## C. The long view

- **Since-you-started comparison per exercise.** For example "Dumbbell Bench: 16kg × 10
  in Sept → 20kg × 13 now, +25%". Use the same score as `entryScore()` for the
  percentage, but show real sets, not estimated 1RMs. Chart sheet first, then a
  "Biggest gains" list in Progress. Weekly numbers are noisy; this is the view
  that motivates.
- **Monthly report.** Sessions attended vs target, PBs (all three kinds), biggest
  gains, exercises that stalled, bodyweight change. Could be a sheet opened
  from Progress, or shown automatically on the first session of a new month.
- **Milestones.** 10/25/50/100 sessions, first 20kg dumbbell, first time leg
  pressing your bodyweight, longest week streak. Cheap, and they motivate. Work
  them out from history rather than storing them, so they appear for past
  sessions too.
- **Relative strength.** Top set ÷ bodyweight on the nearest date for the main
  lifts. Bodyweight is already logged.

## D. Training balance

- **Hard sets per muscle per week.** Count ticked working sets (not warm-ups) per
  muscle group and compare against the usual 10–20 sets/week range. It replaces
  the kg-volume-per-group view in Progress, which mostly measures which machines
  are heavy. Needs `sets` (a fallback for older entries is the planned set
  count).
- **Finer muscle groups, with secondary muscles.** Quads, hamstrings, glutes,
  calves, chest, back, shoulders, biceps and triceps, with a weight per muscle
  on each library entry. For example, dumbbell bench = chest 1, triceps 0.5,
  front delts 0.5. This is a new field on `LIB` (keep `g` for the existing
  views), plus a default for custom exercises based on their group.
- Swap alternates stored under `alt::` keys have no group today, so
  `groupOf()` returns null and they're left out of per-group views. Let them
  inherit the group of the exercise they were swapped in for.

## E. Context on sessions

- **One-tap effort rating per session** (easy / solid / hard), asked on the
  summary sheet. Store it on the session and not on each exercise. It explains
  bad days, and the coach could use it (e.g. don't call a stall when the last
  sessions were rated hard because of fatigue).
- **Reps in reserve (RIR) on the last set** as an optional alternative. A more
  precise signal, but it's another tap per exercise, so only add it if the
  effort rating proves too coarse.
- **Short session note** ("slept badly", "gym packed") on the summary sheet,
  shown on the history rows for that date.

## F. Data safety

- **Copy backups off the phone automatically.** Today every backup lives on the
  phone (`serve.py` keeps the newest 20 in `gym-backups/`). Options: Termux
  writing to a synced folder (Drive/Syncthing), or `serve.py` committing and
  pushing to a private repo after each save. Losing the phone currently means
  losing everything.

## Loose ends from A and B

- **CSV export has no per-set data.** `csvText()` still writes one row per entry
  (the top set). Add a per-set CSV, or a `sets` column.
- **History editing only edits the top set.** In the chart sheet, `wireHistRows`
  changes `top`/`reps` but leaves `sets` unchanged, so the two can disagree.
  Either edit per set or rebuild top/reps from an edited set list.
- **"vs last time" in the session summary** still compares against `prev` (the
  last session on that day). It could compare set by set from history instead,
  which also works when the exercise was last done on a different day.
- **Coach, stall check:** it treats "no session in the last 3 beat the best
  before them" as a stall. Revisit once there's a few months of data: it may
  need a minimum time span, or to ignore sessions that come straight after a
  reset.
- **Default weight jumps** in `58-coach.js` (`INC_DB`, `INC_MACHINE`) are
  guesses about the user's gym. Worth checking with him which machines are pin
  stacks and what the steps are.

## Older ideas (moved from CLAUDE.md)

- **"Next up" on the main screen** for A/B/C rotation. The app has no notion of
  which day comes next; with full body it's whichever of A/B/C was finished
  longest ago (`prev[dayId]._date` already holds that), so it's a small addition.
- **Day editor:** add / rename / remove days. Presets are hard-wired to three days
  and three accent vars (`--a1..--a3`); a 4-day upper/lower would need both.
- **Swap to any library exercise**, not only the listed `alts`. The swap sheet is
  limited to the alt list, so Leg Press → Bulgarian means a plan edit, not a swap.
  (The "+ Add an exercise for today" picker covers some of this.)
- **A tiny browser smoke test.** The vm harness can't render; even a script that
  opens the file in headless Chromium and checks for console errors would catch
  what the stub DOM hides. No browser is installed in the dev container.
- **Header wraps at phone width.** "GYM TRACKER" breaks onto two lines and the
  build badge squashes (seen in a 2026-09-23 screenshot).

## Done

- 2026-09-23 `6d09517`: **A.** Only ticked sets count; ties at the top weight go
  to more reps; history keeps every ticked set.
- 2026-09-23 `de0c7ed`: **B.** Progression coach on each card (go up / stay /
  reset after a stall); weight jumps per exercise; rep records and rep-range
  PBs; estimated 1RM shown only for ≤10 reps.
