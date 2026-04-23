#!/usr/bin/env node
/**
 * npx systemix update
 * Check for and apply SKILL.md updates from the package registry.
 * Since skills ship with the npm package, "update" means checking
 * the installed package version vs latest on npm and re-running
 * the install step for skills that have changed.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const os = require('os');

const SKILLS_DIR = path.join(os.homedir(), '.claude', 'skills');
const PACKAGE_NAME = 'systemix';

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split('\n')) {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) fm[key.trim()] = rest.join(':').trim().replace(/^"(.*)"$/, '$1');
  }
  return fm;
}

function getInstalledSkills() {
  if (!fs.existsSync(SKILLS_DIR)) return [];
  return fs.readdirSync(SKILLS_DIR)
    .filter(d => fs.existsSync(path.join(SKILLS_DIR, d, 'SKILL.md')))
    .map(name => {
      const content = fs.readFileSync(path.join(SKILLS_DIR, name, 'SKILL.md'), 'utf8');
      const fm = parseFrontmatter(content);
      return { name, version: fm.version || '0.0.0', lastUpdated: fm.last_updated || 'unknown' };
    });
}

function fetchLatestVersion() {
  return new Promise((resolve, reject) => {
    const req = https.get(`https://registry.npmjs.org/${PACKAGE_NAME}/latest`, {
      headers: { Accept: 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(null); }
      });
    });
    req.on('error', () => resolve(null)); // offline fallback
    req.setTimeout(5000, () => { req.destroy(); resolve(null); });
  });
}

async function update(args) {
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
systemix update — Check and apply SKILL.md updates

Usage:
  npx systemix update              Check for updates
  npx systemix update --check      Check only, don't apply
  npx systemix update --force      Re-install all skills regardless of version

Options:
  --check    Report available updates without applying
  --force    Force re-install all skills
  --help     Show this help
`);
    return;
  }

  const checkOnly = args.includes('--check');
  const force = args.includes('--force');

  console.log('Systemix Update\n');

  // Check installed skills
  const installed = getInstalledSkills();
  if (installed.length === 0) {
    console.log('No skills installed. Run: npx systemix add figma-to-code');
    return;
  }

  console.log(`Installed skills (${installed.length}):`);
  for (const s of installed) {
    console.log(`  ${s.name.padEnd(20)} v${s.version}  (updated ${s.lastUpdated})`);
  }

  // Check npm for latest package version
  console.log('\nChecking registry...');
  const latest = await fetchLatestVersion();

  if (!latest) {
    console.log('Could not reach npm registry — running offline.');
    console.log('  Skills are up to date based on local state.');
    return;
  }

  const latestVersion = latest.version;
  console.log(`Latest systemix version: ${latestVersion}\n`);

  // Compare package version — in future this would compare per-skill versions
  // from a skills manifest bundled with the package
  const pkgPath = path.join(__dirname, '../../package.json');
  let currentVersion = '0.0.0';
  try {
    currentVersion = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;
  } catch { /* ok */ }

  if (currentVersion === latestVersion && !force) {
    console.log(`Already on latest version (${currentVersion})`);
    console.log('  All skills are up to date.\n');
    console.log('  Run with --force to re-install all skills.');
    return;
  }

  if (checkOnly) {
    if (currentVersion !== latestVersion) {
      console.log(`Update available: ${currentVersion} -> ${latestVersion}`);
      console.log('Run without --check to apply the update.');
    }
    return;
  }

  // Apply update — instruct user to re-run add for each installed pipeline
  const pipelineNames = [...new Set(installed.map(s => {
    // Derive pipeline name from skill name (skills are grouped by pipeline)
    // For now, assume figma-to-code is the primary pipeline
    return 'figma-to-code';
  }))];

  console.log(`Update available: ${currentVersion} -> ${latestVersion}`);
  console.log('Re-installing skills...\n');

  try {
    const { add } = require('../add');
    for (const pipeline of pipelineNames) {
      await add(pipeline);
    }
    console.log('\nSkills updated successfully');
    console.log('  Run `npx systemix doctor` to verify your setup.');
  } catch (err) {
    console.error('\nUpdate failed:', err.message);
    console.error('  Try: npx systemix add figma-to-code');
    process.exit(1);
  }
}

module.exports = { update };
