#!/usr/bin/env node

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const sourceDir = path.resolve(__dirname, '..');

const usage = `
@higherkey/ai-standards sync CLI

Usage:
  npx ai-standards-sync [options]

Options:
  -f, --force      Overwrite the existing .agents/AGENTS.md (will lose local overrides)
  -t, --target     Target directory (default: current working directory)
  -h, --help       Show this help message

Best Practices:
  To run automatically on installations, add this to your package.json:
    "scripts": {
      "postinstall": "ai-standards-sync"
    }

  For security and git hygiene, exclude trace and task files from git tracking.
  Add the following to your .git/info/exclude or global .gitignore:
    /.agents/
    /task.md
    /walkthrough.md
    /docs/traces/
`;

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    help: false,
    force: false,
    target: process.cwd()
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--force' || arg === '-f') {
      options.force = true;
    } else if (arg === '--target' || arg === '-t') {
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('-')) {
        options.target = path.resolve(nextArg);
        i++;
      } else {
        console.error('❌ Error: --target / -t requires a path directory.');
        process.exit(1);
      }
    }
  }
  return options;
}

function run() {
  const options = parseArgs();

  if (options.help) {
    console.log(usage);
    process.exit(0);
  }

  const targetAgentsDir = path.join(options.target, '.agents');
  const srcSkillsDir = path.join(sourceDir, 'skills');
  const destSkillsDir = path.join(targetAgentsDir, 'skills');
  const srcAgentsMd = path.join(sourceDir, 'AGENTS.md');
  const destAgentsMd = path.join(targetAgentsDir, 'AGENTS.md');

  try {
    // Ensure target directories exist
    if (!fs.existsSync(targetAgentsDir)) {
      fs.mkdirSync(targetAgentsDir, { recursive: true });
    }

    console.log('🔄 Synchronizing skills...');
    fs.cpSync(srcSkillsDir, destSkillsDir, { recursive: true, force: true });
    console.log('✅ Skills synchronized.');

    const localAgentsExists = fs.existsSync(destAgentsMd);
    if (!localAgentsExists || options.force) {
      fs.copyFileSync(srcAgentsMd, destAgentsMd);
      console.log(`${options.force && localAgentsExists ? '🔄 Overwrote' : '✅ Initialized'} AGENTS.md from global template.`);
    } else {
      console.log('ℹ️ Skipping AGENTS.md (local version already exists. Use --force to overwrite).');
    }

    console.log('🎉 AI Rules & Skills synchronized successfully!');
  } catch (error) {
    console.error('❌ Error synchronizing AI rules:', error.message);

    // If running in postinstall script, do not crash the installer!
    const isPostInstall = process.env.npm_lifecycle_event === 'postinstall';
    if (isPostInstall) {
      console.warn('⚠️ Warning: AI standards sync failed, but installer will continue.');
      process.exit(0);
    } else {
      process.exit(1);
    }
  }
}

run();
