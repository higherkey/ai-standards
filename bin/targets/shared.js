import fs from 'fs';
import path from 'path';

export const MANIFEST_NAME = '.ai-standards-manifest.json';

export function readManifest(root) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, MANIFEST_NAME), 'utf8'));
  } catch {
    return {};
  }
}

export function listDirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
}

export function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile()).map((e) => e.name);
}

// Remove entries a previous sync installed that are no longer shipped. Never touches unlisted files.
function prune(baseDir, previous = [], current = []) {
  for (const name of previous) {
    if (current.includes(name) || name !== path.basename(name)) continue;
    fs.rmSync(path.join(baseDir, name), { recursive: true, force: true });
  }
}

/**
 * Copy packaged skills (and optional agent files) into `root`, pruning entries that
 * dropped out of the package, and write the manifest.
 * Returns the manifest so callers can add the rules entry before saving.
 */
export function syncManaged({ sourceDir, root, agentsSrc, rules }) {
  const previous = readManifest(root);
  const skillsSrc = path.join(sourceDir, 'skills');
  const skills = listDirs(skillsSrc);
  const agents = agentsSrc ? listFiles(agentsSrc) : [];

  fs.mkdirSync(path.join(root, 'skills'), { recursive: true });
  prune(path.join(root, 'skills'), previous.skills, skills);
  for (const skill of skills) {
    fs.cpSync(path.join(skillsSrc, skill), path.join(root, 'skills', skill), { recursive: true, force: true });
  }

  if (agentsSrc) {
    fs.mkdirSync(path.join(root, 'agents'), { recursive: true });
    prune(path.join(root, 'agents'), previous.agents, agents);
    for (const file of agents) {
      fs.copyFileSync(path.join(agentsSrc, file), path.join(root, 'agents', file));
    }
  }

  const manifest = { skills, agents, rules };
  fs.writeFileSync(path.join(root, MANIFEST_NAME), JSON.stringify(manifest, null, 2) + '\n');
  return { manifest, skillCount: skills.length, agentCount: agents.length };
}

export function readSource(sourceDir, ...parts) {
  return fs.readFileSync(path.join(sourceDir, ...parts), 'utf8').replace(/\s+$/, '');
}
