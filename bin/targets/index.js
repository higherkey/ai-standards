import antigravity from './antigravity.js';
import claude from './claude.js';

// Register a new target here (plus a targets/<name>/ content folder).
export const targets = Object.fromEntries([antigravity, claude].map((t) => [t.name, t]));
export const targetNames = Object.keys(targets);
