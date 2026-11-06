#!/usr/bin/env node

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import readline from 'readline';
import { targets, targetNames } from './targets/index.js';

const sourceDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG_NAME = '.ai-standards.json';
const INSTALL_HOOKS = ['preinstall', 'install', 'postinstall', 'prepare'];

const usage = `
@higherkey/ai-standards sync CLI

Usage:
  npx ai-standards-sync --agent <name[,name]|all> [options]

Options:
  -a, --agent      Tool(s) to sync: ${targetNames.join(', ')}, or "all" (comma-separated list allowed)
  -y, --yes        Confirm "all" without prompting (required when non-interactive)
  -f, --force      Overwrite the existing .agents/AGENTS.md (will lose local overrides)
  -t, --target     Target directory (default: current working directory)
  -h, --help       Show this help message

Agent resolution (first match wins):
  1. --agent
  2. ${CONFIG_NAME} in the target directory, e.g. { "agents": ["claude"] }
  3. A previous Antigravity install (.agents/skills/plan-review/SKILL.md)
  4. An interactive prompt (TTY only; the choice is saved to ${CONFIG_NAME})
  There is no default. Without a choice the CLI exits with an error.

Targets:
${targetNames.map((n) => `  ${n.padEnd(12)} ${targets[n].describe}`).join('\n')}

Best Practices:
  To run automatically on installations, add this to your package.json:
    "scripts": {
      "postinstall": "ai-standards-sync"
    }
  and commit ${CONFIG_NAME} so every install knows which tool(s) to sync.

  Git hygiene:
    Projects you own: commit the installed files so teammates and CI get the
    same standards.
    Contribution mode (repos owned by someone else): exclude only the managed
    paths in that clone's .git/info/exclude. Not a global excludes file: it
    would also hide branch notes in your own repos.
    Never exclude all of .claude/, which also holds your own settings:
      /.agents/
      /.claude/skills/
      /.claude/agents/rails-*.md
      /.claude/rules/ai-standards.md
      /.claude/.ai-standards-manifest.json
      /.ai-standards.json
      /docs/branch-notes/
      /task.md
      /walkthrough.md
`;

class UsageError extends Error {}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = { help: false, force: false, yes: false, agent: null, target: process.cwd() };

  const valueOf = (i, flag) => {
    const next = args[i + 1];
    if (!next || next.startsWith('-')) throw new UsageError(`${flag} requires a value.`);
    return next;
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--force' || arg === '-f') {
      options.force = true;
    } else if (arg === '--yes' || arg === '-y') {
      options.yes = true;
    } else if (arg === '--agent' || arg === '-a') {
      options.agent = valueOf(i++, arg);
    } else if (arg === '--target' || arg === '-t') {
      options.target = path.resolve(valueOf(i++, arg));
    }
  }
  return options;
}

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (answer) => { rl.close(); resolve(answer.trim()); }));
}

function parseNames(list) {
  const names = (Array.isArray(list) ? list : String(list).split(',')).map((n) => String(n).trim().toLowerCase()).filter(Boolean);
  if (names.length === 0) throw new UsageError('No agent specified.');
  const unknown = names.filter((n) => n !== 'all' && !targets[n]);
  if (unknown.length) {
    throw new UsageError(`Unknown agent "${unknown.join('", "')}". Valid agents: ${targetNames.join(', ')}, all.`);
  }
  return names;
}

function readConfig(targetDir) {
  const file = path.join(targetDir, CONFIG_NAME);
  if (!fs.existsSync(file)) return null;
  let config;
  try {
    config = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    throw new UsageError(`Could not parse ${CONFIG_NAME}: ${error.message}`);
  }
  if (!Array.isArray(config.agents)) throw new UsageError(`${CONFIG_NAME} must look like { "agents": ["claude"] }.`);
  return parseNames(config.agents);
}

function isInteractive(inHook) {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY && !process.env.CI && !inHook);
}

// Returns { names, confirmAll, save }: confirmAll means "all" needs confirmation; save means persist the choice.
async function resolveAgents(options, inHook) {
  if (options.agent) return { names: parseNames(options.agent), confirmAll: true };

  const configured = readConfig(options.target);
  if (configured) return { names: configured, confirmAll: false };

  if (fs.existsSync(path.join(options.target, '.agents/skills/plan-review/SKILL.md'))) {
    console.log(`ℹ️ Detected an existing Antigravity install. Add ${CONFIG_NAME} with { "agents": ["antigravity"] } (or pass --agent) to make this explicit.`);
    return { names: ['antigravity'], confirmAll: false };
  }

  if (isInteractive(inHook)) {
    const answer = await ask(`Which tool(s) should be synced? (${targetNames.join(', ')}, all): `);
    // The choice is saved only after any "all" confirmation, so a cancel leaves nothing behind.
    return { names: parseNames(answer), confirmAll: true, save: true };
  }

  throw new UsageError(`No agent selected. Pass --agent <${targetNames.join('|')}|all> or add ${CONFIG_NAME}.`);
}

async function confirmAll(options) {
  if (options.yes) return;
  if (!isInteractive(false)) throw new UsageError('"all" writes files for every supported tool. Re-run with --yes to confirm.');
  const answer = await ask(`Sync all targets (${targetNames.join(', ')})? [y/N] `);
  if (!/^y(es)?$/i.test(answer)) throw new UsageError('Cancelled.');
}

async function run() {
  const inHook = INSTALL_HOOKS.includes(process.env.npm_lifecycle_event);

  try {
    const options = parseArgs();
    if (options.help) {
      console.log(usage);
      return;
    }

    const { names, confirmAll: needsConfirm, save } = await resolveAgents(options, inHook);
    if (names.includes('all') && needsConfirm) await confirmAll(options);
    const selected = names.includes('all') ? targetNames : [...new Set(names)];

    if (save) {
      fs.mkdirSync(options.target, { recursive: true });
      fs.writeFileSync(path.join(options.target, CONFIG_NAME), JSON.stringify({ agents: selected }, null, 2) + '\n');
      console.log(`✅ Saved choice to ${CONFIG_NAME}.`);
    }

    const ctx = { sourceDir, targetDir: options.target, force: options.force, log: console.log };
    console.log('🔄 Synchronizing AI rules & skills...');
    for (const name of selected) targets[name].install(ctx);
    console.log('🎉 AI Rules & Skills synchronized successfully!');
  } catch (error) {
    console.error(`❌ Error synchronizing AI rules: ${error.message}`);

    // Never crash an installer: under install hooks, warn and continue.
    if (inHook) {
      console.warn('⚠️ Warning: AI standards sync did not complete, but installer will continue.');
      process.exit(0);
    }
    process.exit(1);
  }
}

run();
