# The training plan

## Background
Started from a trainer-written 2-day split where Day 1 was 44 working sets plus a
burnout circuit. That took over an hour to get 75% through — a volume problem, not a
fitness problem. Fifteen triceps sets alongside twelve chest pressing sets is well
past the point of diminishing returns.

## Current: 3-day push/pull/legs + a 4th full-body day, reduced volume
About 12-13 working sets per session, 5 exercises, each day opening with a 10-minute
warmup. Deliberately close to a standard beginner programme's volume, with the intent
of adding a set every couple of weeks as sessions start feeling easy.

| Day | Focus | Exercises |
|---|---|---|
| 1 | Push | Bench, Shoulder Press, DB Incline, Lateral Raise, Pushdown |
| 2 | Pull | Lat Pulldown, Barbell Row, Cable Row, Face Pull, Hammer Curl |
| 3 | Legs | Squat, RDL, Leg Press, Leg Curl, Calf Raise |
| 4 | Full Body | Squat, Bench, Barbell Row, DB Shoulder Press, Hammer Curl |

Face pulls and calf raises were added; the original programme covered neither.

Day 4 deliberately reuses the same exercise ids as Days 1-3 rather than introducing
new lifts — since history is keyed by exercise, not by day (see ARCHITECTURE.md),
this just gives the big compound lifts a second touch each week instead of starting
a disconnected set of numbers. Lighter than Days 1-3 (2-3 sets per lift instead of
2-3 at higher rep targets) since it's stacked on top of an already-3x/week schedule.

## Progression
Top-set weight is the tracked metric, with reps recorded alongside. When all sets hit
target reps with good form, add the smallest available jump — 2.5kg on barbell work,
1–2kg on isolation. The app suggests this on each chart and in Progress.

## Trade-offs consciously accepted
- PPL hits each muscle once a week; a pure 3-day full-body split would hit each three
  times, which is generally better for a beginner. PPL was chosen for focus and
  session clarity, with Day 4 added later as a lighter full-body top-up rather than
  restructuring the whole programme — it adds frequency on the big lifts without
  giving up the focused per-muscle days.
