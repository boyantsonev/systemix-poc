/**
 * dispatch.test.js — bin/cli.js hands every command to the right module, export and
 * arguments.
 *
 * The bin loads each command lazily inside its own `case`, which makes the dispatch
 * table the one place a typo hides: a wrong destructured name, a lost alias (`ls`), an
 * argument list sliced by mistake. Nothing else would notice — each command's own tests
 * call the command directly. So this spawns the real bin with a hook (stub-commands.js)
 * that turns every `require("../src/...")` into a recorder, and checks, for every case
 * label in the bin:
 *   - exactly that one module was required (laziness), and
 *   - the export the case destructured was called, once, with exactly the arguments
 *     the table below says — and that export exists and is a function in the real module.
 * The table is explicit and must list every label the bin has (and no label it lacks),
 * so adding or dropping a command, or an alias, fails here until the table is updated.
 */

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const PKG = path.resolve(__dirname, "../../..");
const BIN = path.join(PKG, "bin", "cli.js");
const HOOK = path.join(__dirname, "stub-commands.js");
const UNDEFINED = "__undefined__";

let scratch;
let seq = 0;
beforeAll(() => {
  scratch = fs.mkdtempSync(path.join(os.tmpdir(), "sx-dispatch-"));
});
afterAll(() => fs.rmSync(scratch, { recursive: true, force: true }));

/** Run the real bin with every command stubbed; returns the exit code, output and what was dispatched. */
function dispatch(argv) {
  const record = path.join(scratch, `record-${seq++}.json`);
  const r = spawnSync(process.execPath, ["-r", HOOK, BIN, ...argv], {
    cwd: scratch,
    encoding: "utf8",
    timeout: 30000,
    env: { PATH: process.env.PATH, HOME: scratch, NO_COLOR: "1", SX_BIN: BIN, SX_DISPATCH_OUT: record },
  });
  const { required, calls } = JSON.parse(fs.readFileSync(record, "utf8"));
  return { code: r.status, out: r.stdout, err: r.stderr, required, calls };
}

// Arguments that would show any slicing, reordering or dropping on the way through.
const SUB_ARGS = ["sub", "--flag", "value", "two words"];

// [label, module under src/, exported function] — every command that receives `args` untouched
const PASS_THROUGH = [
  ["audit", "commands/audit", "audit"],
  ["design", "commands/design", "design"],
  ["config", "commands/config", "config"],
  ["sync", "commands/sync", "sync"],
  ["token-profile", "commands/token-profile", "tokenProfile"],
  ["schedule", "commands/schedule", "schedule"],
  ["token-guard", "commands/token-guard", "tokenGuard"],
  ["update", "commands/update", "update"],
  ["tokens", "commands/tokens", "tokens"],
  ["watch", "commands/watch", "watch"],
  ["social-signal", "commands/social-signal", "socialSignal"],
  ["evidence", "commands/evidence", "evidence"],
  ["experiment", "commands/experiment", "experiment"],
  ["goal", "commands/goal", "goal"],
  ["drift", "commands/drift", "drift"],
  ["app", "commands/app", "app"],
  ["docs", "commands/docs", "docs"],
  ["loop", "commands/loop", "loop"],
  ["propose", "commands/propose", "propose"],
  ["skills", "commands/skills", "skills"],
  ["mcp", "commands/mcp", "mcp"],
];

// commands that shape their arguments, and the aliases; each row is one argv and what must be called
const SHAPED = [
  { name: "init with no flag", argv: ["init"], module: "init", fn: "init", args: [{ reconfigure: false, defaults: false, globalMcp: false, forceMcp: false }] },
  // each flag alone, so a swapped pair cannot hide behind a row that sets both
  { name: "init --reconfigure", argv: ["init", "--reconfigure"], module: "init", fn: "init", args: [{ reconfigure: true, defaults: false, globalMcp: false, forceMcp: false }] },
  { name: "init --defaults", argv: ["init", "--defaults"], module: "init", fn: "init", args: [{ reconfigure: false, defaults: true, globalMcp: false, forceMcp: false }] },
  { name: "init --global-mcp", argv: ["init", "--global-mcp"], module: "init", fn: "init", args: [{ reconfigure: false, defaults: false, globalMcp: true, forceMcp: false }] },
  { name: "init --force-mcp", argv: ["init", "--force-mcp"], module: "init", fn: "init", args: [{ reconfigure: false, defaults: false, globalMcp: false, forceMcp: true }] },
  { name: "init with every flag", argv: ["init", "--force-mcp", "--defaults", "--global-mcp", "--reconfigure"], module: "init", fn: "init", args: [{ reconfigure: true, defaults: true, globalMcp: true, forceMcp: true }] },
  { name: "add <name> passes the name only", argv: ["add", "design-system", "extra"], module: "add", fn: "add", args: ["design-system"] },
  { name: "add with no name", argv: ["add"], module: "add", fn: "add", args: [UNDEFINED] },
  { name: "workflow add <name> is add <name>", argv: ["workflow", "add", "design-system", "extra"], module: "add", fn: "add", args: ["design-system"] },
  { name: "workflow with no sub lists", argv: ["workflow"], module: "add", fn: "add", args: [UNDEFINED] },
  { name: "workflow list lists", argv: ["workflow", "list"], module: "add", fn: "add", args: [UNDEFINED] },
  { name: "list", argv: ["list"], module: "list", fn: "list", args: [] },
  { name: "ls is an alias of list", argv: ["ls"], module: "list", fn: "list", args: [] },
  { name: "doctor", argv: ["doctor"], module: "doctor", fn: "doctor", args: [] },
];

// [title, argv]
const HELP_ROWS = [["help", ["help"]], ["--help", ["--help"]], ["-h", ["-h"]], ["no command", []]];

describe("every case label of the bin is in the table, and the table has no other label", () => {
  const source = fs.readFileSync(BIN, "utf8");
  const inBin = [...source.matchAll(/^\s*case (?:"([^"]+)"|(undefined)):/gm)].map((m) => m[1] ?? "undefined").sort();

  test("labels in bin/cli.js === labels this test exercises", () => {
    const exercised = [
      ...PASS_THROUGH.map(([label]) => label),
      ...SHAPED.map((s) => s.argv[0]),
      ...HELP_ROWS.map(([, argv]) => argv[0] ?? "undefined"),
    ];
    expect([...new Set(exercised)].sort()).toEqual(inBin);
  });
});

describe("a command with plain pass-through gets exactly the arguments after its name", () => {
  test.each(PASS_THROUGH)("%s", (label, module, fn) => {
    const r = dispatch([label, ...SUB_ARGS]);
    expect(r.err).toBe("");
    expect(r.code).toBe(0);
    expect(r.required).toEqual([`../src/${module}`]);
    expect(r.calls).toEqual([{ module: `../src/${module}`, fn, args: [SUB_ARGS] }]);
    // no output of its own: the bin prints nothing for a command it dispatched
    expect(r.out).toBe("");
  });

  test.each(PASS_THROUGH)("%s with no arguments passes an empty list, not nothing", (label, module, fn) => {
    const r = dispatch([label]);
    expect(r.calls).toEqual([{ module: `../src/${module}`, fn, args: [[]] }]);
  });
});

describe("commands that shape their arguments, and the aliases", () => {
  test.each(SHAPED.map((s) => [s.name, s]))("%s", (_, s) => {
    const r = dispatch(s.argv);
    expect(r.err).toBe("");
    expect(r.code).toBe(0);
    expect(r.required).toEqual([`../src/${s.module}`]);
    expect(r.calls).toEqual([{ module: `../src/${s.module}`, fn: s.fn, args: s.args }]);
  });

  test("an unknown workflow subcommand is refused and calls nothing but the require", () => {
    const r = dispatch(["workflow", "nope"]);
    expect(r.code).toBe(1);
    expect(r.err).toContain("Unknown workflow subcommand: nope");
    expect(r.out).toContain("Usage: npx @getsystemix/cli workflow add <name>");
    expect(r.calls).toEqual([]);
  });
});

describe("help and unknown commands call no command at all", () => {
  test.each(HELP_ROWS)("%s prints the help and succeeds", (_, argv) => {
    const r = dispatch(argv);
    expect(r.code).toBe(0);
    expect(r.out).toContain("systemix — agentic design system ops for Claude Code");
    expect(r.required).toEqual([]);
    expect(r.calls).toEqual([]);
  });

  test("an unknown command exits 1 with the help", () => {
    const r = dispatch(["no-such-command", "x"]);
    expect(r.code).toBe(1);
    expect(r.err).toContain("Unknown command: no-such-command");
    expect(r.out).toContain("Usage:");
    expect(r.required).toEqual([]);
    expect(r.calls).toEqual([]);
  });
});

describe("what the bin calls exists in the real modules", () => {
  const wanted = [
    ...PASS_THROUGH.map(([, module, fn]) => [module, fn]),
    ...SHAPED.map((s) => [s.module, s.fn]),
  ];
  const unique = [...new Map(wanted.map(([m, f]) => [`${m}#${f}`, [m, f]])).values()];

  // The stubs answer to any name, so a case that destructured `tokenz` is recorded as fn
  // "tokenz" and fails the rows above; this proves the name the rows expect is real.
  test.each(unique)("src/%s exports %s as a function", (module, fn) => {
    expect(typeof require(path.join(PKG, "src", module))[fn]).toBe("function");
  });
});
