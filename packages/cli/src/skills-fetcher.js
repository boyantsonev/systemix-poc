'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

/**
 * Parses the "github:owner/repo" source string.
 * Returns { owner, repo } or throws.
 */
function parseGitHubSource(source) {
  const match = source.match(/^github:([^/]+)\/(.+)$/);
  if (!match) throw new Error(`Unsupported skill source: "${source}". Expected "github:owner/repo".`);
  return { owner: match[1], repo: match[2] };
}

/**
 * Fetches a SKILL.md from GitHub raw content.
 * Returns { content: string } or null on any failure (network, 404, timeout).
 */
function fetchSkillFromGitHub(source, skillName, ref = 'main') {
  const { owner, repo } = parseGitHubSource(source);
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${skillName}/SKILL.md`;

  return new Promise((resolve) => {
    const req = https.get(url, { headers: { 'User-Agent': 'systemix-cli' } }, (res) => {
      if (res.statusCode !== 200) { res.resume(); resolve(null); return; }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ content: data }));
    });
    req.on('error', () => resolve(null));
    req.setTimeout(5000, () => { req.destroy(); resolve(null); });
  });
}

/**
 * Parses the `version:` field from SKILL.md frontmatter.
 * Returns '0.0.0' if absent.
 */
function parseVersion(content) {
  const match = content.match(/^---\n[\s\S]*?\nversion:\s*["']?([^\s"'\n]+)["']?[\s\S]*?\n---/m);
  return match ? match[1] : '0.0.0';
}

/**
 * Fetches all declared skills for a single skill-pack config entry.
 * Returns array of { name, content, version } for skills that fetched successfully.
 * Logs a warning for any that failed.
 */
async function fetchSkillPack(packConfig) {
  const { name, source, ref = 'main', skills = [] } = packConfig;
  const results = [];

  for (const skillName of skills) {
    const result = await fetchSkillFromGitHub(source, skillName, ref);
    if (result) {
      results.push({ name: skillName, content: result.content, version: parseVersion(result.content) });
    } else {
      console.warn(`  ⚠  ${name}/${skillName} — fetch failed (skipped)`);
    }
  }

  return results;
}

/**
 * Reads a pipeline manifest and returns its skill-packs array (or [] if absent).
 * manifestPath should be absolute.
 */
function resolveSkillPacksFromManifest(manifestPath) {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    return Array.isArray(manifest['skill-packs']) ? manifest['skill-packs'] : [];
  } catch {
    return [];
  }
}

/**
 * Collects all unique skill-packs declared across all pipeline manifests
 * bundled with the CLI (packages/cli/pipelines/<pipeline>/manifest.json).
 * Returns a Map of packName → packConfig (deduped by name).
 */
function resolveAllSkillPacks(pipelinesDir) {
  const packs = new Map();
  if (!fs.existsSync(pipelinesDir)) return packs;

  for (const entry of fs.readdirSync(pipelinesDir)) {
    const manifestPath = path.join(pipelinesDir, entry, 'manifest.json');
    if (!fs.existsSync(manifestPath)) continue;
    for (const pack of resolveSkillPacksFromManifest(manifestPath)) {
      if (!packs.has(pack.name)) {
        packs.set(pack.name, pack);
      } else {
        // Merge skill lists across pipelines for the same pack
        const existing = packs.get(pack.name);
        const merged = [...new Set([...existing.skills, ...pack.skills])];
        packs.set(pack.name, { ...existing, skills: merged });
      }
    }
  }

  return packs;
}

module.exports = {
  fetchSkillFromGitHub,
  fetchSkillPack,
  parseVersion,
  resolveSkillPacksFromManifest,
  resolveAllSkillPacks,
};
