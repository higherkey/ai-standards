import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFileSync } from 'child_process';

export const MANIFEST_NAME = '.ai-standards-manifest.json';

export function readManifest(root) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, MANIFEST_NAME), 'utf8'));
  } catch {
    return {};
  }
}

/** Strip a UTF-8 BOM and convert CRLF to LF. Binary content (contains NUL) is returned untouched. */
export function normalize(buf) {
  if (buf.includes(0)) return buf;
  return Buffer.from(buf.toString('utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n'), 'utf8');
}

/** Directory name under known-bases/<target>/ for a managed file path. */
export const baseDirName = (rel) => rel.replaceAll('/', '__');

export function hashOf(buf) {
  return crypto.createHash('sha256').update(normalize(buf)).digest('hex');
}

// A "source" is a read-only view of package content: the working tree or a git tag.
// read(rel) -> Buffer|null; list(dir) -> sorted posix paths of all files below dir.
export function fsSource(dir) {
  const walk = (rel) => fs.readdirSync(path.join(dir, rel), { withFileTypes: true }).flatMap((e) => {
    const child = `${rel}/${e.name}`;
    return e.isDirectory() ? walk(child) : [child];
  });
  return {
    read(rel) {
      try { return fs.readFileSync(path.join(dir, rel)); } catch { return null; }
    },
    list(rel) {
      return fs.existsSync(path.join(dir, rel)) ? walk(rel).sort() : [];
    }
  };
}

export function gitSource(tag, cwd) {
  let names = null;
  const tree = () => names ??= execFileSync('git', ['ls-tree', '-r', '-z', '--name-only', tag], { cwd, maxBuffer: 1 << 28 })
    .toString('utf8').split('\0').filter(Boolean);
  return {
    read(rel) {
      try {
        return execFileSync('git', ['show', `${tag}:${rel}`], { cwd, maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] });
      } catch {
        return null;
      }
    },
    list: (rel) => tree().filter((n) => n.startsWith(`${rel}/`)).sort()
  };
}

export function readText(src, rel) {
  const buf = src.read(rel);
  return buf === null ? null : buf.toString('utf8').replace(/\s+$/, '');
}

/**
 * Collect skills (every file under skills/<name>/) and optional top-level agent files from a source.
 * Returns { files: Map<rel, Buffer>, skills, agents } with rel relative to the install root.
 */
export function collectManaged(src, { agentsDir } = {}) {
  const files = new Map();
  const skills = new Set();
  for (const rel of src.list('skills')) {
    files.set(rel, src.read(rel));
    skills.add(rel.split('/')[1]);
  }
  const agents = [];
  if (agentsDir) {
    for (const rel of src.list(agentsDir)) {
      const name = rel.slice(agentsDir.length + 1);
      if (name.includes('/')) continue;
      files.set(`agents/${name}`, src.read(rel));
      agents.push(name);
    }
  }
  return { files, skills: [...skills].sort(), agents };
}
