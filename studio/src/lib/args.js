"use strict";

/**
 * parseArgs(argv, { values: ["--root", ...], bools: ["--json", ...] })
 *   → { positional, values: { "--root": ["a"] }, bools: Set, unknown: [], errors: [], help }
 * `--flag=value` and `--flag value` both work; `-` alone is a positional (stdin).
 * Every command also accepts --root <dir>, --json and --help.
 */
function parseArgs(argv = [], { values = [], bools = [] } = {}) {
  const V = new Set(["--root", ...values]);
  const B = new Set(["--json", "--help", "-h", ...bools]);
  const out = { positional: [], values: {}, bools: new Set(), unknown: [], errors: [], help: false };
  for (let i = 0; i < argv.length; i++) {
    let a = argv[i];
    let inline = null;
    if (a.startsWith("--") && a.includes("=")) {
      inline = a.slice(a.indexOf("=") + 1);
      a = a.slice(0, a.indexOf("="));
    }
    if (V.has(a)) {
      const v = inline ?? argv[++i];
      if (v === undefined || (inline === null && v.startsWith("--"))) out.errors.push(`${a} needs a value`);
      else (out.values[a] = out.values[a] || []).push(v);
    } else if (B.has(a)) {
      if (a === "--help" || a === "-h") out.help = true;
      else out.bools.add(a);
    } else if (a.startsWith("-") && a !== "-") out.unknown.push(a);
    else out.positional.push(a);
  }
  return out;
}

/** The last value given for a flag, or the fallback. */
const last = (parsed, flag, fallback = undefined) => (parsed.values[flag] || []).slice(-1)[0] ?? fallback;

/** Problems a command should refuse before doing anything. */
const problems = (parsed) => [...parsed.errors, ...parsed.unknown.map((f) => `unknown flag ${f}`)];

module.exports = { parseArgs, last, problems };
