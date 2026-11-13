# Branch Notes: docs/visual-anti-patterns

## 1. Discoveries & Deviations
- Add border restraint, content-led grid/flex hierarchy, and meaningful card grouping to frontend engineering and design-review skills. Preserve focus/control boundaries and comparable-item grids.
- Bump the package to 0.6.1 for the documentation update; retain the existing spacing and density guidance from main.
- Track delivery in #31. Independent audit: no actionable defects; `npm test`: 36/36; package dry-run: 0.6.1, 56 entries. No build or SonarCloud job is configured; no manual UI checks apply to this guidance-only change.

## 2. Blockers & Risks (4a)
- None.

## 3. Quick Wins (4b)
- Prevent substituting shadows/tinted panels for excessive outlines and introducing arbitrary asymmetry.

## 4. Deferred Items (4c)
- None. Installed copies update through the existing sync CLI; this release adds guidance, not automatic visual lint rules.
