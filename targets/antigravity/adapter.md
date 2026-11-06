<!-- ai-standards:adapter:antigravity -->
# Antigravity Adapter

- **Skills location:** installed skills live in `~/.gemini/config/skills/` (global) and `.agents/skills/` (project).
- **Model tiers:** fast = `flash_lite`, standard = `flash`, deep = `pro`.
- **Subagents:** dispatch archetypes with `invoke_subagent`; ask the user with `ask_question`; make targeted edits with `replace_file_content`.
- **Shell:** Windows PowerShell 5.1 does not support `&&`; chain commands with `;`.
