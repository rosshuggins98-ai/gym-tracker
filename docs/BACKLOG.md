# Backlog

Ideas agreed with the user but not built yet. Pick from here at the start of a
session, and move an item to "Done" (with the commit) when it ships. The hard
constraints in `CLAUDE.md` still apply to everything below.

## Next up (agreed 2026-10-14, in this order)

From the market review (`docs/MARKET-REVIEW.md`), checked against the code.
Decided with Ross on 2026-10-14: **charts first**; **PBs stay one record across
gym and home**; **no 4th day planned**, so the day editor stays parked.

Phases 1, 2 and 4 are UI only and don't change stored data. Phase 3 changes
stored history, so write its tests first.

Phase 0 (docs) and Phase 1 (items 1–3, the chart sheet) are done: see "Done".
**Next is Phase 2, item 4.**

### Phase 2: design plans with feedback

4. **Weekly sets per muscle group in the plan editor.** `70-editor.js`. Under the
   per-session `volNote`, add bars in the `balanceRows()` style from
   `plannedByGroup()` (the whole plan, every day once), redrawn on every edit. This
   is guidance only, with no enforced target. A reference band (~10–20 sets per
   group per week, as Fitbod uses) may be shown as guidance.
   Done when: changing sets on one day updates the weekly numbers at once.
5. **Finer muscle groups, with secondary muscles** (from section D). `10-lib.js`:
   add `m` to every `LIB` entry, e.g. dumbbell bench `{chest:1, triceps:.5,
   shoulders:.5}`. Groups: chest, back, shoulders, biceps, triceps, quads,
   hamstrings, glutes, calves. Keep `g` for coarse views. Custom exercises
   (`gt4_custom`) get a default `m` from their `g` when read, so no stored data
   changes. Swap alternates under `alt::` keys take the slot's exercise, as
   `groupFor()` already does for `g`. Then move week balance, the check-in, the
   still-to-do strip and item 4 to fine groups, counting secondary muscles as
   fractional sets (rounded for display).
   Tests: every `LIB` entry has `m` with one primary at 1; the custom default;
   fractional sums. On each day of `BEGINNER_PLAN()`, built on the rule of one
   quad-led and one hamstring-led lift per day (`docs/TRAINING-PLAN.md`), both
   quads and hamstrings come out above 0.
   Risk: numbers change on several screens at once, so check the check-in card and
   the strip by eye.

### Phase 3: fix the record (changes stored history: tests first)

6. **Edit individual past sets** (was the loose end "History editing only edits
   the top set"). On the chart sheet, a history row expands to its `sets`, where a
   set's kg and reps can be edited, the set deleted, or toggled as a warm-up. Add
   one pure function, `entryFromSets(sets)` → `{top, reps, vol}`, working sets
   only, ties going to more reps (the same rules as `topWithReps()` and
   `exVolume()`). Use it in both the editor and `doNewSession()`, so the two can't
   drift. Entries without `sets` (before 2026-09-23) keep today's top/reps
   editing. Deleting the last set deletes the entry.
   Tests: for the same sets, the rebuilt entry matches what `doNewSession()`
   writes; warm-ups are excluded; old entries are untouched; backup round-trip.
7. **Per-set CSV** (was the loose end "CSV export has no per-set data"). Add a
   second export, "CSV, every set": one row per set with date, exercise, set number,
   kg, reps, type and place. Leave the current CSV unchanged. Entries without
   `sets` export their top set as one row.
   Test: row count equals sets logged, plus one per old entry.
8. **Session note** (from section E). A text box on the summary sheet beside the
   effort rating, one note per date, stored in `gt4_sessnote` as `{date: text}`.
   Cap it at ~140 characters and strip it like `cleanName()`, because it renders
   through innerHTML. Show it on chart history rows and in "Where you trained".
   Add it to `backup()`/`applyImport()` and the ARCHITECTURE key table, with a
   round-trip test. Re-run `autoBackup()` after an edit, as the effort rating does.

### Phase 4: motivation over months

9. **Training calendar.** Progress sheet: the last 3–6 months as month grids from
   `allSessionDates()`, one dot per session day, ringed for home (`placeOf`). Tap
   a day to list what was trained.
10. **Muscle-group sets over time.** Build after item 5. Weekly working sets per
    group for the last 12 weeks, via `setsByGroup()` week by week, as small bars
    with the plan's weekly number as a reference line.
11. **Milestones and a monthly report** (section C; this was "Next up" item 4 on
    2026-10-07). As described in section C.

### Decided or parked on 2026-10-14

- **PBs stay one record across gym and home.** This is Ross's call, so don't make
  them place-aware. Compare still labels home sessions.
- **Day editor:** parked, as no 4th day is planned (see "Older ideas").
- **Swap to any library exercise:** parked (see "Older ideas").
- **Suggested warm-up weights:** parked. Warm-up rows already prefill from last
  session's warm-up rows (`slot()` via `lastW`/`lastR`), so this would only help
  right after a weight jump.
- **Deload week, a progression rule per exercise:** later, if ever. See the
  market review.

## What the data can support now

- History entries are `{date, top, reps, vol, sets}`. **`sets` only exists from
  2026-09-23 on.** Older entries have just the top set, so every feature here
  needs a fallback for them (`workSets(e)` in `58-coach.js` already does this).
- Only ticked sets are recorded, and warm-ups are kept but flagged `t:'warm'`.
- Bodyweight is logged per day (`bodyweight`, `80-bodyweight.js`).
- Muscle groups are coarse: `LIB[id].g` is one of Chest / Back / Shoulders / Arms /
  Legs (custom exercises can also use Other). Item 5 adds finer ones.

## C. The long view

- ~~Since-you-started comparison per exercise~~: done 2026-10-08 in Progress as
  "How you're doing". The chart-sheet line is item 3.
- **Monthly report** (item 11). Sessions attended vs target, PBs (all three
  kinds), biggest gains, exercises that stalled, bodyweight change. Could be a
  sheet opened from Progress, or shown automatically on the first session of a new
  month. The "4 weeks" span in Compare covers most of it already.
- **Milestones** (item 11). 10/25/50/100 sessions, first 20kg dumbbell, first time
  leg pressing your bodyweight, longest week streak. Cheap, and they motivate.
  Work them out from history rather than storing them, so they appear for past
  sessions too.
- **Relative strength.** Top set ÷ bodyweight on the nearest date for the main
  lifts. Bodyweight is already logged. Not scheduled.

## D. Training balance

- ~~Hard sets per muscle per week~~: done 2026-10-07 against the plan's own
  weekly sets rather than a fixed 10–20 range (see "Done").
- Finer muscle groups with secondary muscles, and `alt::` keys inheriting the
  slot's group: now item 5.

## E. Context on sessions

- ~~One-tap effort rating~~: done 2026-10-08 (see "Done").
- **Reps in reserve (RIR) on the last set** as an optional alternative. A more
  precise signal, but it's another tap per exercise, so only add it if the
  effort rating proves too coarse.
- Short session note: now item 8.

## F. Data safety

- **Copy backups off the phone automatically.** Today every backup lives on the
  phone (`serve.py` keeps the newest 20 in `gym-backups/`). Options: Termux
  writing to a synced folder (Drive/Syncthing), or `serve.py` committing and
  pushing to a private repo after each save. Losing the phone currently means
  losing everything. Not yet scheduled; raised with Ross on 2026-10-14.

## Loose ends from A and B

- Per-set CSV: now item 7.
- Per-set history editing: now item 6.
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

- **Day editor** (parked 2026-10-14): add / rename / remove days. Presets are
  hard-wired to three days and three accent vars (`--a1..--a3`); a 4-day
  upper/lower would need both.
- **Swap to any library exercise** (parked 2026-10-14), not only the listed
  `alts`. The swap sheet is limited to the alt list, so Leg Press → Bulgarian
  means a plan edit, not a swap. (The "+ Add an exercise for today" picker covers
  some of this.)
- **A tiny browser smoke test.** The vm harness can't render; even a script that
  opens the file in headless Chromium and checks for console errors would catch
  what the stub DOM hides. Headless Chromium does install in the cloud dev
  container (`pip install --break-system-packages playwright && python3 -m
  playwright install chromium`); Phase 1 was checked that way, with a seeded
  history, at 360px in both themes. The script wasn't committed.
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
  "Where you trained". The session note is now item 8.
- 2026-10-08: **Home kit.** At home each planned exercise that needs gym kit is
  swapped for a dumbbells-and-bench one (gym swap if it works at home, else a
  preferred stand-in, else the first workable alt); picks made at home stay
  home-only. New library entry: Dumbbell Leg Curl. Slots with no home option are
  flagged "needs gym kit". Prefills only come from a prev logged as the same
  exercise (`prev._keys`).
- 2026-10-14 `a345631`: **Phase 0.** ARCHITECTURE key table complete (incs,
  place, effort, homeswaps), three presets, rough edges current; README test
  command for Node 22+.
- 2026-10-14 `34d13ad`: **Item 1, chart ranges.** 4 weeks / 3 months / All time
  chips; points placed by date, so breaks show; smaller dots past 30 points; one
  label per tied best (they used to stack). Compare's mini chart and the
  bodyweight chart are date-spaced too.
- 2026-10-14 `1db7d72`: **Item 2, metric switch.** Top set / Est. 1RM / Volume /
  Reps; sessions a metric can't show honestly are left off with a note; bodyweight
  lifts chart reps; tiles are best, latest and change; the dashed 1RM line is gone.
- 2026-10-14 `b9f2db2`: **Item 3, since you started.** Compare's "All time" row
  for the lift, shown above its chart (`liftThenNow()` shared by both).
