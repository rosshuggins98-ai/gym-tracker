# The training plan

## Background
Started from a trainer-written 2-day split where Day 1 was 44 working sets plus a
burnout circuit. That took over an hour to get 75% through — a volume problem, not a
fitness problem. Fifteen triceps sets alongside twelve chest pressing sets is well
past the point of diminishing returns.

## Preset: Full Body Beginner — dumbbells & machines (added 2026-09-23)
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

## Current: 3-day full body (A/B/C), from 2026-09-16
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
Top-set weight is the tracked metric, with reps recorded alongside. When all sets hit
target reps with good form, add the smallest available jump — 2.5kg on barbell work,
1–2kg on isolation. The app suggests this on each chart and in Progress.

## Trade-offs consciously accepted
- PPL hits each muscle once a week; 3-day full-body hits each two to three times,
  which is generally better for a beginner. PPL was chosen first for focus and session
  clarity; full body replaced it on 2026-09-16 once logging was second nature.
- If a fourth day is added, PPL (or upper/lower) becomes a stronger fit again.
- Deadlift and front squat are new lifts with no history. Start light and let the
  first two weeks find the weight rather than guessing from squat/RDL numbers.
