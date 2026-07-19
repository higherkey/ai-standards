import { execSync } from 'child_process';
import fs from 'fs';

console.warn('⚠️ DEPRECATION WARNING: scripts/sync-ai.js is deprecated.');
console.warn('⚠️ Please switch to the npm package `@higherkey/ai-standards` instead.');
console.warn('⚠️ Run `npm install --save-dev @higherkey/ai-standards` and add it to your postinstall script.');
console.warn('⚠️ See https://github.com/higherkey/ai-standards#readme for details.');
console.warn('');

const tempDir = '.agents-temp';

try {
  // Preflight: verify git is available on PATH
  try {
    execSync('git --version', { stdio: 'ignore' });
  } catch {
    console.error('❌ Git is not installed or not on PATH. Please install Git (https://git-scm.com) and try again.');
    process.exit(1);
  }

  // Clean up any stale temp directory
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  console.log('Cloning centralized AI standards...');
  execSync(`git clone --depth 1 https://github.com/higherkey/ai-standards.git ${tempDir}`, { stdio: 'ignore' });

  // Ensure target directories exist
  if (!fs.existsSync('.agents')) {
    fs.mkdirSync('.agents');
  }

  console.log('Synchronizing skills...');
  fs.cpSync(`${tempDir}/skills`, '.agents/skills', { recursive: true, force: true });

  // Sync global AGENTS.md only if it does not already exist
  // This prevents overwriting project-specific local rules
  const localAgentsPath = '.agents/AGENTS.md';
  if (!fs.existsSync(localAgentsPath)) {
    fs.copyFileSync(`${tempDir}/AGENTS.md`, localAgentsPath);
    console.log('Initialized AGENTS.md from template.');
  } else {
    console.log('Skipping AGENTS.md (local version already exists).');
  }

  console.log('Cleaning up temporary files...');
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log('✅ AI Rules & Skills synchronized successfully!');

} catch (error) {
  console.error('❌ Error synchronizing AI rules:', error.message);
  // Cleanup on failure
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  process.exit(1);
}
