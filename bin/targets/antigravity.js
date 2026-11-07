import fs from 'fs';
import path from 'path';
import { readSource, syncManaged } from './shared.js';

const MARKER = '<!-- ai-standards:adapter:antigravity -->';

export default {
  name: 'antigravity',
  describe: 'Google Antigravity: .agents/skills/ and .agents/AGENTS.md',
  install({ sourceDir, targetDir, force, log }) {
    const root = path.join(targetDir, '.agents');
    const rulesPath = path.join(root, 'AGENTS.md');

    const { skillCount } = syncManaged({ sourceDir, root, rules: 'AGENTS.md' });
    log(`✅ [antigravity] ${skillCount} skills synchronized to .agents/skills/.`);

    const exists = fs.existsSync(rulesPath);
    if (!exists || force) {
      const content = `${readSource(sourceDir, 'AGENTS.md')}\n\n${readSource(sourceDir, 'targets', 'antigravity', 'adapter.md')}\n`;
      fs.writeFileSync(rulesPath, content);
      log(`${exists ? '🔄 Overwrote' : '✅ Initialized'} .agents/AGENTS.md from global template.`);
    } else if (!fs.readFileSync(rulesPath, 'utf8').includes(MARKER)) {
      log('ℹ️ Skipping .agents/AGENTS.md (local version exists). It lacks the Antigravity adapter section;');
      log('   run with --force to regenerate it (this discards local edits, so copy them out first).');
    } else {
      log('ℹ️ Skipping .agents/AGENTS.md (local version already exists. Use --force to overwrite).');
    }
  }
};
