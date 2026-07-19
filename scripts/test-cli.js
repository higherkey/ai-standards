import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const tempProjectDir = path.resolve('.test-project');

function cleanup() {
  if (fs.existsSync(tempProjectDir)) {
    fs.rmSync(tempProjectDir, { recursive: true, force: true });
  }
}

try {
  console.log('🧪 Starting CLI Tests...');
  cleanup();

  // Test 1: Run with --help
  console.log('Testing --help flag...');
  const helpOutput = execSync('node bin/cli.js --help').toString();
  if (!helpOutput.includes('ai-standards-sync [options]') || !helpOutput.includes('--force')) {
    throw new Error('Help output does not match expected format.');
  }
  console.log('✅ Help flag verified.');

  // Test 2: Standard initial sync
  console.log('Testing initial sync...');
  execSync(`node bin/cli.js --target "${tempProjectDir}"`);

  if (!fs.existsSync(path.join(tempProjectDir, '.agents'))) {
    throw new Error('.agents folder not created.');
  }
  if (!fs.existsSync(path.join(tempProjectDir, '.agents/AGENTS.md'))) {
    throw new Error('AGENTS.md not copied.');
  }
  if (!fs.existsSync(path.join(tempProjectDir, '.agents/skills/plan-review/SKILL.md'))) {
    throw new Error('Skills subfolders and files not copied.');
  }
  console.log('✅ Initial sync verified.');

  // Test 3: Override protection (running sync again without --force should NOT overwrite AGENTS.md)
  console.log('Testing local AGENTS.md override protection...');
  const testAgentsPath = path.join(tempProjectDir, '.agents/AGENTS.md');
  const dummyOverride = '# Local Override Content';
  fs.writeFileSync(testAgentsPath, dummyOverride);

  execSync(`node bin/cli.js --target "${tempProjectDir}"`);
  const postSyncContent = fs.readFileSync(testAgentsPath, 'utf8');
  if (postSyncContent !== dummyOverride) {
    throw new Error('AGENTS.md was incorrectly overwritten during standard sync!');
  }
  console.log('✅ Override protection verified.');

  // Test 4: Force override
  console.log('Testing --force overwrite...');
  execSync(`node bin/cli.js --target "${tempProjectDir}" --force`);
  const postForceContent = fs.readFileSync(testAgentsPath, 'utf8');
  if (postForceContent === dummyOverride) {
    throw new Error('AGENTS.md was NOT overwritten when using --force!');
  }
  console.log('✅ Force overwrite verified.');

  // Test 5: Postinstall error safety
  console.log('Testing postinstall fail-safe...');
  // Passing an invalid write path should fail normally (exit code 1)
  let failedNormally = false;
  try {
    execSync('node bin/cli.js --target "Z:\\invalid_drive_non_existent\\path"', { stdio: 'ignore' });
  } catch (error) {
    failedNormally = true;
  }
  if (!failedNormally) {
    throw new Error('Cli did not fail on invalid directory write.');
  }
  console.log('✅ Normal exit-on-error verified.');

  // Under postinstall lifecycle, it should warn and exit with 0 (no exception thrown by execSync)
  let postinstallSucceeded = false;
  try {
    execSync('node bin/cli.js --target "Z:\\invalid_drive_non_existent\\path"', {
      env: { ...process.env, npm_lifecycle_event: 'postinstall' },
      stdio: 'ignore'
    });
    postinstallSucceeded = true;
  } catch (error) {
    postinstallSucceeded = false;
  }
  if (!postinstallSucceeded) {
    throw new Error('Cli crashed postinstall process on write error!');
  }
  console.log('✅ Postinstall fail-safe verified.');

  console.log('🎉 All tests passed successfully!');
  cleanup();
  process.exit(0);

} catch (error) {
  console.error('❌ Test failed:', error.message);
  cleanup();
  process.exit(1);
}
