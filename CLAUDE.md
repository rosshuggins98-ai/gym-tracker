# Context for Claude Code

## What this is
A workout tracker used on an Android phone, served locally from Termux. Single HTML
file, vanilla JS, no framework, no build step. That constraint is deliberate.

## Who uses it
One user, a gym beginner training 3 days a week, logging on a phone mid-workout.
The app's job is to make logging fast and to make progress visible enough to keep
him turning up. Motivation is a feature, not decoration.

## Hard constraints
- **One file.** `app/gym-tracker.html` must stay self-contained and runnable by
  `python3 -m http.server`. No npm, no bundler, no runtime CDN.
- **Three storage modes.** Claude artifact storage, localStorage, and none (file://,
  falls back to mirroring state into the URL hash). Don't collapse this.
- **Migration is load-bearing.** Several older key formats are migrated on boot.
  Never remove `MIGRATE`, `pullLegacy`, or `pullLegacyWeights` without a replacement.
  `migrate()` also recovers pre-2026-09-10 `baseId::slug` swap keys onto today's
  `hkey()` scheme (see below) — keep that in step with `hkey()` if it changes again.
- **kg only.**
- **Custom exercise names are user input.** They're stripped of HTML-significant
  characters in `cleanName()` because the app renders with innerHTML throughout. If
  that ever changes, escape at render instead.

## File order
CSS → HTML shell → `LIB` (exercise library + form cues) → `DEFAULT_PLAN` → `MIGRATE`
→ storage adapter → state helpers → PB helpers → render → rest timer → progress
sheet → cues/swap/chart sheets → plan editor → export/import → boot.

## Key concepts
- **History key**: `hkey(exId, alt)`. Unswapped, it's `exerciseId`. Swapped, it
  resolves the alternate's *name* — case-insensitively — against every library
  entry's display name first: if it matches a real tracked exercise (e.g. Incline
  swapped to "Bench Press", or Pull Ups swapped to "Lat Pulldown"), the key is that
  exercise's own id, merging straight into its existing history. Only when the name
  matches nothing does it fall back to a global `alt::slug` key. That global key is
  shared by name alone, not by which slot it was swapped from — "Machine Chest
  Press" is the same machine whether it stood in for Bench, Incline or Push-ups
  (it's listed as an alt on all three), so its PB must be one number, not three.
  Never go back to prefixing alt keys with the base exercise id — that was the
  original bug (PBs on a shared alternate didn't "translate" between the
  exercises it was swapped in for).
- **PB**: heavier weight, *or* same weight for more reps. Both count.

## Testing
No suite yet. Minimum check after any edit:

```bash
node -e "const s=require('fs').readFileSync('app/gym-tracker.html','utf8');
new Function(s.match(/<script>([\s\S]*)<\/script>/)[1]); console.log('parses')"
```

Then serve and click through: log a set, swap an exercise, edit the plan, create a
custom exercise, finish a session, open Progress, export a backup, re-import it.

## Good next tasks
- Unit tests for migration and PB detection (highest value — they're the logic most
  likely to silently corrupt data)
- Service worker so the app works offline without the server running
- A POST endpoint in the server so finished sessions write to disk automatically,
  removing the reliance on manual backup exports
- Split into `src/` modules with a concat step that still emits one file
- Body-weight tracking, session summary screen, plate calculator
