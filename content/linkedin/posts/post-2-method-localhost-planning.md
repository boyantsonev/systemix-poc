# Post 2 — How I plan agentic workflows on localhost before building anything
**Track:** Foundation | **Slot:** 2 of 7 | **Status:** draft v1 | **Cadence:** ~2/week (publish only after Post 1 response has been read and logged)

## Gate conditions
- Post 1 has been live ≥48h and its replies have been read, clustered, and logged in this file's "Inputs from upstream" block and Post 1's revision log.
- At least one if-then rule below has been resolved (even if the resolution is "no signal → default copy stands").
- Screencast recorded against the *current* state of localhost:3001 (the canvas changes; the video must not show stale skill counts).

## What this tests (private)
Whether showing the *method* (plan the workflow as a visible artifact before writing agent code) earns more practitioner credibility than the thesis alone — i.e., do replies shift from "interesting idea" to "how do I do this / can I see the repo." Secondary: does a screencast of a localhost canvas outperform the static diagram on dwell and reply quality.

## Inputs from upstream
**Post 1 responses can change this post as follows:**
- If Post 1 replies focused on **drift/staleness** → open with a drift anecdote ("the workflow I didn't plan was the one that drifted") instead of the blind-spot angle; keep Option A's structure.
- If Post 1 replies focused on **"how do you build this"** → lead with the canvas earlier (move the localhost:3001 reveal into the first 3 lines); prefer Option B.
- If Post 1 replies **disputed the thesis** ("just CI/CD for design") → add the automation-vs-learning distinction paragraph (one paragraph max): a pipeline executes; a loop accumulates evidence. Prefer Option C, which carries the question energy.
- If Post 1 got **silence** → cut the thesis restatement to a single closing line and let the screencast carry the argument; hook must be more concrete (Option B).

> SIGNAL FROM POST 1: _pending_ → ADJUSTMENT: _pending_

## Content pack

### 📋 Post brief
- **Core idea:** Before building an agentic workflow, make it visible: a local canvas at localhost:3001 that maps Figma ↔ skill nodes ↔ Codebase with MCP badges. Planning the loop is what makes the loop closeable — you can't write evidence back to a decision you never made explicit.
- **Format:** Video / screencast (square or 4:5, 30–45s, subtitled).
- **Goal:** Convert Post 1's "interesting" into "credible method." Surface practitioners who want the approach or the repo.
- **Target:** Design engineers and AI-curious developers building with MCP/agent skills; design systems leads evaluating agent workflows.
- **Best time:** Tue–Thu, 8–10am (audience local).

### 🧭 Narrative
Agentic workflows fail quietly: not at the API call, but at the unexamined plan — nobody drew the system before letting agents loose in it. My method: build the map first, on localhost, as a real artifact — every skill a node, every MCP dependency a badge, every data flow an edge. Tension: this feels like procrastination until the first time the map catches a design error before any agent ran. The reader leaves with a concrete, copyable practice — and sees it's the precondition for Post 1's loop: explicit decisions are the only kind evidence can be written back to.

### ✍️ Copy options

---

**OPTION A — Uncomfortable Truth (Pattern 2)**

```
Most agentic workflows fail before the first API call. They fail at the plan nobody drew.

Last post I argued a design system is only AI-native when it learns what worked — when evidence gets written back to decisions. (Context loops, post 1.)

Here's the unglamorous prerequisite: you can't write evidence back to a decision you never made explicit.

So before I build any agent workflow, I plan it as a running artifact on localhost.

For Systemix — my Figma ↔ code sync case study — that's a canvas at localhost:3001. The video below shows it:

→ 15 skills mapped as nodes, Figma on one side, the codebase on the other
→ Every node badged with the MCP server it needs — read ops vs write ops are different servers, and the map makes that visible
→ The whole pipeline legible before a single sync ran

This caught real design errors. Example: two skills silently assumed write access the read-only MCP doesn't have. On the canvas, that's a wrong badge. In production, that's a 2am mystery.

Drawing the system isn't procrastination. It's the cheapest run of your pipeline you'll ever do.

Once every decision is a node, the loop from post 1 has somewhere to attach.

What do your agent workflows look like before you build them — diagram, doc, or vibes?

#DesignEngineering #AgenticAI #BuildingInPublic #DesignSystems
```
*(~1,280 chars)*

---

**OPTION B — Specific Number (Pattern 3)**

```
15 skills. 3 MCP servers. 0 lines of agent code written before I could see the whole system on one screen.

That ratio is deliberate, and it's the method behind the thesis I posted last week — that a design system is AI-native only when evidence flows back into it (context loops).

A loop is a shape. You can't close a shape you can't see.

So step one of every agentic workflow I build is a canvas on localhost:3001 — a live page in the project itself, not a Miro board that dies after kickoff:

→ Figma on the left, codebase on the right, 15 skill nodes between them
→ Each node badged with its MCP server — because reading from Figma and writing to Figma are different servers with different failure modes
→ Edges show what each skill consumes and produces

The screencast below is that canvas for Systemix, my Figma ↔ code sync pipeline (31 tokens, oklch→hex, bidirectional).

What the map bought me before any agent ran: it exposed two skills assuming write access through a read-only server. A wrong badge on a canvas. Would've been a silent failure in production.

The canvas is the plan, the documentation, and the first test — one artifact, three jobs.

Then it becomes the surface the loop writes back to. That's post 3's territory.

How do you make an agent workflow visible before it exists?

#AgenticAI #DesignEngineering #DesignSystems #BuildingInPublic
```
*(~1,290 chars)*

---

**OPTION C — Direct Question (Pattern 7)**

```
Where do you design an agentic workflow? Not the code it touches — the workflow itself.

Figma is for screens. IDEs are for code. The system between them — agents, skills, MCP servers, data flows — usually gets designed nowhere. It just accretes.

I think that's why so many agent setups feel haunted: nobody ever drew them.

My answer, from the research practice I introduced last post: design the workflow on localhost, as a running page inside the project.

For Systemix (the Figma ↔ code sync case study), that's a canvas at localhost:3001 — in the screencast below. Figma on one side, the codebase on the other, 15 skill nodes between them, each badged with the MCP server it depends on. Slash commands like /sync-to-figma and /drift-report exist as visible, inspectable nodes before they exist as behavior.

Two things this bought me:

1. Caught a real error pre-build — skills assuming write access on a read-only server. Visible as a wrong badge, free to fix.
2. It made every decision in the pipeline explicit. Which matters because of post 1's thesis: a system only learns what worked if evidence can be written back to a decision. Implicit decisions can't receive evidence.

Plan the loop before you build the loop.

Genuine question, not rhetorical: where does your agent workflow design currently live?

#AgenticAI #DesignEngineering #BuildingInPublic #DesignSystems
```
*(~1,300 chars)*

---

### 🎨 Visual / demo brief
- **Format:** Screencast, MP4, square 1080×1080 (or 4:5 1080×1350), 30–45 seconds. Burned-in subtitles (80%+ watch muted). Custom thumbnail: the full canvas with title text "Plan the workflow before the workflow."
- **Recording:** localhost:3001 canvas, clean browser (no bookmarks bar, no tabs, no dock). Cursor visible — the cursor is the narrator.

**Shot list:**
1. **0–4s:** Open on the full pipeline canvas (PipelineBeam view): Figma ↔ skill nodes ↔ Codebase. Subtitle: "Before I build an agentic workflow, I build this."
2. **4–12s:** Slow pan/zoom across the skill nodes. Subtitle: "15 skills. Every one a node before it's a behavior."
3. **12–20s:** Zoom to MCP badges on 2–3 nodes (one read-server badge, one write-server badge). Subtitle: "Each badge = the MCP server it needs. Reading Figma and writing Figma are different servers."
4. **20–30s:** Hover/click one concrete skill node (/sync-to-figma or /drift-report) to show its detail (prompt/definition panel if the canvas exposes it). Subtitle: "/sync-to-figma — planned here first, built second."
5. **30–38s:** Pull back to full canvas. Briefly highlight the path a token takes end-to-end (globals.css → skill → Figma Variables). Subtitle: "The map caught design errors before any agent ran."
6. **38–45s:** Hold on full canvas, fade in closing card: "Explicit decisions are the only kind evidence can be written back to. (Post 1 → Post 3.)"

**Do NOT include:** terminal output, code editor scrolling, Figma UI (this post is about the planning surface, not the sync), any audio narration dependency (must work muted), speed-ramped chaos cuts — keep it calm and legible, senior-practitioner pacing.

### 🔗 Links
- No link in body. First comment carries: https://systemix-alpha.vercel.app (the deployed canvas — note in comment that the video shows the localhost version where planning actually happens).
- Comment copy: "The canvas in the video, deployed: https://systemix-alpha.vercel.app — the /pipeline page. The localhost version is where the planning happens; the deployed one is the public record. Post 1 (the context-loops thesis this builds on) is on my profile."

### 💬 Engagement primer
- **First comment:** "Honest caveat: a canvas like this costs real time to build, and for a 2-skill workflow it's overkill. My current threshold — the moment a workflow has more than one MCP server or more than ~5 skills, the map pays for itself the first time it catches a wrong assumption. Below that, a sketch on paper does the job."
- **Reply-bait question:** "Where does your agent workflow design currently live — diagram, doc, or vibes? ('Vibes' answers welcome, that was me six months ago.)"

## Downstream impact map
- **Replies ask "can I see the repo / how is the canvas built"** → Post 3's first comment should pre-empt with build notes (stack: Next.js page inside the project itself); consider a Track A post slot for "the canvas as a pattern" if 3+ requests.
- **Replies focus on the MCP read/write split** → Post 3 can lean harder on data-flow inspection (the graph shows which server touched what); pull that into Post 3's shot list step 3.
- **Replies challenge "planning theater"** → Post 3 must open with the cost of NOT seeing (an incident framing), validating the instrument angle; log objection wording.
- **Strong response to the video format vs Post 1's static image** → lock video as default format for Posts 3–5; Post 4 (Track A) gets a screencast brief instead of a diagram.
- **Silence** → the method angle is too inside-baseball. Post 3 must be the scroll-stopper that re-acquires attention: lead with the trust line, reveal the 3D graph at peak curiosity, and re-state the thesis in plain words.

## Revision log
| Date | Signal observed | Change made | Posts affected |
|---|---|---|---|
| — | — | — | — |
