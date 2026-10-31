#!/usr/bin/env node
/**
 * npx @getsystemix/cli update
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
const PACKAGE_NAME = '@getsystemix/cli';

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

/**
 * The bundled pipelines installed here. A skill shared by several pipelines (drift-report
 * is in two) says nothing about which one was installed, so a pipeline counts when one of
 * the skills only it ships is present.
 */
function installedPipelines(installedNames, pipelinesDir = PIPELINES_DIR) {
  const have = new Set(installedNames);
  const manifests = fs.readdirSync(pipelinesDir)
    .filter((name) => fs.existsSync(path.join(pipelinesDir, name, 'manifest.json')))
    .map((name) => ({ name, skills: JSON.parse(fs.readFileSync(path.join(pipelinesDir, name, 'manifest.json'), 'utf8')).skills || [] }));
  const owners = new Map();
  for (const m of manifests) for (const sk of m.skills) owners.set(sk, (owners.get(sk) || 0) + 1);
  return manifests
    .filter((m) => {
      const own = m.skills.filter((sk) => owners.get(sk) === 1);
      return (own.length ? own : m.skills).some((sk) => have.has(sk));
    })
    .map((m) => m.name)
    .sort();
}

function fetchLatestVersion() {
  return new Promise((resolve, reject) => {
    // Scoped package names need the "/" encoded for the registry's URL path.
    const req = https.get(`https://registry.npmjs.org/${PACKAGE_NAME.replace('/', '%2f')}/latest`, {
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
  npx @getsystemix/cli update                    Show what an update would change (writes nothing)
  npx @getsystemix/cli update --yes              Apply it: re-install the installed pipelines' skills
  npx @getsystemix/cli update --packs            Also show third-party skill-pack changes (pinned commits)
  npx @getsystemix/cli update --packs-only       Only third-party skill packs
  npx @getsystemix/cli update <pack-name>        One third-party skill pack

Options:
  --yes          Apply the changes shown (without it, update only reports)
  --check        Report only (the default; kept for scripts)
  --force        Re-install even when the version is current
  --packs        Include third-party skill packs (never fetched otherwise)
  --help         Show this help
`);
    return;
  }

  // nothing is written without --yes: a person sees the plan first
  const checkOnly = args.includes('--check') || !args.includes('--yes');
  const force = args.includes('--force');
  const packsOnly = args.includes('--packs-only');
  const withPacks = args.includes('--packs');
  // Positional pack name: first arg that isn't a flag
  const packFilter = args.find(a => !a.startsWith('--')) || null;

  console.log('Systemix Update\n');

  // ── packs-only / targeted pack: skip npm check entirely ────────────────────
  if (packsOnly || packFilter) {
    await updateSkillPacks({ checkOnly, force, packFilter, skillsDir: SKILLS_DIR });
    console.log('\n  Run `npx @getsystemix/cli doctor` to verify your setup.');
    return;
  }

  // Check installed skills
  const installed = getInstalledSkills();
  if (installed.length === 0) {
    console.log('No skills installed. Run: npx @getsystemix/cli init');
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
    // Loop skills reconcile from the local bundle — works offline.
    syncBundledLoopSkills(checkOnly);
    if (withPacks) await updateSkillPacks({ checkOnly, force, packFilter: null, skillsDir: SKILLS_DIR });
    if (checkOnly) console.log('\nNothing was written. Run with --yes to apply.');
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
      console.log(`It would re-install: ${installedPipelines(installed.map((s) => s.name)).join(', ') || 'nothing (no bundled pipeline installed)'}`);
      console.log('Run with --yes to apply it.');
    }
  } else {
    // Re-install only the pipelines whose skills are installed here
    const pipelineNames = installedPipelines(installed.map((s) => s.name));
    console.log(`Update available: ${currentVersion} -> ${latestVersion}`);
    if (!pipelineNames.length) console.log('No bundled pipeline is installed here; nothing to re-install.');
    console.log(`Re-installing: ${pipelineNames.join(', ')}\n`);
    try {
      const { add } = require('../add');
      for (const pipeline of pipelineNames) {
        await add(pipeline);
      }
      console.log('\nSkills updated successfully');
    } catch (err) {
      console.error('\nUpdate failed:', err.message);
      console.error('  Try: npx @getsystemix/cli update --yes --force');
      process.exit(1);
    }
  }

  // ── Bundled loop skills: reconcile the installed set with the CLI source ────
  // The npm check above compares the PACKAGE version; the loop skills can drift in
  // place independently of it — e.g. the user-global ~/.claude/skills/ that init and
  // `workflow add` never touch (ADR-008). Always reconcile them here so `update`
  // heals that drift too. Reuses `skills sync` against the dir update already resolved.
  syncBundledLoopSkills(checkOnly);

  // ── Third-party skill packs: only when asked, pinned to a commit ───────────
  if (withPacks) await updateSkillPacks({ checkOnly, force, packFilter: null, skillsDir: SKILLS_DIR });
  else console.log('\nThird-party skill packs: not fetched (add --packs to review them).');
  if (checkOnly) console.log('\nNothing was written. Run with --yes to apply.');

  console.log('\n  Run `npx @getsystemix/cli doctor` to verify your setup.');
}

/**
 * Reconcile the bundled loop (hypothesis-validation) skills into SKILLS_DIR, the
 * same dir the rest of `update` writes to (project .claude/skills/ if present, else
 * global). Honors --check via dry-run. Best-effort: a failure here never fails update.
 */
function syncBundledLoopSkills(checkOnly) {
  try {
    const { syncSkills } = require('./skills');
    const r = syncSkills({ 'dry-run': checkOnly }, { skillsDir: SKILLS_DIR });
    const changed = r.results.filter(x => x.state === 'create' || x.state === 'update');
    console.log(`\nLoop skills (${r.pipeline}):`);
    if (!changed.length) {
      console.log('  All current.');
      return;
    }
    for (const x of changed) {
      console.log(`  ${x.skill.padEnd(20)} ${x.state === 'update' ? `${x.from} → ${x.to}` : '(new)'}`);
    }
    console.log(checkOnly ? '  Run without --check to apply.' : `  ${changed.length} synced.`);
  } catch (err) {
    console.warn('\n  Loop skill sync skipped:', err.message);
  }
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

module.exports = { update, installedPipelines };
