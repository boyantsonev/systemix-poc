const fs = require('fs');
const path = require('path');

// Each pattern: { id, description, match(fileContent, filePath), severity, estimatedWastePerRun, fix }
// Patterns with `match` run per-file.
// Patterns with `matchGlobal` run once against the project root.

module.exports = [
  {
    id: 'unscoped-get-file-data',
    description: 'Unscoped get_file_data call',
    severity: 'error',
    estimatedWastePerRun: 180000,
    match: (content) =>
      content.includes('get_file_data') && !content.includes('node-id'),
    fix: 'Pass --node-id or scope to a specific page'
  },
  {
    id: 'no-budget-cap',
    description: 'No budget cap in CI workflow',
    severity: 'warning',
    estimatedWastePerRun: null,
    match: (content, filePath) =>
      filePath.includes('.github/workflows') &&
      (content.includes('systemix') || content.includes('figma')) &&
      !content.includes('TOKENGUARD_BUDGET') && !content.includes('--budget'),
    fix: 'Add TOKENGUARD_BUDGET=30000 env var or --budget flag'
  },
  {
    id: 'missing-cache-config',
    description: 'No .systemix/cache/ configuration found',
    severity: 'warning',
    estimatedWastePerRun: null,
    matchGlobal: (projectRoot) =>
      !fs.existsSync(path.join(projectRoot, '.systemix', 'cache')),
    fix: 'Run: npx systemix add token-guard'
  },
  {
    id: 'missing-node-map',
    description: 'No node-map.json found — agents will explore Figma file on each run',
    severity: 'warning',
    estimatedWastePerRun: 40000,
    matchGlobal: (projectRoot) => {
      const sm = path.join(projectRoot, '.systemix');
      if (!fs.existsSync(sm)) return true;
      return !fs.readdirSync(sm).some(d =>
        fs.existsSync(path.join(sm, d, 'node-map.json'))
      );
    },
    fix: 'Run: systemix sync --build-node-map'
  },
  {
    id: 'hardcoded-figma-url',
    description: 'Hardcoded Figma file URL — should use project-context.json',
    severity: 'warning',
    estimatedWastePerRun: null,
    match: (content) =>
      /figma\.com\/(?:design|file)\/[A-Za-z0-9]{20,}/.test(content),
    fix: 'Use fileKey from .systemix/project-context.json instead'
  }
];
