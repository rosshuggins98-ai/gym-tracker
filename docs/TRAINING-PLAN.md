# The training plan

## Background
Started from a trainer-written 2-day split where Day 1 was 44 working sets plus a
burnout circuit. That took over an hour to get 75% through — a volume problem, not a
fitness problem. Fifteen triceps sets alongside twelve chest pressing sets is well
past the point of diminishing returns.

## 2026-10-26: core work added, for rehab
Same plan as below, taken from Ross's phone on 2026-10-25 so his own edits are
kept: warm-up rows on lat pulldown, pushdown (A), leg curl, incline and leg
extension (B), none on A's bench, and 3 sets of lateral raises. Two things were
added, agreed with Ross on 2026-10-26:
- **Back Extension (bench)** first on A and C. It isn't on B, which already has
  RDLs. It's bodyweight for now, with weight added later.
- **Cable Crunch** first on B.
- Each is 2 × 12–15 with 60s rest, straight after the warm-up, stopping 2–3
  reps short of failure. The machine versions are on the swap button.
- Every day is now 20 working sets.

If his physio's numbers differ, theirs win.

**Legs, agreed 2026-10-26.** Ross asked about doing RDLs instead of leg press,
with leg extension covering the quads. He was advised against it: RDLs on two
days would load the lower back alongside the new back-extension work, and
leg extension alone trains only part of the quads. He chose to keep the plan
as it is: RDLs on B only, and Leg Press on A done lighter, at 8–10 reps with
about 2 reps in reserve, so it doesn't drain the rest of the session. No plan
change was needed.

## Current: Full Body Beginner, legs last (from 2026-10-15)
The same preset, `BEGINNER_PLAN()`, revised with Ross on 2026-10-15 after going
through his history (backup of 15 Oct). Names in brackets are what his gym swaps
show; at home the app picks dumbbell versions.

| Day | Exercises (sets × rep range, rest) |
|---|---|
| A | DB Bench 3×8–10 (2:00, warm-up row), Lat Pulldown 3×8–10 (1:45), DB Curl [Cable Curl] 3×8–12 (1:00), Pushdown 3×8–12 (1:00), Leg Curl 3×10–12 (1:30), Goblet Squat [Leg Press] 3×8–10 (2:00, warm-up row) |
| B | DB Incline 3×8–10 (2:00), Cable Row 3×8–10 (1:45), Lateral Raise 2×12–15 (1:00), Hammer Curl [Cable Curl] 3×8–12 (1:00), Leg Extension 3×10–12 (1:30), DB RDL [RDLs] 3×6–8 (2:00, warm-up row) |
| C | DB Bench 3×8–10 (2:00, warm-up row), Chest-Supported Row [Cable Row] 3×8–10 (1:45), DB Shoulder Press 3×8–10 (1:45), Pushdown 3×8–12 (1:00), Leg Extension 3×10–12 (1:30), Barbell Glute Bridge 3×10–12 (1:45, warm-up row) |

- **Why legs moved.** Leg press and deadlifts drained the rest of the session, so
  they were being skipped: no leg press logged since 30 Sep, and one RDL since
  27 Sep. Each session now has at most one heavy leg lift, and it is the last
  exercise, with a machine (leg curl or leg extension) just before it.
- **This is a trial** ("let's try it and see"). If the heavy lift keeps getting
  dropped at the end, the other option is to put it first and stop about 2 reps
  short of failure. Research gathered on 2026-10-15 supports either: stopping 1–2
  reps short grew legs as well as going to failure, with much less fatigue, and
  exercise order barely changes muscle growth.
- **How the heavy lifts are done.** Stop about 2 reps short of failure. Leg press
  is 8–10 reps (it had been taken to 12–15), RDL 6–8.
- **RDL, not deadlift.** That is Ross's preference.
- **Glute bridge** comes from his physio. It is a new library entry, `gbridge`
  (glutes 1, hamstrings .5), with the Dumbbell Glute Bridge at home. If the
  physio prescribes something different, theirs wins.
- **The same sets and reps for a lift wherever it appears** (bench, curls,
  pushdowns, leg extension), so the coach makes one call. A's 4th bench set was a
  leftover from logging a warm-up as a working set, so it is gone.
- **Volume.** 18 / 17 / 18 working sets. Weekly: quads 9, hamstrings 7.5,
  glutes 6, chest 9.
- **Still in force:** never three leg exercises in a session, no supersets, no
  face pulls.
- Ross is keeping three days a week. A two-day A/B plan was considered and
  dropped, partly because the data understated how often he trains: unfinished
  workouts never reached history (fixed the same day, see BACKLOG "Done").

## Previous: Full Body Beginner, first version (2026-09-23 to 2026-10-15)
Written because the barbell plan kept getting rebuilt on the gym floor: barbell
lifts feel uncomfortable at this stage, and dumbbell/machine work gets pushed much
harder. What matters most for a beginner's progress is turning up and working
hard, so the plan follows those preferences. In-app as `BEGINNER_PLAN()`.

| Day | Exercises (sets × target reps, rest) |
|---|---|
| A | Goblet Squat 3×10 (1:45), Dumbbell Bench 3×10 (2:00), Lat Pulldown 3×10 (1:45), Dumbbell RDL 3×10 (1:45), DB Curl 2×12 (1:00), Pushdown 2×12 (1:00) |
| B | Leg Press 3×12 (2:00), DB Incline 3×10 (2:00), Cable Row 3×10 (1:45), Leg Curl 3×12 (1:30), Lateral Raise 2×15 (1:00), Hammer Curl 2×12 (1:00) |
| C | Dumbbell Bench 3×10 (2:00), Chest-Supported Row 3×10 (1:45), Leg Extension 3×12 (1:30), Leg Curl 3×12 (1:30), DB Shoulder Press 3×10 (1:45), Pushdown 3×15 (1:00) |

- Every day has exactly two leg exercises — one quad-led, one hamstring-led — plus a
  push and a pull. 16–18 working sets, roughly 45–50 minutes. The big leg compounds
  (goblet squat, leg press) are on A and B; C's legs are the two machines.
- C is the session built on 2026-09-23 exactly as done (DB Bench, Chest-Supported Row,
  Leg Ext, Leg Curl, DB Shoulder Press, Pushdown — 18 sets in 44 min, rated "really
  good").
- Revised the same day on review of the first draft: no hip thrust or calf raise
  (the gym has no kit for them), no face pulls (disliked), no supersets (tried in the
  barbell plan, disliked), and never three leg exercises in one session (leg press + curl +
  extension on the first draft's C was too much leg for a full-body day).
- Dumbbell Bench and Dumbbell RDL got library entries for this. Both were swap
  alternates before; `migrate()` moves history logged under those swaps onto the new ids.

## Earlier: 3-day full body (A/B/C), 2026-09-16 to 2026-09-23
Source of record is `docs/full-body-plan.json`; the in-app preset `FULL_BODY_PLAN()`
is a transcription of it. Rotation is A, B, C, repeat. 15-17 working sets per session,
6-7 exercises, 55-70 minutes. Every big compound gets touched more than once a week,
which is the reason for the switch (see trade-offs below).

| Day | Exercises (sets × target reps, rest) |
|---|---|
| A | Squat 3×8 (2:30), Bench 3×8 (2:30), Lat Pulldown 3×10 (2:00), DB Shoulder Press 2×10 (1:45), RDL 2×10 (1:45), DB Fly 2×15 (1:15) |
| B | Deadlift 3×6 (3:00), DB Incline 3×10 (2:00), Cable Row 3×10 (2:00), Leg Press 2×12 (1:30), Lateral Raise 2×15 (1:00), DB Curl 2×12 (0:45), Pushdown 2×12 (0:45) |
| C | Front Squat 3×10 (2:15), Barbell OHP 3×8 (2:30), Chest-Supported Row 3×10 (2:00), Leg Curl 2×12 (1:30), DB Fly 2×12 (1:30), Calf Raise 3×15 (1:00) |

Decisions made transcribing the JSON into the app:
- Rep targets are the **top** of each range ("6-8" → 8). The app's rule is "all sets
  hit target → add weight", so the range's lower bound is simply where you land after
  a jump. Don't add weight until the top number is hit on every set.
- Pull-ups → Lat Pulldown and dips → DB Fly, because neither bodyweight movement is
  doable yet. When they are, swap in-app: "Assisted Pull Ups" is a listed alternate
  on Lat Pulldown and its history merges via `hkey()`.
- The curl/pushdown superset is a real superset in the app (`super: true` on the
  curl): curl set → straight into pushdown → 45s rest → repeat.
- Deadlift, Front Squat and Chest-Supported Row were added to the library for this
  plan. Chest-Supported Row was previously only a swap alternate on the row
  exercises; `migrate()` moves any history logged under that alternate onto the new
  id.
- The PPL plan is auto-saved as a routine on switching, so going back is one tap.

## Previous: 3-day push/pull/legs, reduced volume (2026-09-10 to 2026-09-16)
About 13 working sets per session, 5 exercises, each day opening with a 10-minute
warmup. Deliberately close to a standard beginner programme's volume, with the intent
of adding a set every couple of weeks as sessions start feeling easy.

| Day | Focus | Exercises |
|---|---|---|
| 1 | Push | Bench, Shoulder Press, DB Incline, Lateral Raise, Pushdown |
| 2 | Pull | Lat Pulldown, Barbell Row, Cable Row, Face Pull, Hammer Curl |
| 3 | Legs | Squat, RDL, Leg Press, Leg Curl, Calf Raise |

Face pulls and calf raises were added; the original programme covered neither.

A 4th, full-body day (Squat, Bench, Barbell Row, DB Shoulder Press, Hammer Curl) was
tried on 2026-09-10 and pulled back out shortly after. If it comes back, keep reusing
Days 1-3's exercise ids rather than introducing new lifts — history is keyed by
exercise, not by day (see ARCHITECTURE.md), so that gives the big compounds a second
touch each week instead of starting a disconnected set of numbers.

## Progression
Double progression over a rep range (e.g. 3 × 8–12), the "top set + floor" variant
agreed on 2026-10-07: stay at a weight until the **first** set at it reaches the top
of the range **and no set drops below the bottom**, then add one jump (2kg
dumbbells, 5kg pin stacks, 2.5kg elsewhere). Chosen over "every set at the top"
because the user's reps fall off across sets (13 → 10 → 5), so the strict rule
would hold him at each weight for weeks. Under the floor right after a jump is
expected; two sessions running under it means go back to the previous weight.
The app shows the call, and the reason for a "stay", on each exercise card.

The user trains at a gym (dumbbells in 2kg steps: 18, 20, 22, 24) and at home with
an adjustable set in 2kg steps offset by half a kilo (20.5, 22.5). Both log to the
same exercise; the jump is 2kg either way, so the suggested weight may be the home
or the gym version of the next dumbbell.

Warm-ups go in warm-up rows (**+ Warm-up** on the card) rather than as an extra
planned set, so they don't count against the sets the coach expects.

## Trade-offs consciously accepted
- PPL hits each muscle once a week; 3-day full-body hits each two to three times,
  which is generally better for a beginner. PPL was chosen first for focus and session
  clarity; full body replaced it on 2026-09-16 once logging was second nature.
- If a fourth day is added, PPL (or upper/lower) becomes a stronger fit again.
- Deadlift and front squat are new lifts with no history. Start light and let the
  first two weeks find the weight rather than guessing from squat/RDL numbers.
