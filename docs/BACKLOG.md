# Backlog

Ideas agreed with the user but not built yet. Pick from here at the start of a
session, and move an item to "Done" (with the commit) when it ships. The hard
constraints in `CLAUDE.md` still apply to everything below.

## Next up (agreed 2026-10-14, in this order)

From the market review (`docs/MARKET-REVIEW.md`), checked against the code.
Decided with Ross on 2026-10-14: **charts first**; **PBs stay one record across
gym and home**; **no 4th day planned**, so the day editor stays parked.

**All five phases are done (items 0–11), and so is F (backups to GitHub): see
"Done".** Nothing agreed is left here. The next piece of work needs agreeing with
Ross first. Open candidates: relative strength (section C), and the loose ends
below.

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
- Muscles: `musclesFor(k, exId)` gives `{muscle: 1|.5}` for any history key
  (nine muscles, helpers at half). `LIB[id].g` is still the coarse group for
  sorting lists.

## C. The long view

- ~~Since-you-started comparison per exercise~~: done 2026-10-08 in Progress as
  "How you're doing". The chart-sheet line is item 3.
- ~~Monthly report~~: done 2026-10-14 as item 11 (a card in a new month, and
  "Last month" in Progress).
- ~~Milestones~~: done 2026-10-14 as item 11, worked out from history, never
  stored.
- **Relative strength.** Top set ÷ bodyweight on the nearest date for the main
  lifts. Bodyweight is already logged. Not scheduled.

## D. Training balance

- ~~Hard sets per muscle per week~~: done 2026-10-07 against the plan's own
  weekly sets rather than a fixed 10–20 range (see "Done").
- ~~Finer muscle groups with secondary muscles, and `alt::` keys inheriting the
  slot's group~~: done 2026-10-14 as item 5 (see "Done").

## E. Context on sessions

- ~~One-tap effort rating~~: done 2026-10-08 (see "Done").
- **Reps in reserve (RIR) on the last set** as an optional alternative. A more
  precise signal, but it's another tap per exercise, so only add it if the
  effort rating proves too coarse.
- ~~Short session note~~: done 2026-10-14 as item 8 (see "Done").

## F. Data safety

- ~~Copy backups off the phone automatically~~: done 2026-10-14. Ross chose a
  private GitHub repo over a synced folder (see "Done"). He still has to do the
  one-off setup on the phone (README, "Backups to GitHub").

## Loose ends from A and B

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
  history, at 360px in both themes. Phases 3 and 4 also had a whole-app run (log a
  set, finish, open every sheet, export, wipe, restore, against `serve.py`). The
  scripts weren't committed.
- **Header wraps at phone width.** "GYM TRACKER" breaks onto two lines and the
  build badge squashes (seen in a 2026-09-23 screenshot). At a 360px width, the
  Data and theme buttons also sit past the right edge, making the page 440px
  wide (measured 2026-10-15; also on main).

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
  "Where you trained". The session note followed on 2026-10-14 (item 8).
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
- 2026-10-14 `7448285`: **Item 4, weekly sets in the plan editor.** Bars per
  muscle for the whole plan, redrawn on every edit, the edited day's share darker,
  a 10–20 sets guidance band behind.
- 2026-10-14 `8373985`: **Item 5, nine muscle groups.** `LIB[id].m` on every entry
  (helpers at .5), custom defaults by group, `alt::` keys inherit; the week
  balance, check-in, still-to-do strip (now capped at four plus "+N more"),
  Progress and the editor all count muscles. Balance rows line up.
- 2026-10-14 `2b3eadb`: **Item 6, edit past sets.** A session's top set on the chart
  sheet opens its sets: edit kg/reps, mark a warm-up, delete. Top/reps/vol are
  rebuilt by `entryFromSets()`, which finishing a session uses too; the last working
  set can't go; older sessions keep top-set editing (`67-histedit.js`).
- 2026-10-14 `ee21cf5`: **Item 7, per-set CSV.** "Export every set to spreadsheet"
  in the Data panel; the per-session CSV is unchanged.
- 2026-10-14 `59abf3a`: **Item 8, session note.** On the summary sheet, per date
  (`gt4_sessnote`, in backups), shown on chart rows and in "Where you trained".
  Escaped when shown rather than stripped like `cleanName()` (the plan's
  wording), so apostrophes survive.
- 2026-10-14 `aee3ff1`: **Item 9, training calendar.** Progress shows the last
  three months as month grids (filled dot gym, ringed home); tap a day for its
  lifts, place, effort and note; "Show 6 months" when there's older history.
- 2026-10-14 `977f36f`: **Item 10, sets per muscle week by week.** Up to 12 weeks
  of small bars per muscle under this week's balance, the plan's weekly sets as a
  dashed line, weeks that met it in green, this week live.
- 2026-10-14 `b5910d9`, `5a51d96`: **Item 11, milestones.** Sessions, week
  streaks, dumbbell weights, lifts against bodyweight, kg lifted and PB counts,
  worked out from history. In Progress (latest four, plus the three nearest with
  a bar) and on the summary when a session reaches one.
- 2026-10-14 `c745109`: **Item 11, monthly report.** "<Month> in review" on the
  workout screen once per new month (sessions vs target, PBs by kind, biggest
  gains, lifts that didn't beat their best, bodyweight, milestones), and "Last
  month" in Progress. Dismissal is UI state (`gt4_monthseen`), not backed up.
- 2026-10-14 `7f32e53`, `7a17048`: **F, backups to GitHub.** `serve.py --offsite`
  sends every dated backup to a private repo (contents API, stdlib only): on
  start, after each save, and every 5 minutes while one is waiting. It refuses
  a public repo and never shows the token. Setup is `~/gymtools/offsite-setup.sh`
  (launcher v5). Data shows the status, and the finish screen says "phone and
  GitHub ✓", or warns after 7 days without a copy. Checked end to end, including
  a restore from the copy that reached the repo.
- 2026-10-15 `5c75125`: **Plan revised with Ross: legs last.**
  - The Beginner preset now has at most one heavy leg lift per session, as the
    last exercise (leg press, RDL, glute bridge), with a machine just before it.
  - The glute bridge is a new library entry.
  - Lifts that appear on more than one day have the same sets and reps.
  - See TRAINING-PLAN.md.
- 2026-10-15 `b7151a5`: **Unsaved workouts.**
  - The problem: a workout closed without Finish was never saved, or was saved
    days later under the wrong date. The 15 Oct backup had three like that.
  - A workout is now dated by its first ticked set, and keeps the place and
    swaps it was trained with.
  - A workout still unsaved on a later day gets a card: "Save as <date>", or
    Discard with a second tap.
  - Two finishes on one date now keep both sets of sets.
- 2026-10-15: **Weight carries forward** (Ross asked).
  - Ticking a set gives the sets after it its weight.
  - A weight typed by hand, a warm-up row or a drop set keeps its own.
- 2026-10-15: **Start at the target** (Ross asked). Before a workout starts,
  every working set shows the coach's weight for the session ("Go 26kg"),
  not last time's.
- 2026-10-15: **Prefills after a plan switch.** Loading a preset or routine
  rebuilds the prefills nobody touched. Without this, the new plan's warm-up
  rows held the old plan's set 1, which would have been logged as a working
  set. Warm-up rows now prefill only from a past warm-up, or stay empty.
- 2026-10-23: **Warm-ups don't carry.** A ticked set under 80% of the weight
  the next sets show is a warm-up done in a normal row, so it no longer changes
  the working sets. Ross reported a 14kg warm-up dropping them to 14.
- 2026-10-26: **A second pushdown, and core exercises.**
  - "Tricep Pushdown (machine 2)" for the gym's other pulley machine. Swap to
    it on the days it's used, so its weights keep their own history.
  - Cable Crunch, Machine Crunch, Back Extension Machine and Back Extension
    (bench), in a new Core group (abs and lower back). They are gym only.
  - They aren't in a preset. Ross adds them himself once his physio gives the
    numbers.
  - Splitting the past pushdown sessions between the two machines was offered.
    It's not done, because the dates aren't known.
- 2026-10-26: **Core work in the plan.** The Beginner preset was rebuilt from
  Ross's plan as on his phone on 25 Oct, plus Back Extension first on A and C
  and Cable Crunch first on B (2 × 12–15). Every day is now 20 sets.
- 2026-10-26: **Coaching nudges** (ideas 1-4 from Ross's data):
  - Progress since the last weight jump, on the card and the chart page.
  - Two extra reps before a big default machine jump.
  - A note on the rest bar when set 1 runs 2+ reps past the target, and 30s
    more rest when reps drop by 3 or more.
  - A suggested warm-up weight (about 55% of the target) where there's no
    past warm-up.
- Agreed next, 2026-10-26:
  - (5) Make the effort rating more prominent, with "Off day" covering being
    tired or unwell.
  - (6) Let the swap sheet take a name you type, for grips, attachments, straps
    and second machines.
  - Strength standards: Strength Level's terms forbid copying its standards.
    A link out per lift, or the app's own ranking, was offered and is awaiting
    Ross's answer.
