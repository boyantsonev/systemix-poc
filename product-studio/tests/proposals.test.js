"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { cli, tmpRepo, read } = require("./helpers/cli");
const { materialize } = require("./helpers/fixtures");
const { frontmatter } = require("../src/lib/md");

const DIR = "studio/proposals";
const GIT_ENV = { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.com", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@example.com" };
const git = (root, ...a) => execFileSync("git", a, { cwd: root, encoding: "utf8", env: GIT_ENV, stdio: ["ignore", "pipe", "ignore"] });

/** A proposal file's text. */
function proposal({ id = "P-001", title = "T1 misfires on url fragments", target = "client", kind = "rule-fix", evidence = ["r-20260106-090500-53d7"], status = "New", change = null, extra = "" } = {}) {
  const body = change ?? (target === "client" ? "```diff\n--- a/studio/DESIGN.md\n+++ b/studio/DESIGN.md\n@@ -1 +1 @@\n-# x\n+# y\n```" : "Narrow the brief's surface filter so an app ask lists app rules only.");
  return `---
id: ${id}
title: ${title}
target: ${target}
kind: ${kind}
evidence: [${evidence.join(", ")}]
status: ${status}
decided_by: null
decided_at: null
evals_before: null
evals_after: null
created: 2026-01-15
${extra}---
## Problem
The rule was dropped as a false positive 4 times in 4 runs.

## Change
${body}

## How it will be checked
rules eval passes and the share-link sample no longer trips T1.
`;
}

const write = (root, name, text) => {
  fs.mkdirSync(path.join(root, DIR), { recursive: true });
  fs.writeFileSync(path.join(root, DIR, name), text);
};
const data = (root, name) => frontmatter(read(root, `${DIR}/${name}`)).data;

describe("proposals lint, list and next-id", () => {
  test("a well-formed client and plugin proposal pass; list and next-id read them", async () => {
    const root = materialize("F6-runlog");
    write(root, "P-001-t1-url-fragments.md", proposal());
    write(root, "P-003-brief-surface-filter.md", proposal({ id: "P-003", title: "Brief lists rules for the wrong surface", target: "plugin", kind: "wording", evidence: ["r-20260105-110000-6d13", "r-20260107-112000-2dfd"] }));
    write(root, "README.md", "# not a proposal\n");
    const lint = await cli(["proposals", "lint", "--json"], { root });
    expect(lint.json).toEqual({ ok: true, proposals: 2, problems: [] });
    expect(lint.code).toBe(0);
    const list = await cli(["proposals", "list", "--json"], { root });
    expect(list.json.proposals).toEqual([
      { id: "P-001", title: "T1 misfires on url fragments", target: "client", kind: "rule-fix", status: "New", evidence: ["r-20260106-090500-53d7"] },
      { id: "P-003", title: "Brief lists rules for the wrong surface", target: "plugin", kind: "wording", status: "New", evidence: ["r-20260105-110000-6d13", "r-20260107-112000-2dfd"] },
    ]);
    expect((await cli(["proposals", "list", "--status", "Shipped", "--json"], { root })).json.proposals).toEqual([]);
    expect((await cli(["proposals", "next-id", "--json"], { root })).json).toEqual({ id: "P-004" });
    expect((await cli(["proposals", "next-id", "--json"], { root: tmpRepo() })).json).toEqual({ id: "P-001" });
  });

  test.each([
    ["no evidence", proposal({ evidence: [] }), /evidence must list at least one/],
    ["evidence not in the run log", proposal({ evidence: ["r-20990101-000000-abcd"] }), /not in studio\/\.state\/runs\.jsonl/],
    ["a bad target", proposal({ target: "repo" }), /target must be/],
    ["a bad kind", proposal({ kind: "vibes" }), /kind must be/],
    ["a bad status", proposal({ status: "Done" }), /status must be/],
    ["a client proposal without a diff", proposal({ change: "Change the pattern." }), /fenced ```diff/],
    ["a plugin proposal with a diff", proposal({ target: "plugin", kind: "wording", change: "```diff\n--- a/x\n+++ b/x\n```" }), /describes the change in words/],
    ["an unknown key", proposal({ extra: "owner: someone\n" }), /unknown frontmatter key "owner"/],
    ["an Approved proposal without who ruled", proposal({ status: "Approved" }), /decided_by/],
    ["a missing section", proposal().replace("## How it will be checked", "## Notes"), /How it will be checked/],
  ])("lint refuses %s", async (_, text, message) => {
    const root = materialize("F6-runlog");
    write(root, "P-001-t1-url-fragments.md", text);
    const r = await cli(["proposals", "lint", "--json"], { root });
    expect(r.code).toBe(1);
    expect(r.json.problems.map((p) => p.message).join("\n")).toMatch(message);
    expect(r.json.problems[0].file).toBe("studio/proposals/P-001-t1-url-fragments.md");
  });

  test("lint refuses a file name that does not match the id, and a duplicate id", async () => {
    const root = tmpRepo();
    write(root, "P-002-wrong.md", proposal());
    write(root, "P-001-right.md", proposal());
    write(root, "P-001-again.md", proposal());
    const r = await cli(["proposals", "lint", "--json"], { root });
    const messages = r.json.problems.map((p) => p.message).join("\n");
    expect(messages).toMatch(/does not match the file name/);
    expect(messages).toMatch(/also used by/);
  });
});

describe("proposals decide", () => {
  test("a name outside the roster is refused and nothing changes", async () => {
    const root = materialize("F6-runlog");
    write(root, "P-001-t1-url-fragments.md", proposal());
    const before = read(root, `${DIR}/P-001-t1-url-fragments.md`);
    const r = await cli(["proposals", "decide", "P-001", "approve", "--by", "Charles Babbage", "--json"], { root });
    expect(r.code).toBe(1);
    expect(r.json).toMatchObject({ ok: false, error: "not-a-holder", by: "Charles Babbage", may: ["Ada Lovelace"] });
    expect(read(root, `${DIR}/P-001-t1-url-fragments.md`)).toBe(before);
  });

  test("a roster holder approves a client proposal: who and when are recorded", async () => {
    const root = materialize("F6-runlog");
    write(root, "P-001-t1-url-fragments.md", proposal());
    const r = await cli(["proposals", "decide", "P-001", "approve", "--by", "ada lovelace", "--json"], { root });
    expect(r.code).toBe(0);
    expect(r.json).toMatchObject({ ok: true, id: "P-001", status: "Approved", decided_by: "Ada Lovelace", decided_at: "2026-01-15", target: "client" });
    expect(r.json.draft).toBeUndefined();
    expect(data(root, "P-001-t1-url-fragments.md")).toMatchObject({ status: "Approved", decided_by: "Ada Lovelace", decided_at: "2026-01-15", evals_before: null });
    expect((await cli(["proposals", "lint", "--json"], { root })).json.ok).toBe(true);
    const again = await cli(["proposals", "decide", "P-001", "decline", "--by", "Ada Lovelace", "--why", "changed my mind", "--json"], { root });
    expect(again.json.error).toBe("already-decided");
  });

  test("approving a plugin proposal prints a scrubbed draft (counts and ids, no paths, no notes) and edits nothing else", async () => {
    const root = materialize("F6-runlog", { variant: "vendored" });
    const evidence = ["r-20260105-110000-6d13", "r-20260107-112000-2dfd", "r-20260112-093000-e249"];
    write(root, "P-002-brief-surface-filter.md", proposal({ id: "P-002", title: "Brief in src/features/pricing/PricingCard.tsx lists email rules", target: "plugin", kind: "wording", evidence }));
    const pluginDir = path.join(root, ".claude/plugins/product-studio");
    const snapshot = () => execFileSync("git", ["status", "--porcelain", "--", ".claude"], { cwd: root, encoding: "utf8" });
    const r = await cli(["proposals", "decide", "P-002", "approve", "--by", "Ada Lovelace", "--json"], { root });
    expect(r.code).toBe(0);
    expect(r.json.status).toBe("Approved");
    const { title, body } = r.json.draft;
    expect(title).toBe("[wording] Brief in [path] lists email rules");
    for (const id of evidence) expect(body).toContain(id);
    expect(body).toContain("3 runs");
    expect(body).toContain("by rating: down 3");
    expect(body).toMatch(/admin eval: \d+ of \d+ checks pass/);
    expect(title + body).not.toMatch(/[\w.-]+\/[\w.-]+/);
    for (const note of ["it listed rules for email", "too long", "missed the claims rows"]) expect(body).not.toContain(note);
    expect(body).not.toContain("dropped as a false positive 4 times");
    expect(r.json.draftProblems).toBeUndefined();
    expect(snapshot()).toBe("");
    expect(fs.existsSync(path.join(pluginDir, "skills/admin/SKILL.md"))).toBe(true);
    expect(data(root, "P-002-brief-surface-filter.md").status).toBe("Approved");
  });

  test("decline needs the why and records it in the person's words", async () => {
    const root = materialize("F6-runlog");
    write(root, "P-001-t1-url-fragments.md", proposal());
    expect((await cli(["proposals", "decide", "P-001", "decline", "--by", "Ada Lovelace"], { root })).code).toBe(2);
    const r = await cli(["proposals", "decide", "P-001", "decline", "--by", "Ada Lovelace", "--why", "the hits were real, the samples were test files", "--json"], { root });
    expect(r.json).toMatchObject({ ok: true, status: "Declined", decided_by: "Ada Lovelace" });
    const text = read(root, `${DIR}/P-001-t1-url-fragments.md`);
    expect(text).toContain("Declined by Ada Lovelace on 2026-01-15: the hits were real, the samples were test files");
    expect((await cli(["proposals", "lint", "--json"], { root })).json.ok).toBe(true);
  });

  test("with no roster, the git user may rule and nobody else", async () => {
    const root = tmpRepo();
    git(root, "init", "-q", "-b", "main");
    git(root, "config", "user.name", "Grace Hopper");
    write(root, "P-001-a-change.md", proposal({ evidence: ["eval:rules-eval"] }));
    expect((await cli(["proposals", "decide", "P-001", "approve", "--by", "Ada Lovelace", "--json"], { root })).json).toMatchObject({ error: "not-a-holder", source: "git config user.name", may: ["Grace Hopper"] });
    expect((await cli(["proposals", "decide", "P-001", "approve", "--by", "Grace Hopper", "--json"], { root })).json.status).toBe("Approved");
  });

  test("usage errors: no verdict, no --by, no such proposal", async () => {
    const root = materialize("F6-runlog");
    write(root, "P-001-t1-url-fragments.md", proposal());
    expect((await cli(["proposals", "decide", "P-001", "--by", "Ada Lovelace"], { root })).code).toBe(2);
    expect((await cli(["proposals", "decide", "P-001", "approve"], { root })).code).toBe(2);
    expect((await cli(["proposals", "decide", "P-009", "approve", "--by", "Ada Lovelace", "--json"], { root })).json.error).toBe("no-such-proposal");
  });
});

describe("proposals apply", () => {
  /** A temp git repo (no roster, so the git user rules) with the starter rules and an Approved proposal whose diff `edit` makes. */
  async function repoWith(edit) {
    const root = tmpRepo({ "studio/DESIGN.md": "# Acme Notes\n\nThe narrative.\n" });
    await cli(["rules", "init"], { root });
    git(root, "init", "-q", "-b", "main");
    git(root, "config", "user.name", "Ada Lovelace");
    git(root, "add", "-A");
    git(root, "commit", "-qm", "base");
    const file = path.join(root, "studio/rules.md");
    const original = fs.readFileSync(file, "utf8");
    fs.writeFileSync(file, edit(original));
    const diff = git(root, "diff", "--", "studio/rules.md");
    fs.writeFileSync(file, original);
    expect(diff).toMatch(/^--- a\/studio\/rules\.md/m);
    write(root, "P-001-t1-source.md", proposal({ evidence: ["eval:rules-eval"], change: "```diff\n" + diff + "```" }));
    const d = await cli(["proposals", "decide", "P-001", "approve", "--by", "Ada Lovelace", "--json"], { root });
    expect(d.json.status).toBe("Approved");
    return { root, original };
  }
  test("a good diff ships: before and after recorded, the change stays", async () => {
    const { root, original } = await repoWith((t) => t.replace("| T1 | Colours come from tokens: no raw hex values in styles |", "| T1 | Colours come from tokens: no raw hex values in style declarations |"));
    const r = await cli(["proposals", "apply", "P-001", "--json"], { root });
    expect(r.json).toEqual({ status: "Shipped", before: expect.any(Number), after: expect.any(Number), regressions: [] });
    expect(r.json.after).toBe(r.json.before);
    expect(r.code).toBe(0);
    expect(read(root, "studio/rules.md")).not.toBe(original);
    expect(read(root, "studio/rules.md")).toContain("no raw hex values in style declarations");
    expect(data(root, "P-001-t1-source.md")).toMatchObject({ status: "Shipped", evals_before: r.json.before, evals_after: r.json.after });
    expect((await cli(["proposals", "lint", "--json"], { root })).json.ok).toBe(true);
    expect((await cli(["proposals", "apply", "P-001", "--json"], { root })).json.error).toBe("not-approved");
  });

  test("a diff that breaks rules lint is reverted and the proposal marked Failed", async () => {
    const { root, original } = await repoWith((t) => t.replace(/(\| T1 \| [^|]+\| [^|]+\| )block( \|)/, "$1bogus$2"));
    const r = await cli(["proposals", "apply", "P-001", "--json"], { root });
    expect(r.code).toBe(1);
    expect(r.json.status).toBe("Failed");
    expect(r.json.after).toBeLessThan(r.json.before);
    expect(r.json.regressions.map((x) => x.name)).toEqual(expect.arrayContaining(["rules-lint"]));
    expect(read(root, "studio/rules.md")).toBe(original);
    expect(data(root, "P-001-t1-source.md")).toMatchObject({ status: "Failed", evals_before: r.json.before, evals_after: r.json.after });
    expect((await cli(["proposals", "lint", "--json"], { root })).json.ok).toBe(true);
  });

  test("a diff that does not apply fails without touching anything", async () => {
    const { root, original } = await repoWith((t) => t.replace("| T1 |", "| T1  |"));
    fs.writeFileSync(path.join(root, "studio/rules.md"), original.replace("| T1 |", "| T1 (edited) |"));
    const now = read(root, "studio/rules.md");
    const r = await cli(["proposals", "apply", "P-001", "--json"], { root });
    expect(r.json.status).toBe("Failed");
    expect(r.json.regressions[0].name).toBe("git-apply");
    expect(read(root, "studio/rules.md")).toBe(now);
  });

  test("only an Approved client proposal is applied", async () => {
    const root = materialize("F6-runlog");
    write(root, "P-001-t1-url-fragments.md", proposal());
    expect((await cli(["proposals", "apply", "P-001", "--json"], { root })).json.error).toBe("not-approved");
    write(root, "P-002-brief.md", proposal({ id: "P-002", target: "plugin", kind: "wording" }));
    expect((await cli(["proposals", "apply", "P-002", "--json"], { root })).json.error).toBe("not-client");
  });
});
