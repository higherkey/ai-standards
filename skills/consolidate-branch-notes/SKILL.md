---
name: consolidate-branch-notes
description: "Reconcile a branch's running notes document against the actual diff, resolve or prune stale items, and produce a PR-ready summary. Use when preparing to commit or open a PR on a prefixed branch with branch notes."
---

# Consolidate Branch Notes (`/consolidate-branch-notes`)

Run this before the pre-commit gate (`/peer-review-with-quality`) and before opening a PR (`/resolve-issue`). It turns a running notes file into an accurate, short record of what the branch actually did. See `/feature-tracking` for the document format and the 4a/4b/4c pipeline.

---

## 1. Find the Notes

- Get the current branch: `git branch --show-current`.
- Normalize it by replacing `/`, `_`, and spaces with `-`.
- Notes live at `docs/branch-notes/<normalized-branch>-notes.md`.
- If the file does not exist, report that and offer to create it from the `/feature-tracking` template. Unprefixed branches (`main`, `dev`) are exempt; stop.

---

## 2. Reconcile Against Reality

Determine the base branch (usually `main` or `dev`) and compare the notes with what changed:

```bash
git diff --name-only <base>...HEAD
git log --oneline <base>..HEAD
```

- Every file or area the notes claim was changed must appear in the diff. Remove or correct claims the diff does not support.
- Every significant changed file the notes never mention is a gap. Add a one-line bullet where it explains a discovery or deviation.
- Planned work that never landed is either a deviation (record why) or a deferred item (4c).

---

## 3. Triage 4a / 4b / 4c

- **4a Blockers:** mark each resolved item as resolved with a short outcome, or remove it if it no longer applies. Anything still open must be surfaced to the user now.
- **4b Quick Wins:** confirm each was actually folded into the diff. Mark done items; move undone items to 4c or finish them.
- **4c Deferred Items:** keep only items that are genuinely out of scope. List each as a GitHub issue candidate: a one-line title plus a suggested label and size.
- **Discoveries:** merge duplicates and drop bullets that restate the diff or are no longer true.

---

## 4. Edit Surgically

- Make targeted edits to the existing bullets. Never rewrite the whole document.
- Keep the four-section structure and the ultra-low-token style: short, high-signal bullets only.
- Do not stage or commit the notes file on your own; that happens at the normal commit gate.

---

## 5. Output a PR-Ready Summary

Return a compact block the PR description can reuse:

```markdown
### Branch Notes Summary
- Delivered: <1-3 bullets of what the branch does>
- Deviations: <bullets, or "none">
- 4a Blockers: <open items, or "none">
- 4b Quick wins included: <bullets, or "none">
- 4c Deferred (issue candidates): <title / label / size, or "none">
- Manual verification required: <steps not run autonomously, or "none">
```

Then ask the user whether to file the 4c candidates as GitHub issues (see `/create-github-issue`).

---

## Verification Checklist

- [ ] Notes file located at `docs/branch-notes/<normalized-branch>-notes.md`.
- [ ] Notes reconciled against `git diff --name-only <base>...HEAD` and the commit log.
- [ ] Resolved 4a/4b items marked; stale and duplicate bullets pruned.
- [ ] 4c items listed as issue candidates.
- [ ] Only targeted edits made; PR-ready summary produced.
