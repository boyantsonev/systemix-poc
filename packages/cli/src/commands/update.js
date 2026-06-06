#!/usr/bin/env node
/**
 * npx systemix update
 * Check for and apply SKILL.md updates from the package registry.
 * Since skills ship with the npm package, "update" means checking
 * the installed package version vs latest on npm and re-running
 * the install step for skills that have changed.
 *
 * Also fetches external skill-packs declared in pipeline manifests
 * (e.g. github:southleft/figma-console-mcp-skills).
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const os = require('os');
const { fetchSkillPack, parseVersion, resolveAllSkillPacks } = require('../skills-fetcher');

const PIPELINES_DIR = path.join(__dirname, '../../pipelines');

// Prefer this repo's project-scoped skills (.claude/skills/); fall back to global. ADR-008.
const PROJECT_SKILLS = path.join(process.cwd(), '.claude', 'skills');
const SKILLS_DIR = fs.existsSync(PROJECT_SKILLS)
  ? PROJECT_SKILLS
  : path.join(os.homedir(), '.claude', 'skills');
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
  npx systemix update                    Check npm + skill-pack updates, apply
  npx systemix update --check            Dry run — show what would change
  npx systemix update --force            Re-install all skills regardless of version
  npx systemix update --packs-only       Only refresh external skill packs
  npx systemix update <pack-name>        Refresh a specific skill pack

Options:
  --check        Report available updates without applying
  --force        Force re-install all skills
  --packs-only   Skip npm version check, only fetch skill packs
  --help         Show this help
`);
    return;
  }

  const checkOnly = args.includes('--check');
  const force = args.includes('--force');
  const packsOnly = args.includes('--packs-only');
  // Positional pack name: first arg that isn't a flag
  const packFilter = args.find(a => !a.startsWith('--')) || null;

  console.log('Systemix Update\n');

  // ── packs-only / targeted pack: skip npm check entirely ────────────────────
  if (packsOnly || packFilter) {
    await updateSkillPacks({ checkOnly, force, packFilter, skillsDir: SKILLS_DIR });
    console.log('\n  Run `npx systemix doctor` to verify your setup.');
    return;
  }

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
    // Still try skill packs (they use a separate GitHub fetch)
    await updateSkillPacks({ checkOnly, force, packFilter: null, skillsDir: SKILLS_DIR });
    return;
  }

  const latestVersion = latest.version;
  console.log(`Latest systemix version: ${latestVersion}\n`);

  const pkgPath = path.join(__dirname, '../../package.json');
  let currentVersion = '0.0.0';
  try {
    currentVersion = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).version;
  } catch { /* ok */ }

  if (currentVersion === latestVersion && !force) {
    console.log(`Already on latest version (${currentVersion})`);
    console.log('  Bundled skills are up to date.\n');
  } else if (checkOnly) {
    if (currentVersion !== latestVersion) {
      console.log(`Update available: ${currentVersion} -> ${latestVersion}`);
      console.log('Run without --check to apply the update.');
    }
  } else {
    // Re-install bundled pipeline skills
    const pipelineNames = [...new Set(installed.map(() => 'figma-to-code'))];
    console.log(`Update available: ${currentVersion} -> ${latestVersion}`);
    console.log('Re-installing skills...\n');
    try {
      const { add } = require('../add');
      for (const pipeline of pipelineNames) {
        await add(pipeline);
      }
      console.log('\nSkills updated successfully');
    } catch (err) {
      console.error('\nUpdate failed:', err.message);
      console.error('  Try: npx systemix add figma-to-code');
      process.exit(1);
    }
  }

  // ── Skill-packs fetch phase (always runs for full update) ──────────────────
  await updateSkillPacks({ checkOnly, force, packFilter: null, skillsDir: SKILLS_DIR });

  console.log('\n  Run `npx systemix doctor` to verify your setup.');
}

/**
 * Fetch skill-packs declared in pipeline manifests and write updated
 * SKILL.md files to the project's .claude/skills/ directory.
 */
async function updateSkillPacks({ checkOnly, force, packFilter, skillsDir }) {
  const allPacks = resolveAllSkillPacks(PIPELINES_DIR);

  if (allPacks.size === 0) return;

  const packs = packFilter
    ? new Map([[packFilter, allPacks.get(packFilter)]].filter(([, v]) => v))
    : allPacks;

  if (packFilter && !allPacks.has(packFilter)) {
    console.error(`\n✗ Unknown skill pack: "${packFilter}"`);
    console.error('  Available packs:', [...allPacks.keys()].join(', '));
    process.exit(1);
  }

  console.log(`\nSkill Packs (${packs.size}):`);

  let anyFailed = false;
  let updatedCount = 0;

  for (const [packName, packConfig] of packs) {
    console.log(`\n  ${packName} (${packConfig.source})`);
    console.log('  Fetching...');

    let fetched;
    try {
      fetched = await fetchSkillPack(packConfig);
    } catch {
      fetched = [];
    }

    if (fetched.length === 0 && packConfig.skills.length > 0) {
      console.log('  Could not reach GitHub — skill pack update skipped. Bundled skills are current.');
      anyFailed = true;
      continue;
    }

    for (const { name, content, version: remoteVersion } of fetched) {
      const skillDir = path.join(skillsDir, name);
      const skillFile = path.join(skillDir, 'SKILL.md');

      let localVersion = '0.0.0';
      if (fs.existsSync(skillFile)) {
        localVersion = parseVersion(fs.readFileSync(skillFile, 'utf8'));
      }

      const isNew = localVersion === '0.0.0' && !fs.existsSync(skillFile);
      const hasUpdate = localVersion !== remoteVersion;
      const label = isNew ? '(new)' : hasUpdate ? `${localVersion} → ${remoteVersion}` : `${localVersion} ✓`;
      const needsWrite = force || isNew || hasUpdate;

      console.log(`    ${name.padEnd(34)} ${label}`);

      if (!needsWrite || checkOnly) continue;

      fs.mkdirSync(skillDir, { recursive: true });
      const tmp = skillFile + '.tmp';
      fs.writeFileSync(tmp, content, 'utf8');
      fs.renameSync(tmp, skillFile);
      updatedCount++;
    }
  }

  if (checkOnly) {
    console.log('\n  Run without --check to apply.');
    return;
  }

  if (updatedCount > 0) {
    console.log(`\n  ${updatedCount} skill(s) updated from packs.`);
  } else if (!anyFailed) {
    console.log('\n  All skill packs are current.');
  }
}

module.exports = { update };
