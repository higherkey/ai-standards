import { collectManaged, readText } from './shared.js';
import { syncTarget } from '../sync.js';

// known-hashes.json keeps the hashes of earlier header wordings, so this text may change.
const HEADER = '<!-- Managed by ai-standards-sync. Local edits are detected and merged on sync, but project-specific rules belong in CLAUDE.md. -->';
const RULES_FILE = 'rules/ai-standards.md';

// Header shipped by releases up to v0.4.0; used when composing those releases' rules for known hashes/bases.
const LEGACY_HEADER = '<!-- Managed by ai-standards-sync. Do not edit; it is overwritten on every sync. Put project-specific rules in CLAUDE.md. -->';

function headerFor(src) {
  const pkg = readText(src, 'package.json');
  const version = pkg ? JSON.parse(pkg).version : '';
  const [major, minor] = version.split('.').map(Number);
  return major === 0 && minor <= 4 ? LEGACY_HEADER : HEADER;
}

export function composeRules({ core, adapter, header = HEADER }) {
  return [header, core, adapter].join('\n\n') + '\n';
}

// Managed files for a source (working tree or a release tag); null when the source predates this target.
function managed(src) {
  const core = readText(src, 'AGENTS.md');
  const adapter = readText(src, 'targets/claude/adapter.md');
  if (core === null || adapter === null) return null;
  const result = collectManaged(src, { agentsDir: 'targets/claude/agents' });
  result.files.set(RULES_FILE, Buffer.from(composeRules({ core, adapter, header: headerFor(src) })));
  return { ...result, rules: RULES_FILE };
}

const identity = (rel) => rel;

const target = {
  name: 'claude',
  describe: 'Claude Code: .claude/skills/, .claude/agents/rails-*.md, .claude/rules/ai-standards.md',
  // Global (~/.claude/): skills, rails-*.md agents, rules/ai-standards.md. Never CLAUDE.md or settings.json.
  layouts: {
    project: { rootDir: '.claude', diskPath: identity },
    global: { rootDir: '.claude', diskPath: identity }
  },
  managed,
  install: (ctx) => syncTarget(target, ctx)
};

export default target;
