"use strict";

const fs = require("fs");
const path = require("path");
const { cli, tmpRepo, exists } = require("./helpers/cli");
const { materialize } = require("./helpers/fixtures");

const LOG = "studio/.state/runs.jsonl";
const lines = (root) => (exists(root, LOG) ? fs.readFileSync(path.join(root, LOG), "utf8").split("\n").filter(Boolean) : []);
const at = (iso) => new Date(iso);

/** A row as a guide builds it: everything but run, at and studio_version. */
const row = (over = {}) => ({
  kind: "run",
  command: "check",
  args: "--changed",
  surface: "product",
  depth: null,
  goal: null,
  result: "pass",
  blocks: 0,
  flags: 0,
  false_positives: [],
  sources: ["studio/rules.md"],
  files_written: [],
  duration_s: null,
  rating: "none",
  note: "",
  ...over,
});

const log = (root, r, now) => cli(["runs", "log", "--json", "-"], { root, stdin: JSON.stringify(r), now });

describe("runs log", () => {
  test("fills run, at and studio_version and appends exactly one valid line", async () => {
    const root = tmpRepo();
    const r = await log(root, row(), at("2026-01-15T10:00:00Z"));
    expect(r.code).toBe(0);
    expect(r.json.ok).toBe(true);
    expect(r.json.run).toMatch(/^r-20260115-100000-[0-9a-f]{4}$/);
    const stored = lines(root).map((l) => JSON.parse(l));
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ run: r.json.run, at: "2026-01-15T10:00:00Z", studio_version: require("../package.json").version, command: "check" });
    expect(Object.keys(stored[0])[0]).toBe("run");
    const again = await cli(["runs", "log", "--row", JSON.stringify(row({ command: "brief" })), "--json"], { root, now: at("2026-01-15T10:00:00Z") });
    expect(again.code).toBe(0);
    expect(again.json.run).not.toBe(r.json.run);
    expect(lines(root)).toHaveLength(2);
  });

  test("the same input gives the same run id (seeded from the clock, no randomness)", async () => {
    const a = await log(tmpRepo(), row(), at("2026-01-15T10:00:00Z"));
    const b = await log(tmpRepo(), row(), at("2026-01-15T10:00:00Z"));
    expect(a.json.run).toBe(b.json.run);
  });

  test.each([
    ["an unknown field", row({ colour: "red" }), /unknown field "colour"/],
    ["a field the log fills", { ...row(), run: "r-20260101-000000-abcd" }, /run: filled by the log/],
    ["a missing field", (({ result, ...rest }) => rest)(row()), /result: missing/],
    ["a bad result", row({ result: "great" }), /^result: must be/],
    ["a bad kind", row({ kind: "chat" }), /^kind: must be/],
    ["a negative count", row({ blocks: -1 }), /^blocks:/],
    ["a fractional count", row({ flags: 1.5 }), /^flags:/],
    ["a bad goal", row({ goal: "goal-1" }), /^goal:/],
    ["a malformed false positive", row({ false_positives: [{ rule: "T1" }] }), /false_positives\[0\]/],
    ["sources not strings", row({ sources: [1] }), /^sources:/],
    ["a note over 300 chars", row({ note: "x".repeat(301) }), /^note:/],
    ["a rating row without ref", row({ kind: "rating" }), /ref: a rating row/],
    ["ref on a run row", row({ ref: "r-20260101-000000-abcd" }), /ref: only a rating row/],
  ])("rejects %s and appends nothing", async (_, bad, message) => {
    const root = tmpRepo();
    const r = await log(root, bad);
    expect(r.code).toBe(1);
    expect(r.json.ok).toBe(false);
    expect(r.json.problems.some((p) => message.test(p))).toBe(true);
    expect(lines(root)).toHaveLength(0);
  });

  test("rejects text that is not one JSON object and appends nothing", async () => {
    const root = tmpRepo();
    for (const stdin of ["{not json", "[1,2]", "42"]) {
      const r = await cli(["runs", "log", "--json", "-"], { root, stdin });
      expect(r.code).toBe(1);
      expect(r.json.ok).toBe(false);
    }
    expect(lines(root)).toHaveLength(0);
  });

  test("with no row given it is a usage error", async () => {
    expect((await cli(["runs", "log", "--json"], { root: tmpRepo() })).code).toBe(2);
  });
});

describe("privacy lint", () => {
  test.each([
    ["note", { note: "ping ada@example.com about this" }, "an email address"],
    ["args", { args: "--token ghp_abcdefghijklmnopqrstuvwxyz0123456789" }, "a GitHub token"],
    ["false_positives[0].why", { false_positives: [{ rule: "T1", where: "src/a.css", why: "see https://example.com/page?id=42" }] }, "a URL with a query string"],
    ["sources[1]", { sources: ["studio/rules.md", "/Users/ada/notes/plan.md"] }, "an absolute home path"],
    ["note", { note: "the home is /home/grace/work" }, "an absolute home path"],
    ["note", { note: "key sk-live_0123456789abcdef" }, "a secret key"],
    ["note", { note: "slack xoxb-1234567890-abcdef" }, "a chat token"],
    ["note", { note: "hash 0123456789abcdef0123456789abcdef" }, "a long hex string"],
    ["args", { args: "QWxhZGRpbjpvcGVuIHNlc2FtZQ9aGVsbG8gd29ybGQ1234" }, "a long encoded string"],
  ])("refuses %s and names the field, never the value", async (field, over, what) => {
    const root = tmpRepo();
    const bad = row(over);
    const r = await log(root, bad);
    expect(r.code).toBe(1);
    const p = r.json.problems.join("\n");
    expect(p).toContain(`${field}: looks like ${what}`);
    const values = [bad.note, bad.args, ...bad.sources, ...bad.false_positives.map((f) => f.why)].filter((v) => v && v.length > 3);
    for (const v of values) expect(r.stdout + r.stderr).not.toContain(v);
    for (const secret of ["ada@example.com", "ghp_", "?id=42", "/Users/ada", "/home/grace", "sk-live", "xoxb-"]) expect(r.stdout + r.stderr).not.toContain(secret);
    expect(lines(root)).toHaveLength(0);
  });

  test("ordinary words, repo paths and plain URLs pass", async () => {
    const root = tmpRepo();
    const r = await log(root, row({ note: "it missed the claims rows for email, see https://example.com/docs", sources: ["studio/goals/G-001-notebook-invite/decisions.md", "src/features/checkout/CheckoutSummary.tsx"], args: "src/features/pricing --surface product" }));
    expect(r.code).toBe(0);
  });

  test("every row of F6 is valid and privacy-clean", async () => {
    const runlog = require("../src/lib/runlog");
    const root = materialize("F6-runlog");
    const r = runlog.lint(root);
    expect(r.problems).toEqual([]);
    expect(r.rows).toBe(40);
  });
});

describe("runs rate", () => {
  test("rates the last run and the rating merges onto it in list", async () => {
    const root = tmpRepo();
    await log(root, row({ command: "brief", surface: "email" }), at("2026-01-15T09:00:00Z"));
    const second = await log(root, row(), at("2026-01-15T09:30:00Z"));
    const r = await cli(["runs", "rate", "last", "down", "it missed the button contrast", "--json"], { root, now: at("2026-01-15T09:31:00Z") });
    expect(r.code).toBe(0);
    expect(r.json).toMatchObject({ ok: true, ref: second.json.run, rating: "down" });
    const stored = lines(root).map((l) => JSON.parse(l));
    expect(stored[2]).toMatchObject({ kind: "rating", ref: second.json.run, rating: "down", note: "it missed the button contrast", command: "check" });
    const list = await cli(["runs", "list", "--json"], { root });
    expect(list.json.rows).toHaveLength(2);
    expect(list.json.rows[1]).toMatchObject({ run: second.json.run, rating: "down", rating_note: "it missed the button contrast" });
    expect(list.json.rows[0].rating).toBe("none");
  });

  test("rates a run by id; an unknown id or a bad rating is refused", async () => {
    const root = tmpRepo();
    const first = await log(root, row(), at("2026-01-15T09:00:00Z"));
    await log(root, row(), at("2026-01-15T09:30:00Z"));
    expect((await cli(["runs", "rate", first.json.run, "up", "--json"], { root })).json.ref).toBe(first.json.run);
    expect((await cli(["runs", "rate", "r-20990101-000000-abcd", "up", "--json"], { root })).code).toBe(1);
    expect((await cli(["runs", "rate", "last", "meh"], { root })).code).toBe(2);
    expect((await cli(["runs", "rate", "last", "up", "--json"], { root: tmpRepo() })).json.error).toBe("no-such-run");
  });

  test("a note that fails the privacy lint is refused", async () => {
    const root = tmpRepo();
    await log(root, row());
    const r = await cli(["runs", "rate", "last", "down", "email me at ada@example.com", "--json"], { root });
    expect(r.code).toBe(1);
    expect(r.json.problems[0]).toMatch(/^note: looks like an email address/);
    expect(lines(root)).toHaveLength(1);
  });
});

describe("runs list", () => {
  test("F6: ratings merged, rating rows folded in, filters by date, command and kind", async () => {
    const root = materialize("F6-runlog");
    const all = await cli(["runs", "list", "--json"], { root });
    expect(all.json.rows).toHaveLength(37);
    const briefs = await cli(["runs", "list", "--command", "brief", "--json"], { root });
    expect(briefs.json.rows).toHaveLength(6);
    expect(briefs.json.rows.filter((r) => r.rating === "down").map((r) => r.run)).toEqual(["r-20260105-110000-6d13", "r-20260107-112000-2dfd", "r-20260112-093000-e249"]);
    const since = await cli(["runs", "list", "--since", "2026-01-14", "--json"], { root });
    expect(since.json.rows.map((r) => r.at.slice(0, 10))).toEqual(Array(5).fill("2026-01-14"));
    const ratings = await cli(["runs", "list", "--kind", "rating", "--json"], { root });
    expect(ratings.json.rows).toHaveLength(3);
    expect((await cli(["runs", "list", "--since", "Jan 1"], { root })).code).toBe(2);
  });
});

describe("runs should-ask over a simulated day", () => {
  const ask = async (root, iso) => (await cli(["runs", "should-ask", "--json"], { root, now: at(iso) })).json;
  const skip = async (root, ref, iso) => log(root, row({ kind: "rating", ref, rating: "none" }), at(iso));

  test("once a day for normal runs, straight away after a fail, an error or a false positive", async () => {
    const root = tmpRepo();
    expect(await ask(root, "2026-01-15T08:00:00Z")).toEqual({ ask: false, why: "no run logged yet" });

    // 09:00 a normal run: the first ask today; the person skips it
    const r1 = await log(root, row(), at("2026-01-15T09:00:00Z"));
    expect((await ask(root, "2026-01-15T09:00:05Z")).ask).toBe(true);
    await skip(root, r1.json.run, "2026-01-15T09:00:30Z");
    expect((await ask(root, "2026-01-15T09:00:40Z")).ask).toBe(false);

    // 10:00 another normal run: already asked today
    await log(root, row(), at("2026-01-15T10:00:00Z"));
    expect(await ask(root, "2026-01-15T10:00:05Z")).toMatchObject({ ask: false, why: "already asked today" });

    // 11:00 a failing check: ask, it has no rating yet
    await log(root, row({ result: "fail", blocks: 1 }), at("2026-01-15T11:00:00Z"));
    expect(await ask(root, "2026-01-15T11:00:05Z")).toMatchObject({ ask: true, why: expect.stringMatching(/ended in fail/) });
    await cli(["runs", "rate", "last", "down", "the block was right but slow"], { root, now: at("2026-01-15T11:01:00Z") });
    expect((await ask(root, "2026-01-15T11:01:05Z")).ask).toBe(false);

    // 12:00 a run that dropped a false positive: ask
    const r4 = await log(root, row({ result: "pass-with-flags", flags: 1, false_positives: [{ rule: "T1", where: "src/a.css", why: "a url fragment" }] }), at("2026-01-15T12:00:00Z"));
    expect(await ask(root, "2026-01-15T12:00:05Z")).toMatchObject({ ask: true, why: expect.stringMatching(/false positive/) });
    await skip(root, r4.json.run, "2026-01-15T12:00:30Z");

    // 13:00 an error: ask
    await log(root, row({ command: "setup", result: "error", note: "rules eval failed" }), at("2026-01-15T13:00:00Z"));
    expect((await ask(root, "2026-01-15T13:00:05Z")).ask).toBe(true);

    // 14:00 a normal run: never about the older error; already asked today
    await log(root, row(), at("2026-01-15T14:00:00Z"));
    expect((await ask(root, "2026-01-15T14:00:05Z")).ask).toBe(false);

    // the next day: the first normal run asks again
    await log(root, row(), at("2026-01-16T09:00:00Z"));
    expect(await ask(root, "2026-01-16T09:00:05Z")).toEqual({ ask: true, why: "the first ask today" });
  });

  test("an ask-eligible run earlier today that went unanswered still counts as today's ask", async () => {
    const root = tmpRepo();
    await log(root, row({ result: "error", command: "setup" }), at("2026-01-15T09:00:00Z"));
    expect((await ask(root, "2026-01-15T09:00:05Z")).ask).toBe(true);
    await log(root, row(), at("2026-01-15T10:00:00Z"));
    expect(await ask(root, "2026-01-15T10:00:05Z")).toMatchObject({ ask: false, why: expect.stringMatching(/already asked today/) });
  });

  test("the output is stable for the same log and clock", async () => {
    const root = materialize("F6-runlog");
    const a = await cli(["runs", "should-ask", "--json"], { root });
    const b = await cli(["runs", "should-ask", "--json"], { root });
    expect(a.stdout).toBe(b.stdout);
    expect(a.json).toEqual({ ask: true, why: "the first ask today" });
  });
});

describe("runs rate skip", () => {
  test("a skip is a rating row with rating none, and should-ask stops asking about that run", async () => {
    const { cli: run, tmpRepo: repo } = require("./helpers/cli");
    const root = repo();
    const row = { kind: "run", command: "check", args: "src", surface: null, depth: null, goal: null, result: "fail", blocks: 1, flags: 0, false_positives: [], sources: [], files_written: [], duration_s: 2, rating: "none", note: "" };
    expect((await run(["runs", "log", "--json", "-"], { root, stdin: JSON.stringify(row) })).code).toBe(0);
    expect((await run(["runs", "should-ask", "--json"], { root })).json.ask).toBe(true);
    const r = await run(["runs", "rate", "last", "skip", "--json"], { root });
    expect(r.code).toBe(0);
    expect(r.json.rating).toBe("none");
    expect((await run(["runs", "should-ask", "--json"], { root })).json.ask).toBe(false);
  });
});
