---
title: "Systemix — Getting Started (plain language)"
audience: designers, developers, business, marketers, builders
date: 2026-06-13
note: "A friendly walkthrough. Where something is planned, not yet built, it's marked ⏳."
---

# Systemix in plain language

**What it is, in one sentence:** Systemix is a small team of AI helpers that set up your design
system, then keep checking whether your design and copy choices actually *work* — and they always
**ask you before changing anything**.

It lives in your project folder. It runs inside **Claude** (Cowork or Claude Code). There's no app to
log into and no server to keep alive — your files are the product.

---

## First, six words (the only jargon you need)

| Word | Plain meaning | Everyday analogy |
|---|---|---|
| **Skill** | A saved instruction you trigger with a `/command` | A recipe the AI follows |
| **Agent** | A helper that runs a skill to do one job | A specialist on the team |
| **MCP** | A connector that lets the AI talk to an outside tool (Figma, PostHog, GitHub) | A USB port / an adapter |
| **Contract** | A small file that stores a decision *and the evidence for it* | The team's memory |
| **HITL** | "Human in the loop" — the AI proposes, **you** approve | A card you swipe yes/no |
| **The loop** | ship → measure → AI suggests → you decide → it's written down → next time starts smarter | A habit that compounds |

That's it. Everything below is just these six working together.

---

## The big picture (the loop)

```
   you ship something        a signal comes back        the AI reads the
   (a button, a headline)  →  (PostHog, a star, a   →    contract + signal
                               number you type in)        and writes a suggestion
          ▲                                                      │
          │                                                      ▼
   it's saved to the   ←   you approve / reject   ←   a decision card
   contract (memory)        (one tap, HITL)            appears in Cowork
```

Run that weekly and your design system stops drifting and starts *learning*. Each lap is recorded, so
you never re-litigate a decision you already made.

**Mini-loops** are just one card at a time: *the AI suggests → you decide → it's written down*. The
weekly loop is made of these little ones.

---

## How everything starts: the questions

Setup begins by **answering four questions**, not by configuring anything. You run one command and a
guide interviews you (think of it like a friendly concierge — the same idea as `/systemix next` ⏳,
which will tell you your next step at any time).

```sh
npx systemix init
```

It asks:

1. **What are you validating?** (your design system / your landing page / both) → decides which skills get installed
2. **What signals can the AI read?** (Figma, PostHog, a manual sheet…) → decides where evidence comes from
3. **How much can the AI decide alone?** (conservative / balanced / progressive) → sets its leash
4. **Should the AI check its own accuracy over time?** (off / audit / …) → optional self-improvement

Your answers are written to a plain file, `systemix.config.yaml`, and the matching skills are dropped
into your project. Nothing runs on its own yet — every helper starts in **"Ghost Mode"** (it can
suggest, but can't change anything until you say so).

---

## Pick your path

You don't need to be technical. Choose the lane that fits you.

**Path A — Cowork only (no terminal).** Best for designers, marketers, business folks.
You operate everything from Claude Cowork: a **schedule** runs the loop for you, and **decision cards**
show up for you to approve. This is the default and the simplest.

**Path B — Claude Code (terminal).** Best for developers and builders.
You get the full local engine, can run the visual **localhost app** (the 3D map, the living
styleguide), and can let the loop run unattended in the background.

Most people live in **Cowork** and only drop into the terminal for the occasional heavy task. You can
mix freely — both read the same files.

---

## Step by step

### 1. Install it into your project
```sh
npx systemix init
```
Answer the four questions. This creates `systemix.config.yaml` and your skills. (Need Node 18+.)

### 2. Choose the AI "brain" for suggestions
The helper that reads your evidence and writes a suggestion is called **Hermes**. You pick its brain:

- **Claude** (default, inside Cowork) — nothing to install. Best quality. *Recommended to start.*
- **Ollama** (a free local model) — fully offline, nothing leaves your machine. For privacy or
  unattended runs. Install once: `ollama pull hermes3`.

You can switch anytime in `systemix.config.yaml` (`hermes.engine`).

### 3. Connect your signals
Tell it where evidence comes from. Any mix of:

- **Figma** — your design source (via the Figma connector/MCP).
- **PostHog** — what users actually do on your site (optional; free tier is fine).
- **A manual sheet or a weekly question** — for things like LinkedIn/Threads numbers you track by
  hand. ⏳ (A scheduled task can simply *ask you* the numbers each week.)

### 4. Your design system is already the starting point
If you're using the Systemix repo, the design system (colors, type, components) is already here as
**contracts** the AI can read. You don't have to build one to begin. (Standing up a fresh one — from
Figma or from claude.ai/design — is a separate option for later.)

### 5. Write your first thing-to-validate
```sh
npx systemix new hypothesis
```
This makes a small **contract** file: *what you believe, what you're changing, and how you'll know it
worked* (e.g. "an ops-focused headline will lift signups +20%"). Commit it next to the thing you're
testing.

### 6. Turn on the loop
- **Cowork (Path A):** set a **weekly schedule** that runs the loop and drops decision cards for you. ⏳
- **Claude Code (Path B):** run it continuously:
  ```sh
  npx systemix watch
  ```
  It watches your signals and, when a result is meaningful, creates a decision card.

### 7. Review the card (this is the whole point)
A card says: **promote / run longer / kill**, with a confidence level and the reason. You tap your
choice. Your decision — and the evidence behind it — is written back into the contract. Next lap
starts from there.

### 8. (Optional) Open the visual app
When you want the pretty surfaces — the **3D map of how everything connects**, the **living
styleguide**, the **workflow catalog** — open the local app:
```sh
npm run dev
```
This is the "gallery." You don't need it to operate day to day; it's for seeing and showing.

---

## Where the helpers and connectors plug in

- **Skills** live in your project at `.claude/skills/` and are just `/commands` you (or a schedule)
  trigger.
- **Agents** are the helpers that run those skills — each does one job and writes to your files.
- **MCP servers** are the adapters to outside tools. Systemix ships one (`npx systemix-mcp`) that lets
  any AI in your editor read your contracts before it changes code, plus connectors for Figma,
  PostHog, GitHub, etc.
- **Memory** is plain files: `systemix.config.yaml` (your settings), `contract/**` (decisions +
  evidence), and `PLAN.md` (the story). No database.

You never have to memorize this. If you're lost, the concierge tells you the next step:
```sh
/systemix next      ⏳  (the "what should I do now?" helper)
```

---

## A cheat-sheet of what you'll actually type

```sh
npx systemix init          # set up (the four questions)
npx systemix new hypothesis# write a thing to validate
npx systemix watch         # run the loop (terminal)
npx systemix list          # see installed skills + available workflows
npx systemix doctor        # health check (skills, connectors, model)
npm run dev                # open the visual app (3D map, styleguide)
```

---

## Working today vs. coming next (honest version)

**Working now:** `npx systemix init` + the four-question wizard, hypothesis contracts, `watch`, the
MCP server, the localhost app + styleguide, token sync, Ollama-powered Hermes.

**⏳ Coming next (designed, not yet built):** `/systemix next` (the concierge), `/systemix rigor`
(one command to dial quality/cost/autonomy), the Cowork scheduled-task + decision-card cockpit, the
Claude brain option for Hermes, and the manual-signal "ask me weekly" task.

---

## What's in it for you (by role)

- **Designer:** your design system stops rotting — drift gets caught and you approve the fix.
- **Developer:** agents read what's already been tried before they touch code; decisions are in git.
- **Business:** every change is tied to evidence and a recorded decision — no guessing, no amnesia.
- **Marketer:** test headlines and landing copy as small experiments; the winner is written down.
- **Builder:** it's a repo you `npx` into and run from your own machine — local, yours, no lock-in.

---

*The first project Systemix runs the loop on is itself. If you want to see it work, watch it improve
its own design system in public.*
