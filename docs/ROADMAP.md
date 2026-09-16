# Brief: bring Gym Tracker up to the standard of the best commercial workout loggers

You have the `gym-tracker` repo. Read `CLAUDE.md`, `docs/ARCHITECTURE.md`, and
`app/gym-tracker.html` before changing anything. The hard constraints in `CLAUDE.md`
still hold: **one self-contained HTML file, no build step, no runtime CDN, kg only,
and existing user history must never be orphaned.**

## Who this is for

One user. A beginner, training 3 days a week, push/pull/legs, logging on an Android
phone mid-workout. He has real data in the app already — losing it would be worse
than shipping nothing. His stated goals, in his words: *"track my progress"*, *"help
motivate me to hit goals, lift more and regularly attend the gym"*, *"simply choose
alternative exercises during a workout"*, and *"modify my exercise plan"*.

## What the market leaders do well

Research across Hevy, Strong, Jefit, FitNotes and Setgraph reviews (2026) converges
on a consistent picture. Use it as the benchmark.

**The one thing that decides whether an app gets used:** logging speed. Reviewers
score apps on whether you can log *"between sets without losing your rest period to
tapping and scrolling"*, and the gold standard is **two taps per set**. Every feature
below is subordinate to this. If a change adds friction to logging, it is the wrong
change.

**Table stakes** — present in essentially every recommended app:
- Sets, reps, weight logged fast, with the previous session's numbers visible inline
- Rest timer, auto-starting on set completion
- Personal record tracking, surfaced at the moment it happens
- Exercise library with easy substitution when equipment is busy
- Custom exercise creation
- Templates/routines you can save and reuse
- Full editable workout history
- Progress charts per exercise
- CSV export and local backup

**What separates the best from the rest:**
- **Insight over storage.** The recurring criticism is apps that *"just store your
  history"* rather than telling you whether you're improving. Strong differentiator:
  the app should answer "am I getting stronger?" without the user doing arithmetic.
- **Plate calculator** — repeatedly called out as a quality-of-life win.
- **Set types**: warmup sets that don't count toward volume or PRs, plus AMRAP/failure
  sets, drop sets and supersets.
- **Per-exercise notes** that persist across sessions ("bench at 30°", "pin 4").
- **Muscle-group volume view** — Jefit's version flags under-trained areas before they
  derail progress; Hevy uses a body heatmap.
- **Offline-first with local data ownership.** Strive is praised specifically for
  local storage, offline operation, manual backups, and no account requirement.
- **Accountability loops.** Streaks, weekly targets, and (in Hevy's case) a social
  feed. Users describe seeing progress and consistency as the motivating factor.

**What to deliberately skip:** social feeds, nutrition/macro tracking, wearable
integration, AI-generated programming, accounts and cloud sync. Single user, no
server, no account — these add surface area without serving his goals.

## Work to do, in priority order

### 1. Logging speed — measure it, then fix it
Count the taps and keystrokes to log one set today. Target two taps for the common
case. Concretely:
- Pre-fill weight and reps from the same set last session, so a matched set is one
  tap on the tick and nothing else
- Add ± increment buttons (2.5kg / 1 rep) so adjustment never needs the keyboard
- Keep the numeric keyboard available for a direct entry, but never require it
Write the tap count before and after into the PR description.

### 2. Warmup sets and set types
Add a set type per row: **working** (default), **warmup**, **failure/AMRAP**, **drop**.
Warmup sets must be excluded from PB detection, top-set calculation, and volume totals.
This is currently wrong — a light warmup logged in the weight box can pollute history.

### 3. Plate calculator
Tap the weight field's unit label to show which plates to load per side, for the
barbell weight entered. Assume a 20kg Olympic bar, configurable, with standard kg
plates. Handle the case where the target isn't achievable and show the nearest.

### 4. Per-exercise persistent notes
A note field per exercise that survives sessions and shows on the card. Used for
machine settings, bench angles, grip width. Include it in backup and CSV export.

### 5. Progress that answers "am I improving?"
The Progress sheet exists but is thin. Add:
- **Trend per exercise**: up / flat / down over the last 4 sessions, stated plainly
- **Estimated 1RM** as a secondary line on charts (Epley: `w × (1 + reps/30)`), which
  makes progress visible even when the weight stays the same and reps climb
- **Weekly volume by muscle group**, using `LIB[].g`, flagging anything untrained in
  7+ days
- **Total volume moved** per session and per week (sets × reps × kg, working sets only)

### 6. Consistency loops
- Day streak and week streak, already partly built — surface them on the main screen,
  not just in Progress
- A weekly target (default 3) with a visible "2 of 3 this week" indicator
- A celebration state when a PB is hit: the current pill is too quiet for the single
  most motivating moment in the app

### 7. Routines and history editing
- Save the current plan as a named routine; keep several and switch between them
- Make past sessions editable and deletable — every reviewed app has this and ours
  has none. Mis-logged sets currently corrupt the chart permanently.

### 8. Offline-first
Add a service worker so the app loads and works with the Termux server stopped.
Cache-first for the shell, with the build stamp as the cache key. This removes the
biggest practical annoyance: needing the server running before you can even look at
your numbers.

## Non-negotiables

1. **Migrate, never orphan.** Any change to the data model must migrate existing
   `gt4_*` keys. Test by loading a backup exported from the current build.
2. **Test before claiming done.** Parse-check the file, then serve it and click
   through: log a set, swap an exercise, edit the plan, add a custom exercise, finish
   a session, open Progress, export a backup, re-import it.
3. **Write unit tests for the risky logic** — migration, PB detection, and volume
   calculation. These are the parts that can silently corrupt data.
4. **One file out.** If you split into `src/` modules, add a concat step that emits a
   single `app/gym-tracker.html`, and keep that file committed.
5. **Bump `BUILD`** on every change so the version is verifiable on the phone.

## How to work

Take the items in order. Each one is a separate commit with a short message saying
what changed and what you tested. Stop after item 3 and ask for feedback before
continuing — logging speed, set types and the plate calculator are the changes he'll
feel immediately, and it's worth confirming the feel is right before building on top.
