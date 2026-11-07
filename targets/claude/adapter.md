# Claude Code Adapter

- **Model tiers:** fast = haiku, standard = sonnet, deep = opus. Model and effort are separate settings.
- **Subagent archetypes:** run them through the Agent tool as the installed `rails-*` subagent types: `rails-explorer`, `rails-auditor`, `rails-implementer`, `rails-profiler`, `rails-test-engineer`. Each has a fixed tool set, plus a suggested model and effort in its frontmatter. Those are defaults: you are explicitly authorized to override either one on any dispatch through the Agent tool's `model` and `effort` parameters, as `subagent-delegate-on-rails` describes.
- **Asking the user:** use AskUserQuestion. **Planning:** use plan mode.
- **Background waits:** use `run_in_background` or Monitor instead of polling with repeated calls or sleeps.
- **Shell:** the shell may be Bash or PowerShell; fenced code says which. Use the Bash tool for POSIX snippets and the PowerShell tool for PowerShell snippets.
- **Local rules:** put project-specific rules in `CLAUDE.md`; this file is overwritten on every sync.
