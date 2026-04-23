const fs = require('fs');
const path = require('path');
const patterns = require('../profiler/patterns');

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.next']);

// Walk a directory recursively, yielding absolute file paths.
function* walkDir(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (_) {
    return;
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        yield* walkDir(path.join(dir, entry.name));
      }
    } else if (entry.isFile()) {
      yield path.join(dir, entry.name);
    }
  }
}

// Return the 1-based line number of the first occurrence of a pattern in content.
function findLineNumber(content, testFn) {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (testFn(lines[i])) {
      return i + 1;
    }
  }
  return null;
}

// Attempt to find a representative line number for a per-file pattern hit.
function guessLine(patternId, content) {
  const heuristics = {
    'unscoped-get-file-data': (line) => line.includes('get_file_data'),
    'no-budget-cap': (line) =>
      line.includes('systemix') || line.includes('figma'),
    'hardcoded-figma-url': (line) =>
      /figma\.com\/(?:design|file)\/[A-Za-z0-9]{20,}/.test(line)
  };
  const fn = heuristics[patternId];
  if (!fn) return null;
  return findLineNumber(content, fn);
}

async function tokenProfile(args) {
  const targetArg = args[0] || './';
  const targetDir = path.resolve(process.cwd(), targetArg);

  if (!fs.existsSync(targetDir) || !fs.statSync(targetDir).isDirectory()) {
    console.error(`\n  Error: directory not found: ${targetDir}\n`);
    process.exit(1);
  }

  const hits = []; // { patternId, description, severity, waste, fix, filePath, line }

  // Per-file patterns
  const filePatterns = patterns.filter(p => typeof p.match === 'function');
  // Global patterns
  const globalPatterns = patterns.filter(p => typeof p.matchGlobal === 'function');

  for (const filePath of walkDir(targetDir)) {
    let content;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch (_) {
      continue; // skip unreadable files (binaries, etc.)
    }

    for (const pattern of filePatterns) {
      let matched;
      try {
        matched = pattern.match(content, filePath);
      } catch (_) {
        continue;
      }
      if (matched) {
        const line = guessLine(pattern.id, content);
        hits.push({
          patternId: pattern.id,
          description: pattern.description,
          severity: pattern.severity,
          waste: pattern.estimatedWastePerRun,
          fix: pattern.fix,
          filePath,
          line
        });
      }
    }
  }

  // Global patterns — run once against the target directory as project root
  for (const pattern of globalPatterns) {
    let matched;
    try {
      matched = pattern.matchGlobal(targetDir);
    } catch (_) {
      continue;
    }
    if (matched) {
      hits.push({
        patternId: pattern.id,
        description: pattern.description,
        severity: pattern.severity,
        waste: pattern.estimatedWastePerRun,
        fix: pattern.fix,
        filePath: null,
        line: null
      });
    }
  }

  // Build a set of global pattern IDs that did NOT fire (for "ok" messages)
  const firedGlobalIds = new Set(
    hits
      .filter(h => h.filePath === null)
      .map(h => h.patternId)
  );

  const okMessages = [];
  for (const pattern of globalPatterns) {
    if (!firedGlobalIds.has(pattern.id)) {
      const label =
        pattern.id === 'missing-cache-config'
          ? 'Cache configured correctly'
          : 'Node map present';
      okMessages.push(label);
    }
  }

  // --- Print report ---
  const relTarget = path.relative(process.cwd(), targetDir) || '.';
  console.log(`\nToken Profile Report — ${relTarget}`);
  console.log('─'.repeat(40));

  if (hits.length === 0) {
    console.log('\n  No issues found.\n');
  } else {
    for (const hit of hits) {
      const icon = hit.severity === 'error' ? '✗ ' : '⚠  ';
      let location = '';
      if (hit.filePath) {
        const rel = path.relative(process.cwd(), hit.filePath);
        location = hit.line ? `${rel}:${hit.line}` : rel;
      }
      const label = location
        ? `${location} — ${hit.description}`
        : hit.description;
      console.log(`${icon} ${label}`);
      if (hit.waste) {
        const k = (hit.waste / 1000).toFixed(0);
        console.log(`   Estimated waste: ~${k}k tokens/run`);
      }
      console.log(`   Fix: ${hit.fix}`);
    }
  }

  for (const msg of okMessages) {
    console.log(`✓  ${msg}`);
  }

  // Summary line
  const errors = hits.filter(h => h.severity === 'error').length;
  const warnings = hits.filter(h => h.severity === 'warning').length;

  // Estimate weekly savings (5 runs/day * 7 days)
  const totalWastePerRun = hits.reduce((sum, h) => sum + (h.waste || 0), 0);
  const weeklySavings = totalWastePerRun * 5 * 7;

  console.log('─'.repeat(40));

  const parts = [];
  if (errors > 0) parts.push(`${errors} error${errors !== 1 ? 's' : ''}`);
  if (warnings > 0) parts.push(`${warnings} warning${warnings !== 1 ? 's' : ''}`);
  const summary = parts.length > 0 ? parts.join(', ') : 'No issues';

  if (weeklySavings > 0) {
    const savingsLabel =
      weeklySavings >= 1000000
        ? `~${(weeklySavings / 1000000).toFixed(1)}M`
        : `~${Math.round(weeklySavings / 1000)}k`;
    console.log(`${summary} · Est. weekly savings if fixed: ${savingsLabel} tokens`);
  } else {
    console.log(summary);
  }

  console.log('');

  process.exit(errors > 0 ? 1 : 0);
}

module.exports = { tokenProfile };
