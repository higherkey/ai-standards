# Branch Notes: feat/global-install

Issue: #18 (stacked on feat/edit-aware-sync, #15)

## 1. Discoveries & Deviations
- Antigravity's user-wide layout (seen on this machine): `~/.gemini/config/rules/AGENTS.md` for rules and `~/.gemini/config/skills/` for skills, registered by `~/.gemini/config/skills.json` (`{"entries":[{"path":"skills"}]}`, has a BOM).
- Claude's user-wide layout: `~/.claude/skills/`, `~/.claude/agents/`, `~/.claude/rules/`. `CLAUDE.md` and settings are left alone.
- Global installs keep the logical file names (`AGENTS.md`, `rules/ai-standards.md`) and only map them to disk paths, so release hashes and merge bases still apply.

## 2. Blockers & Risks (4a)
- Whether Claude Code and Antigravity load the user-level rules folders needs a manual check in each tool.

## 3. Quick Wins (4b)

## 4. Deferred Items (4c)
- Real-data check (copies of the real `~/.gemini/config` and personal skills in a temp base): 22 old global skills matched release hashes and were updated; the personalized global `rules/AGENTS.md` conflicted against its inferred base, so it was kept and `rules/AGENTS.md.ai-standards-new` was written; `skills.json` stayed byte-identical.
