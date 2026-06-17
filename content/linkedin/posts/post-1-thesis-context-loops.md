# Post 1 — Context loops are what make a design system AI-native
**Track:** Foundation | **Slot:** 1 of 7 | **Status:** draft v2 (guide/sneak-peek rework) | **Cadence:** ~2/week (Post 1: publish, then WAIT and read response before Post 2)

## Gate conditions
None. This is the opening move — it sets the frame everything else hangs on. Internal gates: the annotated diagram must exist and pass the "legible at feed size on mobile" check; the chosen copy option read aloud once for cadence; tool facts verified (DESIGN.md = Google Labs spec; Console MCP = TJ Pitre / Southleft; Hermes = Nous Research, self-hosted via Ollama).

## What this tests (private)
1. Whether "machine-readable ≠ AI-native" lands as a *new* idea worth replying to.
2. **New in v2:** whether anchoring the thesis in named, current tools (DESIGN.md, MDX/frontmatter, Figma Console MCP, Hermes) raises reply quality vs abstract framing — guide posts attract "what about tool X?" replies; those name the audience's actual stack.
3. Which vocabulary people repeat back: "context loop", "evidence", "write path", "drift".

## Inputs from upstream
None — origin post. Everything downstream adjusts to *this* post's response.

> SIGNAL FROM POST 0 (n/a): _none — origin post_ → ADJUSTMENT: _none_

## Content pack

### 📋 Post brief
- **Core idea:** The 2026 stack (DESIGN.md, MDX/YAML frontmatter, Console MCP) gives design systems a *read path* for agents. Hermes shows what a *write path* looks like — memory the agent updates itself. The missing layer in design systems is that write path for **evidence**: what happened after a decision. A system an agent can read isn't AI-native; one that learns what worked is.
- **Format:** Text + single image (annotated diagram, 1080×1350 portrait). Guide-style copy — slightly longer than a pure opinion post; dwell time is the algorithmic upside.
- **Goal:** Plant the thesis AND act as a useful field guide / sneak peek of the research agenda. 3–5 substantive replies; surface which tools the audience actually runs.
- **Target:** Senior design engineers, DS leads, staff designers experimenting with agents/MCP; secondary: agent-infra people (Hermes/Claude routines angle pulls them in).
- **Best time:** Tue–Thu, 8–10am (audience local).

### 🧭 Narrative
Walk the reader up the stack they're already assembling: decisions made legible (DESIGN.md's YAML frontmatter + markdown rationale; MDX component docs), the system exposed as an API (TJ Pitre's Figma Console MCP — extraction, variables, generated docs with frontmatter), and then the genuinely new move — Hermes, an agent whose MEMORY.md it writes itself, loaded into every session. Two turns: (1) you don't need Hermes' self-hosted Ollama stack to get self-updating memory — Claude plus a write-back routine does the same loop; (2) all of this still only stores *decisions and preferences*. None of it stores **evidence** — what happened after the decision: which token drifted, which override a human made, what got adopted or quietly ignored. Evidence written back to the decision is the context loop, and it's what the next six posts build in public. The reader leaves with a map of the stack and one question they can't unhear: *where does your evidence live?*

### ✍️ Copy options

---

**OPTION A — The Field Guide (Pattern 8, List Tease — primary recommendation for the guide framing)**

```
Your design system can already talk to agents. It still can't remember what they did.

Here's the stack everyone's assembling right now, and the layer it's missing:

1/ DESIGN.md (Google Labs). YAML frontmatter for machine-readable tokens, markdown body for human rationale. Your visual identity as a contract agents read before generating. Decisions, made legible.

2/ MDX + frontmatter docs. Same pattern at component level — metadata for the machine, rationale for the human. One file, two readers.

3/ Figma Console MCP (TJ Pitre / Southleft). The design system as an API: extract tokens, write variables, generate component docs — frontmatter included. The read path, industrialized.

4/ Hermes (Nous Research). The interesting one. An agent with MEMORY.md it writes *itself*, loaded into every session. Self-hosted, runs on Ollama. The first mainstream example of a file the agent writes, not just reads.

You don't need the Ollama stack for that last trick. Claude + a write-back routine — end every session by appending what changed to a memory file — closes the same loop.

But notice what all four store: decisions and preferences.

None of them store evidence — what happened *after* the decision. Which token drifted. Which override a human made. What got adopted, what got ignored.

Evidence written back to the decision is what makes a system learn. That's the loop I'm researching in public, starting with this post.

So: where does your evidence live today? "Nowhere" is an honest answer.

#DesignSystems #DesignEngineering #AIAgents #BuildingInPublic
```
*(~1,610 chars — earns its length as a guide; hook + list structure holds dwell time)*

---

**OPTION B — Reframe (Pattern 10)**

```
Everyone is building design systems a read path for agents. Almost nobody is building the write path.

The read path is genuinely good now. DESIGN.md gives agents your visual identity as YAML frontmatter + markdown rationale. MDX docs make every component machine-readable. Figma Console MCP (TJ Pitre's work at Southleft) turns the whole system into an API.

An agent can know your design system completely — and your design system learns nothing from the encounter.

The write path is where it gets interesting. Hermes (Nous Research) showed the move: a MEMORY.md the agent updates itself, loaded fresh into every session. It needs Ollama and self-hosting — but the move doesn't. Claude plus one routine (append what changed at session end) closes the same loop.

Now apply that move to design systems. What should get written back isn't preferences — it's evidence:

→ which token drifted from spec
→ which override a human made, and why
→ which decision got adopted vs quietly ignored

Evidence written back to the decision that produced it. That's a context loop, and it's the difference between a system an agent can read and a system that learns what worked.

Only the second one is AI-native.

I'm researching this in public — replies are the only metric I track. So, honestly: where does evidence live in your stack today?

#DesignSystems #DesignEngineering #AIAgents #BuildingInPublic
```
*(~1,440 chars)*

---

**OPTION C — Confession / Build in Public (Pattern 5 + 9 — the "I chose it" story)**

```
I nearly self-hosted an entire agent stack to get one feature: memory that updates itself.

Hermes, by Nous Research. A MEMORY.md the agent writes on its own and loads into every session. No vector search lottery — guaranteed context, every time. I chose it to study because it's the cleanest public example of an agent with a write path, not just a read path.

The catch: it wants Ollama, a 64k-context local model, self-hosting.

Then it clicked — the feature isn't the agent. It's the routine. Claude + one rule ("end each session by appending what changed to the memory file") closes the same loop. No GPU required.

That realization is the thesis of everything I'll publish next:

We've made design systems readable to agents — DESIGN.md with its YAML frontmatter, MDX component docs, TJ Pitre's Figma Console MCP turning the system into an API. All read path. All storing decisions.

What nothing stores is evidence: what happened after the decision. The token that drifted. The override a senior designer made on Tuesday. The component nobody adopted.

A system an agent can read isn't AI-native. A system that writes evidence back to its own decisions — and learns what worked — is.

Diagram below: the stack, and the missing layer. This is post 1 of 7. No analytics, replies are the signal.

Where does your evidence live?

#BuildingInPublic #DesignSystems #AIAgents #DesignEngineering
```
*(~1,420 chars)*

---

### 🎨 Visual / demo brief
- **Format:** Single static image, PNG, 1080×1350 (4:5 portrait). Light background, system-diagram aesthetic (Systemix canvas style: thin strokes, mono labels, MCP-badge motif).
- **Layout (v2 — the stack + the missing layer):** Four horizontal layers stacked bottom-up, plus one highlighted return arrow. Title strip: "AI-readable ≠ AI-native".

**Layer 1 (bottom) — "DECISIONS"**: file icons labelled `DESIGN.md` (`YAML frontmatter + rationale`), `*.mdx` docs. Annotation: "Decisions, made legible."
**Layer 2 — "ACCESS"**: node labelled `Console MCP` with API badge. Annotation: "The system as an API."
**Layer 3 — "AGENT"**: agent node reading downward arrows from layers 1–2. Gray arrows, all pointing UP into the agent. Annotation: "Read path: solved."
**Layer 4 (top) — "MEMORY"**: `MEMORY.md` node with two small badges: `Hermes (Ollama)` and `Claude + routine`. A thin arrow from Agent up to MEMORY.md. Annotation: "Write path: preferences."
**The highlighted element — "EVIDENCE" return arrow**: one bold accent-colored arrow (Systemix `synced` green) from the Agent back DOWN into Layer 1's files, labelled `evidence ledger: drifted 2 · overridden 1 · adopted 28`. Annotation: "Write path for *evidence*: missing. This is the loop."

**Do NOT include:** tool logos/wordmarks (text labels only), Figma UI screenshots, more than ~12 words per annotation, gradients/shadows, URLs. Image must carry the thesis with zero caption.

### 🔗 Links
- No links in body (30–50% reach cut). **First comment carries the guide links** (this doubles as the "sneak peek" payoff):
  - "The tools mentioned, for anyone mapping their own stack: DESIGN.md spec → github.com/google-labs-code/design.md · Figma Console MCP → github.com/southleft/figma-console-mcp · Hermes → github.com/NousResearch/hermes-agent · My case study (Systemix, the Figma ↔ code pipeline this research runs on) → systemix-alpha.vercel.app"

### 💬 Engagement primer
- **First comment (with links, immediately after publishing):** as above, plus: "Worth saying: the read-path tools are excellent — this isn't a takedown. The research question is what they *don't* store yet."
- **Second seed comment (skeptic pre-empt):** "For the skeptics — yes, 'write evidence back' is easy to say and annoying to build. The hard parts: deciding what counts as evidence (drift? overrides? silence?) and where it lives so the *next* agent session actually reads it. That's posts 2–7."
- **Reply-bait question (embedded in all three options):** "Where does evidence about design decisions live in your system today — and be honest if the answer is 'in a senior designer's head'?"
- **Definition to repeat verbatim in replies (keep it stable so it becomes quotable):** *Evidence = what happened after a decision — drift, overrides, adoption, silence — written back where the next run will read it.*

## Downstream impact map
- **Replies cluster on drift/staleness** → pull Post 4 (Track A) framing forward; open Post 2 with a drift example.
- **Replies cluster on a named tool** → route by tool: Console MCP replies → Post 2 shows the MCP layer in the localhost canvas; Hermes/memory replies → Post 6 (self-updating docs) leads with the Claude-routine mechanics and may move earlier; DESIGN.md replies → Post 7 carousel adds a "contract formats" slide.
- **Replies ask "show the Claude routine"** → that's demand for the write-back mechanics: Post 2 gains a 10s segment showing the memory/evidence file updating; log as possible standalone follow-on unit.
- **Replies cluster on agents/trust** → promote Post 3's framing into Post 2's closer as a teaser.
- **Thesis disputes ("this is just CI/CD for design")** → don't retreat; Post 2 adds one paragraph separating automation (pipeline) from learning (loop). Log exact phrasing.
- **Silence (<3 substantive replies in 48h)** → guide framing may have read as a listicle; Post 2 carries the thesis *through the demo*, tie-back cut to one line.
- **DMs from a shared problem space** → bias Track A ordering toward it.

## Revision log
| Date | Signal observed | Change made | Posts affected |
|---|---|---|---|
| 2026-06-12 | Review session: rework as guide/sneak-peek around the real stack | v2: narrative rebuilt around DESIGN.md / MDX+frontmatter / Console MCP (TJ Pitre) / Hermes-vs-Claude+routines; evidence explicitly defined; quotable definition added to primer; tool-cluster routing added to impact map; diagram redesigned as stack + missing evidence layer | 1 (this), routing rules touch 2, 4, 6, 7 |
