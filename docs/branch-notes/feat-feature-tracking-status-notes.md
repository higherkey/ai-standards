# Branch Notes: feat/feature-tracking-status

> **Status:** in-review · **Next:** merge, release, re-sync · **Updated:** 2026-11-16

## 1. Discoveries & Deviations
- Prompted by a real "where does Project Logos stand?" question. Answering it took a sweep of four repos, and it turned up a v9 spec set that existed only as untracked files. The branch notes had no status field and there was no cross-repo index.
- Added a branch notes `Status` line and a §6 procedure: index, then live git/gh verification, then verdict first, with uncommitted work flagged first. The `docs/STATUS.md` template lives in `references/` to keep `SKILL.md` short (97 lines).

## 2. Blockers & Risks (4a)
- None.

## 3. Quick Wins (4b)
- Broadened the skill `description` so it also triggers on status questions, not only on prefixed branches.

## 4. Deferred Items (4c)
- `known-hashes.json` needs regenerating after the next release tag (the maintainer step in the README).
- Consider a reusable workflow that warns when a PR's branch notes have no `Status` line.
