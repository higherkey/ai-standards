import { collectManaged, readText } from './shared.js';
import { syncTarget } from '../sync.js';

const RULES_FILE = 'AGENTS.md';

export function composeRules({ core, adapter }) {
  return `${core}\n\n${adapter}\n`;
}

// Managed files for a source (working tree or a release tag). Pre-target releases shipped the plain core file.
function managed(src) {
  const result = collectManaged(src);
  const core = readText(src, 'AGENTS.md');
  const adapter = readText(src, 'targets/antigravity/adapter.md');
  if (core === null) return result;
  result.files.set(RULES_FILE, adapter === null ? src.read('AGENTS.md') : Buffer.from(composeRules({ core, adapter })));
  return { ...result, rules: RULES_FILE };
}

const target = {
  name: 'antigravity',
  describe: 'Google Antigravity: .agents/skills/ and .agents/AGENTS.md',
  rootDir: '.agents',
  managed,
  install: (ctx) => syncTarget(target, ctx)
};

export default target;
