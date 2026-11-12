"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { cli, tmpRepo, read, exists } = require("./helpers/cli");

describe("rules", () => {
  test("init writes the starter, then lint and eval pass", async () => {
    const root = tmpRepo();
    const init = await cli(["rules", "init", "--json"], { root });
    expect(init.code).toBe(0);
    expect(init.json.written).toContain("design/rules.md");
    expect(init.json.written).toContain("design/rules/review-cases.json");
    expect(read(root, "design/rules.md")).toContain("Started 2026-01-15");
    expect((await cli(["rules", "lint"], { root })).code).toBe(0);
    const ev = await cli(["rules", "eval", "--json"], { root });
    expect(ev.json.uncovered).toEqual([]);
    expect(ev.code).toBe(0);
    const again = await cli(["rules", "init", "--json"], { root });
    expect(again.json.written).toEqual([]);
  });

  test("the starter eval passes from the bundled templates", async () => {
    const r = await cli(["rules", "eval", "--starter", "--json"], { root: tmpRepo() });
    expect(r.code).toBe(0);
    expect(r.json.rows.every((x) => x.ok)).toBe(true);
  });

  test("removing a known-bad sample fails eval; a missing review case fails eval", async () => {
    const root = tmpRepo();
    await cli(["rules", "init"], { root });
    fs.unlinkSync(path.join(root, "design/rules/known-bad/T2-px-font.css"));
    let r = await cli(["rules", "eval", "--json"], { root });
    expect(r.code).toBe(1);
    expect(r.json.uncovered).toEqual(["T2"]);
    await cli(["rules", "init"], { root });
    const cases = JSON.parse(read(root, "design/rules/review-cases.json"));
    delete cases.A2;
    fs.writeFileSync(path.join(root, "design/rules/review-cases.json"), JSON.stringify(cases));
    r = await cli(["rules", "eval", "--json"], { root });
    expect(r.code).toBe(1);
    expect(r.json.reviewCases.find((c) => c.id === "A2").ok).toBe(false);
  });

  test("an unfilled placeholder fails lint", async () => {
    const root = tmpRepo();
    await cli(["rules", "init"], { root });
    fs.appendFileSync(path.join(root, "design/rules.md"), "\nOwner: {{PERSON_A}}\n");
    const r = await cli(["rules", "lint", "--json"], { root });
    expect(r.code).toBe(1);
    expect(r.json.problems[0].message).toMatch(/PLACEHOLDER/);
  });

  test("T1 fires on a raw hex value but not on a #add id selector, nor on the token file", async () => {
    const root = tmpRepo({
      "src/a.css": "#add { color: var(--primary); }\n.b { color: #ff3366; }\n",
      "design/tokens.css": ":root { --primary: #112233; }\n",
    });
    await cli(["rules", "init"], { root });
    const r = await cli(["rules", "check", ".", "--json"], { root });
    const t1 = r.json.findings.filter((f) => f.id === "T1");
    expect(t1).toEqual([expect.objectContaining({ file: "src/a.css", line: 2, match: "#ff3366" })]);
    expect(r.json.files).not.toContain("design/tokens.css");
    expect(r.code).toBe(1);
  });

  test("A1 catches <Image> without alt", async () => {
    const root = tmpRepo({ "src/Hero.tsx": 'export const H = () => <Image src="/a.png" width={1} height={1} />;\n' });
    const r = await cli(["rules", "check", "src", "--starter", "--json"], { root });
    expect(r.json.findings.map((f) => f.id)).toContain("A1");
  });

  test("list filters by surface", async () => {
    const root = tmpRepo();
    await cli(["rules", "init"], { root });
    const r = await cli(["rules", "list", "--surface", "email", "--json"], { root });
    const ids = r.json.list.map((x) => x.id);
    expect(ids).toContain("T1");
    expect(ids).toContain("L1");
    expect(ids).not.toContain("V1");
    expect(ids).not.toContain("C2");
  });

  test("check --changed states its base and checks only changed files", async () => {
    const root = tmpRepo({ "src/old.css": ".a { color: #000000; }\n" });
    const g = (...a) => execFileSync("git", a, { cwd: root, stdio: "ignore" });
    g("init", "-q", "-b", "main");
    g("-c", "user.name=t", "-c", "user.email=t@t", "add", ".");
    g("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-qm", "base");
    g("checkout", "-qb", "feature");
    fs.writeFileSync(path.join(root, "src/new.css"), ".b { font-size: 10px; }\n");
    const r = await cli(["rules", "check", "--changed", "--starter", "--json"], { root });
    expect(r.json.base).toBe("main");
    expect(r.json.files).toEqual(["src/new.css"]);
    expect(r.json.findings.map((f) => f.id).sort()).toEqual(["A3", "T2"]);
  });

  test("no rules file: a clear message, exit 1", async () => {
    const r = await cli(["rules", "check", "."], { root: tmpRepo() });
    expect(r.code).toBe(1);
    expect(r.stderr).toMatch(/rules init/);
  });
});
