import { spawnSync } from 'child_process';
import assert from 'assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath, pathToFileURL } from 'url';

const repoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cli = path.join(repoDir, 'bin/cli.js');
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
function run(args, { env = {}, cliPath = cli } = {}) {
  const result = spawnSync(process.execPath, [cliPath, ...args], { env: baseEnv(env), encoding: 'utf8', stdio: 'pipe' });
  return { status: result.status, out: `${result.stdout}${result.stderr}` };
}

function freshDir() {
  const dir = path.join(root, `p${++counter}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const read = (dir, rel) => fs.readFileSync(path.join(dir, rel), 'utf8');
const exists = (dir, rel) => fs.existsSync(path.join(dir, rel));

const sha = (text) => crypto.createHash('sha256').update(text).digest('hex');
const SKILL = 'skills/plan-review/SKILL.md';

// A throwaway copy of the package, so a test can play "older/newer release" without mocking.
function packageCopy(mutate = () => {}) {
  const pkg = freshDir();
  for (const item of ['bin', 'skills', 'targets', 'AGENTS.md', 'package.json']) {
    fs.cpSync(path.join(repoDir, item), path.join(pkg, item), { recursive: true });
  }
  fs.writeFileSync(path.join(pkg, 'known-hashes.json'), '{}');
  mutate(pkg);
  return { dir: pkg, cli: path.join(pkg, 'bin/cli.js') };
}
const sync = (pkg, dir, extra = []) => run(['-a', 'claude', '-t', dir, ...extra], { cliPath: pkg.cli });
const editFile = (base, rel, fn) => fs.writeFileSync(path.join(base, rel), fn(fs.readFileSync(path.join(base, rel), 'utf8')));
const lf = (text) => text.replace(/\r\n/g, '\n');
const manifestOf = (dir) => JSON.parse(read(dir, '.claude/.ai-standards-manifest.json'));

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

test('antigravity AGENTS.md keeps local edits (sidecar when base unknown), --force replaces with backup', () => {
  const dir = freshDir();
  run(['-a', 'antigravity', '-t', dir]);
  const file = path.join(dir, '.agents/AGENTS.md');
  fs.writeFileSync(file, '# Local Override Content');
  fs.rmSync(path.join(dir, '.agents/.ai-standards-base'), { recursive: true });
  const manifestPath = path.join(dir, '.agents/.ai-standards-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  delete manifest.files['AGENTS.md'];
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));

  const second = run(['-a', 'antigravity', '-t', dir]);
  assert.strictEqual(fs.readFileSync(file, 'utf8'), '# Local Override Content');
  assert.ok(second.out.includes('AGENTS.md'), 'expected a note about AGENTS.md');
  assert.ok(exists(dir, '.agents/AGENTS.md.ai-standards-new'));

  run(['-a', 'antigravity', '-t', dir, '--force']);
  assert.ok(read(dir, '.agents/AGENTS.md').includes('ai-standards:adapter:antigravity'));
  assert.strictEqual(read(dir, '.agents/.ai-standards-backup/AGENTS.md'), '# Local Override Content');
});

test('claude sync writes skills, 5 agents, rules; --force replaces an edited rules file', () => {
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
  run(['-a', 'claude', '-t', dir, '--force']);
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
  assert.strictEqual(read(dir, '.agents/skills/plan-review/SKILL.md'), 'old', 'unrecognised edited file is preserved');
  assert.ok(exists(dir, '.agents/skills/plan-review/SKILL.md.ai-standards-new'));
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
  manifest.files['skills/retired-skill/SKILL.md'] = sha('x');
  manifest.files['agents/rails-retired.md'] = sha('x');
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

test('manifest v2 shape, snapshot, and no leftovers', () => {
  const dir = freshDir();
  run(['-a', 'claude', '-t', dir]);
  const m = manifestOf(dir);
  assert.strictEqual(m.manifestVersion, 2);
  assert.strictEqual(m.packageVersion, JSON.parse(fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8')).version);
  assert.strictEqual(m.rules, 'rules/ai-standards.md');
  assert.ok(m.skills.includes('plan-review') && m.agents.includes('rails-auditor.md'));
  assert.match(m.files[SKILL], /^[0-9a-f]{64}$/);
  assert.ok(m.files['agents/rails-auditor.md'] && m.files['rules/ai-standards.md']);
  assert.strictEqual(read(dir, '.claude/.ai-standards-base/' + SKILL), read(dir, '.claude/' + SKILL));
  assert.ok(!exists(dir, '.claude/' + SKILL + '.ai-standards-new'));
});

test('unedited file is overwritten on upgrade', () => {
  const older = packageCopy();
  const newer = packageCopy((p) => editFile(p, SKILL, (t) => t + '\nNew upstream line.\n'));
  const dir = freshDir();
  sync(older, dir);
  const { status, out } = sync(newer, dir);
  assert.strictEqual(status, 0);
  assert.ok(read(dir, '.claude/' + SKILL).includes('New upstream line.'));
  assert.ok(/1 updated, 0 merged, 0 kept \(edited\), 0 conflicts/.test(out), out);
  assert.strictEqual(manifestOf(dir).files[SKILL], sha(lf(read(dir, '.claude/' + SKILL))));
});

test('edited file with unchanged upstream is kept', () => {
  const dir = freshDir();
  run(['-a', 'claude', '-t', dir]);
  editFile(path.join(dir, '.claude'), SKILL, (t) => 'MINE\n' + t);
  const { out } = run(['-a', 'claude', '-t', dir]);
  assert.ok(read(dir, '.claude/' + SKILL).startsWith('MINE'));
  assert.ok(out.includes('kept your edits (no upstream change)'), out);
  assert.ok(!exists(dir, '.claude/' + SKILL + '.ai-standards-new'));
});

test('both changed with a clean merge is auto-merged with a backup', () => {
  const older = packageCopy();
  const newer = packageCopy((p) => editFile(p, SKILL, (t) => t.trimEnd() + '\nUpstream tail line.\n'));
  const dir = freshDir();
  sync(older, dir);
  editFile(path.join(dir, '.claude'), SKILL, (t) => 'MY HEAD LINE\n\n' + t);
  const mine = read(dir, '.claude/' + SKILL);
  const { status, out } = sync(newer, dir);
  assert.strictEqual(status, 0);
  const merged = read(dir, '.claude/' + SKILL);
  assert.ok(merged.startsWith('MY HEAD LINE') && merged.includes('Upstream tail line.'));
  assert.ok(/1 merged/.test(out), out);
  assert.strictEqual(read(dir, '.claude/.ai-standards-backup/' + SKILL), mine);
  assert.strictEqual(lf(read(dir, '.claude/.ai-standards-base/' + SKILL)), lf(read(newer.dir, SKILL)));
});

test('conflicting edit keeps the user file and writes .ai-standards-new', () => {
  const older = packageCopy();
  const newer = packageCopy((p) => editFile(p, SKILL, (t) => 'UPSTREAM HEAD\n' + t));
  const dir = freshDir();
  sync(older, dir);
  editFile(path.join(dir, '.claude'), SKILL, (t) => 'MY HEAD\n' + t);
  const mine = read(dir, '.claude/' + SKILL);
  const { status, out } = sync(newer, dir);
  assert.strictEqual(status, 0);
  assert.strictEqual(read(dir, '.claude/' + SKILL), mine);
  assert.ok(read(dir, '.claude/' + SKILL + '.ai-standards-new').startsWith('UPSTREAM HEAD'));
  assert.ok(/1 conflicts/.test(out), out);
  assert.strictEqual(lf(read(dir, '.claude/.ai-standards-base/' + SKILL)), lf(read(older.dir, SKILL)), 'base must not advance when mine is kept');
});

test('--force takes the package version for edited files, with backup', () => {
  const dir = freshDir();
  run(['-a', 'claude', '-t', dir]);
  const original = read(dir, '.claude/' + SKILL);
  editFile(path.join(dir, '.claude'), SKILL, (t) => 'MINE\n' + t);
  const mine = read(dir, '.claude/' + SKILL);
  run(['-a', 'claude', '-t', dir, '--force']);
  assert.strictEqual(read(dir, '.claude/' + SKILL), original);
  assert.strictEqual(read(dir, '.claude/.ai-standards-backup/' + SKILL), mine);
});

test('CRLF-only difference counts as unedited', () => {
  const older = packageCopy();
  const newer = packageCopy((p) => editFile(p, SKILL, (t) => t + '\nNew upstream line.\n'));
  const dir = freshDir();
  sync(older, dir);
  editFile(path.join(dir, '.claude'), SKILL, (t) => t.replace(/\r?\n/g, '\r\n'));
  const { out } = sync(newer, dir);
  assert.ok(read(dir, '.claude/' + SKILL).includes('New upstream line.'));
  assert.ok(/0 kept \(edited\), 0 conflicts/.test(out), out);
});

test('legacy v1 manifest with content matching known-hashes is overwritten', () => {
  const legacy = 'legacy released content\n';
  const pkg = packageCopy((p) => fs.writeFileSync(path.join(p, 'known-hashes.json'),
    JSON.stringify({ claude: { [SKILL]: [sha(legacy)] } })));
  const dir = freshDir();
  fs.mkdirSync(path.join(dir, '.claude/skills/plan-review'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.claude/' + SKILL), legacy.replace(/\n/g, '\r\n'));
  fs.writeFileSync(path.join(dir, '.claude/.ai-standards-manifest.json'),
    JSON.stringify({ skills: ['plan-review'], agents: [], rules: 'rules/ai-standards.md' }));
  const { status, out } = sync(pkg, dir);
  assert.strictEqual(status, 0);
  assert.strictEqual(lf(read(dir, '.claude/' + SKILL)), lf(read(pkg.dir, SKILL)));
  assert.ok(!exists(dir, '.claude/' + SKILL + '.ai-standards-new'), out);
  assert.strictEqual(manifestOf(dir).manifestVersion, 2);
});

test('locally deleted managed file is not restored non-interactively', () => {
  const dir = freshDir();
  run(['-a', 'claude', '-t', dir]);
  fs.rmSync(path.join(dir, '.claude/agents/rails-profiler.md'));
  const { status, out } = run(['-a', 'claude', '-t', dir]);
  assert.strictEqual(status, 0);
  assert.ok(!exists(dir, '.claude/agents/rails-profiler.md'));
  assert.ok(out.includes('deleted locally'), out);
  assert.ok(manifestOf(dir).files['agents/rails-profiler.md'], 'still tracked, so it is not silently restored later');
  run(['-a', 'claude', '-t', dir, '--force']);
  assert.ok(exists(dir, '.claude/agents/rails-profiler.md'), '--force restores');
});

test('files removed upstream: unedited pruned, edited kept and released from management', () => {
  const gone = ['subagent-delegate-on-rails', 'git-branch-cleanup'];
  const older = packageCopy();
  const newer = packageCopy((p) => gone.forEach((g) => fs.rmSync(path.join(p, 'skills', g), { recursive: true })));
  const dir = freshDir();
  sync(older, dir);
  fs.appendFileSync(path.join(dir, '.claude/skills/git-branch-cleanup/SKILL.md'), '\nmy notes\n');
  const { status, out } = sync(newer, dir);
  assert.strictEqual(status, 0);
  assert.ok(!exists(dir, '.claude/skills/subagent-delegate-on-rails'), 'unedited removed skill pruned');
  assert.ok(read(dir, '.claude/skills/git-branch-cleanup/SKILL.md').includes('my notes'));
  assert.ok(out.includes('no longer shipped'), out);
  assert.ok(!manifestOf(dir).files['skills/git-branch-cleanup/SKILL.md']);
  assert.ok(!exists(dir, '.claude/.ai-standards-base/skills/git-branch-cleanup'));
});

test('interactive prompts: new package version, keep mine, and apply-to-all', async () => {
  const { syncTarget } = await import(pathToFileURL(path.join(repoDir, 'bin/sync.js')).href);
  const { default: claude } = await import(pathToFileURL(path.join(repoDir, 'bin/targets/claude.js')).href);
  const files = ['agents/rails-auditor.md', 'agents/rails-explorer.md', 'agents/rails-profiler.md'];
  const older = packageCopy();
  const newer = packageCopy((p) => files.forEach((f) => fs.appendFileSync(path.join(p, 'targets/claude', f), '\nupstream\n')));
  const dir = freshDir();
  const ctx = { targetDir: dir, log: () => {} };
  await syncTarget(claude, { ...ctx, sourceDir: older.dir });
  for (const f of files) editFile(path.join(dir, '.claude'), f, (t) => 'MINE\n' + t);
  fs.rmSync(path.join(dir, '.claude/.ai-standards-base'), { recursive: true });
  const asked = [];
  const answers = ['n', 'k!'];
  await syncTarget(claude, { ...ctx, sourceDir: newer.dir, interactive: true, ask: async (q) => { asked.push(q); return answers.shift(); } });
  assert.strictEqual(asked.length, 2, 'apply-to-all skips the third prompt');
  assert.deepStrictEqual(files.map((f) => read(dir, '.claude/' + f).startsWith('MINE')), [false, true, true]);
  assert.ok(exists(dir, '.claude/.ai-standards-backup/' + files[0]));
});

// Legacy (v1, no snapshot) antigravity install of `older`, with the older rules file shipped as a known base in `newer`.
function legacyAntigravity(edit) {
  const older = packageCopy();
  const newer = packageCopy((p) => editFile(p, 'AGENTS.md', (t) => 'UPSTREAM HEAD\n\n' + t));
  const dir = freshDir();
  const ag = (pkg, extra = []) => run(['-a', 'antigravity', '-t', dir, ...extra], { cliPath: pkg.cli });
  ag(older);
  const released = lf(read(dir, '.agents/AGENTS.md'));
  const baseDir = path.join(newer.dir, 'known-bases/antigravity/AGENTS.md');
  fs.mkdirSync(baseDir, { recursive: true });
  fs.writeFileSync(path.join(baseDir, sha(released) + '.md'), released);
  fs.rmSync(path.join(dir, '.agents/.ai-standards-base'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.agents/.ai-standards-manifest.json'),
    JSON.stringify({ skills: [], agents: [], rules: 'AGENTS.md' }));
  fs.writeFileSync(path.join(dir, '.agents/AGENTS.md'), edit(released));
  return { dir, newer, released, result: ag(newer) };
}

test('legacy install with appended local rules merges using a base inferred from release history', () => {
  const { dir, newer, released, result } = legacyAntigravity((t) => t + '\n## Local rules\n- my local rule\n');
  const merged = read(dir, '.agents/AGENTS.md');
  assert.strictEqual(result.status, 0);
  assert.ok(merged.startsWith('UPSTREAM HEAD'), 'new package content applied');
  assert.ok(merged.includes('## Local rules') && merged.includes('- my local rule'), 'local section kept');
  assert.ok(/inferred from release history/.test(result.out) && /1 merged/.test(result.out), result.out);
  assert.ok(!exists(dir, '.agents/AGENTS.md.ai-standards-new'));
  assert.ok(read(dir, '.agents/.ai-standards-backup/AGENTS.md').includes('- my local rule'));
  assert.strictEqual(lf(read(dir, '.agents/.ai-standards-base/AGENTS.md')), lf(read(newer.dir, 'AGENTS.md')).trimEnd() + '\n\n' + lf(read(newer.dir, 'targets/antigravity/adapter.md')).trimEnd() + '\n');
  assert.ok(released.length > 0);
});

test('legacy install: conflicting or heavily rewritten files are kept with a sidecar', () => {
  const close = legacyAntigravity((t) => 'MY HEAD\n\n' + t);
  assert.ok(read(close.dir, '.agents/AGENTS.md').startsWith('MY HEAD'));
  assert.ok(exists(close.dir, '.agents/AGENTS.md.ai-standards-new'));
  assert.ok(/1 conflicts/.test(close.result.out), close.result.out);

  const rewritten = legacyAntigravity(() => '# My own rules\n\nNothing like the original.\n');
  assert.strictEqual(read(rewritten.dir, '.agents/AGENTS.md'), '# My own rules\n\nNothing like the original.\n');
  assert.ok(exists(rewritten.dir, '.agents/AGENTS.md.ai-standards-new'));
  assert.ok(/no merge base/.test(rewritten.result.out), rewritten.result.out);
});

let failed = 0;
console.log('Starting CLI tests...');
try {
  for (const [name, fn] of tests) {
    try {
      await fn();
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
