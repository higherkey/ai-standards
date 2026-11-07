# Branch Notes: feat/edit-aware-sync

Issue: #14

## 1. Discoveries & Deviations
- Board Game Hub test of v0.4.0: init-once `.agents/AGENTS.md` silently kept a stale copy without the adapter; `--force` was the only way out and discarded edits. Motivates this branch.
- Hashes are computed on LF-normalized content so `core.autocrlf` checkouts don't look edited.
- Legacy installs (no snapshot) are recognized via a shipped table of past-release hashes built from git tags.
- Keep-mine leaves the snapshot at the old base, so a later merge doesn't revert upstream changes.

- Delegation rule added to `AGENTS.md` and `subagent-delegate-on-rails`: targeted edits with known content and no tool orchestration use the fast tier at medium effort (haiku/medium on Claude).
- Optional decision tier (System One models such as d1, elephant, Jev) added to `subagent-delegate-on-rails` and `AGENTS.md`: used only when a decision-model capability is set up, advisory only, never secrets.
- Claude rules header reworded; `build-known-hashes.js` now keeps existing entries so older wordings stay recognized.
- Real v0.4.0 upgrade test: unedited files updated via known hashes; an edited legacy `.agents/AGENTS.md` had no base, so it got only a sidecar. Fix in progress: ship past rules-file contents as candidate merge bases.

## 2. Blockers & Risks (4a)
- 3-way merge needs `git` on PATH; without it, both-changed files take the conflict path.

## 3. Quick Wins (4b)

## 4. Deferred Items (4c)
