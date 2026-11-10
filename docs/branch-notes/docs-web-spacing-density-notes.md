# Branch Notes: docs/web-spacing-density

> Base: `main` · Delivery: PR into `main`

## 1. Discoveries & Deviations
- The web skills only said "use spacing tokens" and never said how much space is too much.
- Survey (Haiku explorer):
  - allweather's empty state uses `py-16 sm:py-24`.
  - brush-buddies and allweather use `100vh`/`100dvh`.
  - Board Game Hub uses `letter-spacing` 0.12–0.15em on UI text, and its token scale jumps from `1.5rem` to `2.5rem`.
  - Kipu uses several `2.5rem` paddings.
- Few values are extreme on their own; the real problem is spacing that adds up through nested containers, which a grep can't see. So the standard adds a rendered check.
- Added `frontend-ui-engineering-slim` §3 Spacing & Density: inside < between, budgets per context, a scale with fine steps, line height and letter spacing, six anti-patterns, and a first-screen test. Updated the checklist, the description, `design-review` §3, the `plan-review` row, and the README.
- Added `scripts/density-check.mjs`. It uses the project's own Playwright and flags first-screen coverage under 25%, empty bands over 25% of the screen height, a missing heading or action, nested insets that leave text under 75% of the mobile width, and full-screen `min-height` blocks.
- Calibration: the synthetic over-spaced page flags at every check, and the dense control page and the 815 Design and brush-buddies homepages pass.
  - The first threshold (50% coverage) flagged the dense control page.
  - A block-width text metric misfired on hidden dialogs and on deliberate `max-width` limits, so it was replaced with a stacked-inset sum.
- Decision models (d1 and elephant): coverage of the survey findings started at 4 of 7; after edits all 7 score ≥ 0.77.
- A Sonnet auditor found 19 issues in the script. The main ones: navigation failures that exited 0 or 1, Chromium launch outside the error handling, unvalidated viewports, fixed bars counted as content, `margin: 0 auto` counted as stacked inset, `display: contents` wrappers excluded, and thresholds compared after rounding. All are fixed. Re-verified the synthetic pages and two real homepages, plus empty, fixed-bar, centered, and `display: contents` test pages, connection refused (exit 2), bad viewports (exit 2), and that `--json` output parses.

## 2. Blockers & Risks (4a)
- None.

## 3. Quick Wins (4b)
- The `plan-review` row and the README entry now mention spacing budgets.

## 4. Deferred Items (4c)
- Board Game Hub token scale: add a step between `1.5rem` and `2.5rem`. Tracking on mixed-case home and play text should be reviewed.
- allweather: shrink the `EmptyState` padding (`py-16 sm:py-24`).
- `e1f-web-design` (installed separately) snaps spacing to a grid up to `4rem`, but has no density guidance. Align it with §3.
- Regenerate `known-hashes.json` after the next release tag.
