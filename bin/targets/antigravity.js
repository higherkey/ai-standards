import fs from 'fs';
import path from 'path';
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

const identity = (rel) => rel;

// Global Antigravity keeps rules under config/rules/ and discovers skills through config/skills.json.
const globalDiskPath = (rel) => (rel === RULES_FILE ? `rules/${rel}` : rel);

/** Make sure <root>/skills.json registers the skills folder, preserving everything else. */
export function registerSkills({ root, log }) {
  const file = path.join(root, 'skills.json');
  const entry = { path: 'skills' };
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify({ entries: [entry] }, null, 2) + '\n');
    log(`ℹ️ [antigravity] created ${file} registering skills/.`);
    return;
  }
  const raw = fs.readFileSync(file, 'utf8');
  const bom = raw.startsWith('﻿') ? '﻿' : '';
  let json;
  try {
    json = JSON.parse(raw.slice(bom.length));
    if (!json || typeof json !== 'object' || Array.isArray(json)) throw new Error('not an object');
    if (json.entries !== undefined && !Array.isArray(json.entries)) throw new Error('"entries" is not an array');
  } catch (error) {
    log(`⚠️ [antigravity] could not parse ${file} (${error.message}); left untouched. Add { "path": "skills" } to its entries yourself.`);
    return;
  }
  json.entries ??= [];
  if (json.entries.some((e) => e && e.path === 'skills')) return;
  json.entries.push(entry);
  fs.writeFileSync(file, bom + JSON.stringify(json, null, 2) + '\n');
  log(`ℹ️ [antigravity] added skills/ to ${file}.`);
}

const target = {
  name: 'antigravity',
  describe: 'Google Antigravity: .agents/skills/ and .agents/AGENTS.md',
  layouts: {
    project: { rootDir: '.agents', diskPath: identity },
    global: { rootDir: '.gemini/config', diskPath: globalDiskPath, finalize: registerSkills }
  },
  managed,
  install: (ctx) => syncTarget(target, ctx)
};

export default target;
