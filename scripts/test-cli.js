import { spawnSync } from 'child_process';
import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';

const cli = path.resolve('bin/cli.js');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-standards-test-'));
let counter = 0;

const AGENT_FILES = ['rails-explorer', 'rails-auditor', 'rails-implementer', 'rails-profiler', 'rails-test-engineer'];

// Hermetic env: no CI, no npm lifecycle event unless a case sets it.
function baseEnv(extra = {}) {
  const env = { ...process.env };
  delete env.CI;
  delete env.npm_lifecycle_event;
  return { ...env, ...extra };
}

// stdio is piped, so the CLI never sees a TTY.
function run(args, { env = {} } = {}) {
  const result = spawnSync(process.execPath, [cli, ...args], { env: baseEnv(env), encoding: 'utf8', stdio: 'pipe' });
  return { status: result.status, out: `${result.stdout}${result.stderr}` };
}

function freshDir() {
  const dir = path.join(root, `p${++counter}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8');
const exists = (dir, rel) => fs.existsSync(path.join(dir, rel));

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test('--help documents flags and hygiene', () => {
  const { status, out } = run(['--help']);
  assert.strictEqual(status, 0);
  for (const s of ['ai-standards-sync --agent', '--force', '--yes', '--agent', '/.claude/skills/', 'Never exclude all of .claude/']) {
    assert.ok(out.includes(s), `help missing "${s}"`);
  }
});

test('antigravity initial sync writes layout, adapter, and manifest', () => {
  const dir = freshDir();
  const { status } = run(['--agent', 'antigravity', '--target', dir]);
  assert.strictEqual(status, 0);
  assert.ok(exists(dir, '.agents/skills/plan-review/SKILL.md'));
  assert.ok(read(dir, '.agents/AGENTS.md').includes('<!-- ai-standards:adapter:antigravity -->'));
  assert.ok(exists(dir, '.agents/.ai-standards-manifest.json'));
  assert.ok(!exists(dir, '.claude'), 'claude files must not be written');
});

test('antigravity AGENTS.md is init-once, --force overwrites', () => {
  const dir = freshDir();
  run(['-a', 'antigravity', '-t', dir]);
  const file = path.join(dir, '.agents/AGENTS.md');
  fs.writeFileSync(file, '# Local Override Content');

  const second = run(['-a', 'antigravity', '-t', dir]);
  assert.strictEqual(fs.readFileSync(file, 'utf8'), '# Local Override Content');
  assert.ok(second.out.includes('lacks the Antigravity adapter'), 'expected adapter hint');

  run(['-a', 'antigravity', '-t', dir, '--force']);
  assert.ok(read(dir, '.agents/AGENTS.md').includes('ai-standards:adapter:antigravity'));
});

test('claude sync writes skills, 5 agents, rules; rules refresh', () => {
  const dir = freshDir();
  assert.strictEqual(run(['--agent', 'claude', '--target', dir]).status, 0);
  assert.ok(exists(dir, '.claude/skills/plan-review/SKILL.md'));
  for (const a of AGENT_FILES) assert.ok(exists(dir, `.claude/agents/${a}.md`), `${a} missing`);
  const rules = read(dir, '.claude/rules/ai-standards.md');
  assert.ok(rules.startsWith('<!-- Managed by ai-standards-sync.'));
  assert.ok(rules.includes('Claude Code Adapter'));
  assert.ok(exists(dir, '.claude/.ai-standards-manifest.json'));
  assert.ok(!exists(dir, '.agents'), 'antigravity files must not be written');

  fs.writeFileSync(path.join(dir, '.claude/rules/ai-standards.md'), 'stale');
  run(['-a', 'claude', '-t', dir]);
  assert.ok(read(dir, '.claude/rules/ai-standards.md').includes('Claude Code Adapter'));
});

test('agent files have required frontmatter and read-only roles lack write tools', () => {
  const dir = freshDir();
  run(['-a', 'claude', '-t', dir]);
  for (const a of AGENT_FILES) {
    const text = read(dir, `.claude/agents/${a}.md`);
    for (const key of ['name', 'description', 'tools', 'model', 'effort']) {
      assert.ok(new RegExp(`^${key}: .+`, 'm').test(text), `${a} missing ${key}`);
    }
    assert.ok(/^description: .*Use when/m.test(text), `${a} description lacks "Use when"`);
  }
  for (const a of ['rails-explorer', 'rails-auditor']) {
    const tools = read(dir, `.claude/agents/${a}.md`).match(/^tools: (.+)$/m)[1];
    assert.ok(!/Edit|Write|Bash/.test(tools), `${a} must be read-only`);
  }
});

test('comma list syncs multiple targets', () => {
  const dir = freshDir();
  assert.strictEqual(run(['-a', 'claude,antigravity', '-t', dir]).status, 0);
  assert.ok(exists(dir, '.claude/skills') && exists(dir, '.agents/skills'));
});

test('"all" requires --yes when non-interactive', () => {
  const dir = freshDir();
  const denied = run(['-a', 'all', '-t', dir]);
  assert.strictEqual(denied.status, 1);
  assert.ok(denied.out.includes('--yes'));
  assert.ok(!exists(dir, '.claude') && !exists(dir, '.agents'));

  assert.strictEqual(run(['-a', 'all', '-y', '-t', dir]).status, 0);
  assert.ok(exists(dir, '.claude/skills') && exists(dir, '.agents/skills'));
});

test('no choice and no TTY exits 1 naming --agent', () => {
  const dir = freshDir();
  const { status, out } = run(['-t', dir]);
  assert.strictEqual(status, 1);
  assert.ok(out.includes('--agent'));
  assert.ok(!exists(dir, '.agents') && !exists(dir, '.claude'));
});

test('no choice under install hooks warns, exits 0, writes nothing', () => {
  for (const hook of ['preinstall', 'install', 'postinstall', 'prepare']) {
    const dir = freshDir();
    const { status, out } = run(['-t', dir], { env: { npm_lifecycle_event: hook } });
    assert.strictEqual(status, 0, hook);
    assert.ok(out.includes('Warning'), hook);
    assert.deepStrictEqual(fs.readdirSync(dir), [], hook);
  }
});

test('legacy fingerprint resolves to antigravity', () => {
  const dir = freshDir();
  fs.mkdirSync(path.join(dir, '.agents/skills/plan-review'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.agents/skills/plan-review/SKILL.md'), 'old');
  const { status, out } = run(['-t', dir]);
  assert.strictEqual(status, 0);
  assert.ok(out.includes('.ai-standards.json'), 'expected config hint');
  assert.ok(read(dir, '.agents/skills/plan-review/SKILL.md') !== 'old');
  assert.ok(!exists(dir, '.claude'));
});

test('a bare .agents/ dir is not a legacy fingerprint', () => {
  const dir = freshDir();
  fs.mkdirSync(path.join(dir, '.agents'));
  assert.strictEqual(run(['-t', dir]).status, 1);
});

test('.ai-standards.json is honored', () => {
  const dir = freshDir();
  fs.writeFileSync(path.join(dir, '.ai-standards.json'), JSON.stringify({ agents: ['claude'] }));
  assert.strictEqual(run(['-t', dir]).status, 0);
  assert.ok(exists(dir, '.claude/skills') && !exists(dir, '.agents'));
});

test('--agent overrides .ai-standards.json', () => {
  const dir = freshDir();
  fs.writeFileSync(path.join(dir, '.ai-standards.json'), JSON.stringify({ agents: ['claude'] }));
  run(['-a', 'antigravity', '-t', dir]);
  assert.ok(exists(dir, '.agents/skills') && !exists(dir, '.claude'));
});

test('manifest prunes removed managed skills and keeps user skills', () => {
  const dir = freshDir();
  run(['-a', 'claude', '-t', dir]);
  const manifestPath = path.join(dir, '.claude/.ai-standards-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  fs.mkdirSync(path.join(dir, '.claude/skills/retired-skill'));
  fs.writeFileSync(path.join(dir, '.claude/skills/retired-skill/SKILL.md'), 'x');
  fs.writeFileSync(path.join(dir, '.claude/agents/rails-retired.md'), 'x');
  fs.mkdirSync(path.join(dir, '.claude/skills/my-own-skill'));
  fs.writeFileSync(path.join(dir, '.claude/skills/my-own-skill/SKILL.md'), 'mine');
  fs.writeFileSync(path.join(dir, '.claude/agents/my-agent.md'), 'mine');
  manifest.skills.push('retired-skill');
  manifest.agents.push('rails-retired.md');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));

  run(['-a', 'claude', '-t', dir]);
  assert.ok(!exists(dir, '.claude/skills/retired-skill'), 'retired skill should be pruned');
  assert.ok(!exists(dir, '.claude/agents/rails-retired.md'), 'retired agent should be pruned');
  assert.strictEqual(read(dir, '.claude/skills/my-own-skill/SKILL.md'), 'mine');
  assert.strictEqual(read(dir, '.claude/agents/my-agent.md'), 'mine');
});

test('unknown agent is an error listing valid names', () => {
  const dir = freshDir();
  const { status, out } = run(['-a', 'cursorx', '-t', dir]);
  assert.strictEqual(status, 1);
  assert.ok(out.includes('antigravity') && out.includes('claude'));
  assert.ok(!exists(dir, '.agents') && !exists(dir, '.claude'));
});

test('write errors fail normally but are non-fatal under postinstall', () => {
  const dir = freshDir();
  const blocker = path.join(dir, 'blocking-file');
  fs.writeFileSync(blocker, 'file content');
  const invalid = path.join(blocker, 'cannot_be_directory');

  assert.strictEqual(run(['-a', 'antigravity', '-t', invalid]).status, 1);
  assert.strictEqual(run(['-a', 'antigravity', '-t', invalid], { env: { npm_lifecycle_event: 'postinstall' } }).status, 0);
});

let failed = 0;
console.log('Starting CLI tests...');
try {
  for (const [name, fn] of tests) {
    try {
      fn();
      console.log(`  PASS ${name}`);
    } catch (error) {
      failed++;
      console.error(`  FAIL ${name}: ${error.message}`);
    }
  }
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
console.log(`${tests.length - failed}/${tests.length} passed.`);
process.exit(failed ? 1 : 0);
