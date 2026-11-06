import fs from 'fs';
import path from 'path';
import { readSource, syncManaged } from './shared.js';

const HEADER = '<!-- Managed by ai-standards-sync. Do not edit; it is overwritten on every sync. Put project-specific rules in CLAUDE.md. -->';
const RULES_FILE = 'rules/ai-standards.md';

export default {
  name: 'claude',
  describe: 'Claude Code: .claude/skills/, .claude/agents/rails-*.md, .claude/rules/ai-standards.md',
  install({ sourceDir, targetDir, log }) {
    const root = path.join(targetDir, '.claude');

    const { skillCount, agentCount } = syncManaged({
      sourceDir,
      root,
      agentsSrc: path.join(sourceDir, 'targets', 'claude', 'agents'),
      rules: RULES_FILE
    });
    log(`✅ [claude] ${skillCount} skills and ${agentCount} subagents synchronized to .claude/.`);

    // Rules are always refreshed: local rules belong in CLAUDE.md, which Claude loads alongside.
    const content = [HEADER, readSource(sourceDir, 'AGENTS.md'), readSource(sourceDir, 'targets', 'claude', 'adapter.md')].join('\n\n') + '\n';
    fs.mkdirSync(path.join(root, 'rules'), { recursive: true });
    fs.writeFileSync(path.join(root, RULES_FILE), content);
    log('✅ [claude] Refreshed .claude/rules/ai-standards.md.');
  }
};
