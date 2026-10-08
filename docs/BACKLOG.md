# Backlog

Ideas agreed with the user but not built yet. Pick from here at the start of a
session, and move an item to "Done" (with the commit) when it ships. The hard
constraints in `CLAUDE.md` still apply to everything below.

Most of this came out of a review of long-term tracking on 2026-09-23. Parts A and
B of that review are done (see the end of this file). What's left builds on them.

## Next up (agreed 2026-10-07, in this order)

From a review of the user's real backup (13 Aug – 4 Oct). The coach rework and
the weekly check-in from that review are done (see "Done").

1. ~~Gym / home tag per session~~ — done 2026-10-08 (see "Done"). Left over:
   PBs and the Compare view still mix the two places (Compare labels home
   sessions); a home dumbbell can still count as a weight PB.
2. ~~One-tap effort rating~~ — done 2026-10-08 (see "Done"), with a fourth
   option, Off day, which is the one the coach acts on.
3. ~~Since-you-started per exercise, then "Biggest gains" in Progress~~ — done
   2026-10-08 as Progress → "How you're doing" (see "Done"). Still open: the
   same then-vs-now line on the chart sheet.
4. **Milestones**, and a monthly report shown on the first session of a month —
   section C. The "4 weeks" span covers most of the report already.

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

- ~~Hard sets per muscle per week~~ — done 2026-10-07 against the plan's own
  weekly sets rather than a fixed 10–20 range (see "Done"). Still coarse groups.
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
  before them" as a stall. Since 2026-10-07 it ignores a window where the weight
  climbed by at least a jump (a reset under way). Revisit once there's a few
  months of data: it may still need a minimum time span.
- **Default weight jumps** in `58-coach.js`: confirmed 2026-10-07 that his gym's
  dumbbells go up 2kg and the home set 2kg from x.5. Pin-stack vs plate-loaded
  for each machine is still a guess.
- **Plan A still has 4 bench sets** because a warm-up used to be logged as an
  extra set. Once he uses the warm-up row, suggest dropping A's bench back to 3
  (the coach currently wants 4 working sets there, so A and C disagree).

## Older ideas (moved from CLAUDE.md)

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
- 2026-10-07 `86850a5`: **Coach rework.** Rep ranges (`it.lo`), "top set +
  floor" progression, ramp-up detection, a reason on every "stay", back-off after
  two sessions under the floor, no stall while climbing back; warm-up rows;
  weight steps by equipment; untyped-reps marker and finish-sheet checks
  (identical to last time); one-off clean-up of the 15/16 Sep duplicate.
- 2026-10-07 `3ba9554`: **Weekly view.** Sets per muscle group vs the plan,
  "Still to do this week" strip, Monday check-in card (sessions, balance,
  neglected lifts, resets, best lift), same in Progress.
- 2026-10-08: **Week status on the day tabs and "How you're doing".** Tabs show
  "✓ Done Tue" for days finished this week and "Up next" for the rotation
  (moved from "Older ideas"). Progress compares a span (week / 4 weeks / 3 months
  / all time) with the one before: sessions, kg lifted, PBs, bodyweight, and
  every lift's best set then vs now, biggest gain first, tap for its chart.
- 2026-10-08: **Gym / home.** "Training at" switch on the workout screen and the
  finish sheet, `at` on history entries, coach and prefills read the same place,
  first time at a place snaps to its known dumbbells, ringed home dots on the
  chart, and "Where you trained" in Progress to tag past sessions.
- 2026-10-08: **Effort rating.** Easy / Solid / Hard / Off day on the summary
  sheet, per date; off-day sessions are left out of the coach's judgement (no
  "drop back" or stall from a bad day). Shown on chart history rows and in
  "Where you trained". The session note (section E) is still to do.
- 2026-10-08: **Home kit.** At home each planned exercise that needs gym kit is
  swapped for a dumbbells-and-bench one (gym swap if it works at home, else a
  preferred stand-in, else the first workable alt); picks made at home stay
  home-only. New library entry: Dumbbell Leg Curl. Slots with no home option are
  flagged "needs gym kit". Prefills only come from a prev logged as the same
  exercise (`prev._keys`).
