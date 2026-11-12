---
name: check
description: Check UI, styles or copy against this repo's design system before review or publishing — a component, a page, a pull request's changed files, an email or a piece of copy — and get pass, pass with flags or fail, with each problem's rule ID, where it is and the fix. Also gives the free AI-readiness score and, with --drift, what has drifted from the tokens; --deep runs the long readiness audit. Everything runs on this machine; nothing is sent. Use when asked to "check this against the design system", "is this on brand", "does this follow our rules", "score my design system", "AI-readiness", "drift", or "/systemix:check".
argument-hint: "[files or folders] [--surface product|marketing|email] [--drift] [--deep] [--score]"
---

# /systemix:check

Something is ready for review, and you want to know, before a reviewer or a customer does, whether
it breaks a rule of this repo's design system. You give one result and a list: each problem with its
rule ID, where it is and how to fix it. You never invent a rule, re-score a number or soften a
result: the bundled scan returns them and you show them as they come.

The scan: `SCAN='node "${CLAUDE_PLUGIN_ROOT}/scan/systemix.js"'`. Run it from the repo root.

## 1. What to check

The files or folders the person named; else the files changed on this branch
(`git diff --name-only $(git merge-base HEAD origin/HEAD 2>/dev/null || echo HEAD~1)`); else ask.
The surface (`product`, `marketing`, `email`, …) only if you cannot tell.

## 2. The rules

If `design/rules.md` does not exist, say the repo has no rules yet, offer `/systemix:setup`, and go
to step 4 (the score and drift still work). Otherwise:

1. `$SCAN rules lint`; if it fails, show its lines and stop: the rules come first.
2. `$SCAN rules check <files…> [--surface <s>]`. Show the result line and every finding as it
   prints. For each, give the fix in one line: the token, the component or the wording the rule
   asks for (read the rule's Source when the row is not enough).
3. Answer each `review:` question it lists by looking at the work. Say yes, no or can't tell, with
   where; a `block` review that fails makes the result fail.

**If a rule looks wrong, don't work round it.** Say which rule and why, and offer to change it in
`design/rules.md` (with a known-bad sample, then `$SCAN rules eval`) — after the person says yes.
Fix the rule, not the instance.

## 3. --drift: the code against the tokens

`$SCAN drift scan --dry-run --json`, then report what the drift-report guide
(`references/drift-report/guide.md`) says to report: raw colours, sizes and spacing that should
reference `design/tokens.css`, by severity. Read the guide before writing the report.

## 4. The score (--score, or when the person asked for it)

`$SCAN audit report [--dirs <folders>]`: the free AI-readiness score out of 100 and per area,
computed on this machine. Print it unchanged. If it says there is no score because folders are
missing, ask which folders hold the UI.

## 5. --deep: the readiness audit

Follow `references/readiness-audit/guide.md` in full: the long, scored audit with its rubric
(`references/readiness-audit/rubric.json`). It is a record; anything it would write is proposed.

## Reply

One line: **fail**, **pass with flags** or **pass**, the number of files and the rules' version or
date. Then the findings, blocks first, each `ID · file:line · what · fix`. Then the review answers.
Then, if run, the drift and the score. End with the one thing to fix first.

The guides in `references/` name each other (design-audit, drift-report, readiness-audit): those
are guides, not commands. The design-audit guide is in `/systemix:setup`.
