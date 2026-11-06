# Branch Notes: feat/claude-target

Issue: #12

## 1. Discoveries & Deviations
- Claude Code auto-loads `.claude/skills/`, `.claude/agents/`, and `.claude/rules/*.md`; rules load alongside the user's `CLAUDE.md`, so the managed rules file never touches it.
- Skills stay a plain copy (no templating): capability language plus a fast/standard/deep tier table inside `subagent-delegate-on-rails`, refreshed on every sync.
- No default target: `--agent`, `.ai-standards.json`, legacy fingerprint, or interactive prompt. `all` needs confirmation.
- Implementation delegated to two Sonnet medium-effort subagents (CLI vs content, disjoint files); Opus reviewed.
- Review fix: the interactive prompt saved `.ai-standards.json` before the `all` confirmation; it now saves only after confirming.
- `all` inside `.ai-standards.json` is treated as standing consent (no confirmation on each sync).
- CI caught that the README's suggested global excludes file (`/docs/branch-notes/`) silently kept this notes file out of the commit. Resolution: keep the global excludes as the safety net for contributing repos. Owned repos re-include paths with `.gitignore` negations; this repo commits `!/docs/branch-notes/`. README and `--help` document the pattern.

## 2. Blockers & Risks (4a)
- Antigravity runtime can't be exercised here; skill edits and the `disable-model-invocation` key need a manual check there.
- `claude` CLI is not on PATH here, so loading the synced `.claude/` tree in Claude Code (and haiku honoring `effort: low`) is a manual check.

## 3. Quick Wins (4b)
- Done: `release-npm.yml` keeps only the tag trigger (it double-published).
- Done: manifest-based pruning of skills removed upstream.
- Done: `validate-branch-notes.yml` declares `contents: read`.

## 4. Deferred Items (4c)
- Overlap with Claude built-ins `/code-review`, `/security-review`, `/simplify`.
- Manual-only invocation for `resolve-issue` / `create-github-issue`.
- Path-scoped Claude rules for the CSS standards.
- Claude plugin packaging; enforcement hooks; user-level installs (`~/.claude`, `~/.gemini`).
- Codex and Cursor targets.
- `clean-branch-notes` pushes directly to a possibly protected base branch.
