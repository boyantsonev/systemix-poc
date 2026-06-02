# Connecta Component & Pattern Inventory

## Summary
Connecta's preview library is a **persona-aware, AI-native pattern library** for an EU K-12 edtech product spanning three audiences (student/kid, parent, teacher/admin). It blends standard SaaS primitives with AI-native conversation/agentic primitives (adopted largely from Vercel AI Elements) and a dedicated Trust & Safety surface area that is the product's true differentiator under EU/GDPR + K-12 norms. The sidebar IA is organized top-to-bottom from **Foundations → AI surfaces → Learning → Admin → Trust/Safety → Shell/Forms/States**, so a reviewer reads it as "what it's made of, how the AI behaves, what kids learn, how adults run it, how we keep kids safe, and the plumbing." On desktop it's a left sidebar; on mobile it collapses to a horizontal top tab bar with the same ordered categories.

## Sidebar IA (nav categories, in order)
1. **Foundations** — tokens, type scale, color, spacing, elevation, iconography
2. **AI Conversation** — chat, message, streaming, model selector, reasoning, sources
3. **Agentic Workflow** — task, tool-call, plan, approval / HITL
4. **Learning** — progress, lesson cards, quiz, achievement, coaching
5. **Administration** — tables, filters, roster, dashboards, reporting
6. **Trust & Safety** — content flags, parental controls, consent, moderation, disclosure
7. **Navigation & Shell** — sidebar, mobile tab bar, persona switcher, headers
8. **Forms & Inputs** — fields, validation, pickers, age-appropriate inputs
9. **Feedback & States** — empty, loading, error, success, skeletons

---

## Category Breakdown

### 1. Foundations
| Component / Pattern | Source | K-12 Safety-critical? | Notes |
|---|---|---|---|
| Color token swatches (cream / lavender / accent) | Standard | No | Editorial/warm palette preview; light + dark modes. Maps to existing `.systemix/tokens.bridge.json` Semantic collection |
| Type scale (serif display + body) | Standard | No | Wisprflow-inspired serif display; show readable line-length + min body size for young readers |
| Spacing & radius scale | Standard | No | `radius/base = 8px` already in tokens; warm rounded forms |
| Elevation / shadow preview | Standard | No | Soft shadows, no harsh clinical borders |
| Iconography set | Shape of AI (Identifiers › Iconography) | No | Consistent AI-action icons; friendly, rounded, child-legible |
| AI accent color / identity | Shape of AI (Identifiers › Color) | No | A reserved hue that always signals "this is AI" — important for kid disclosure |

### 2. AI Conversation
| Component / Pattern | Source | K-12 Safety-critical? | Notes |
|---|---|---|---|
| Conversation container | AI Elements (Conversation) | No | Multi-turn scroll container; auto-scroll + scroll-to-latest |
| Message (user / AI / system) | AI Elements (Message) | Yes | AI messages must carry a visible AI marker for kids (see Disclosure) |
| Prompt input | AI Elements (Prompt Input) | Yes | For kid persona: simplified, with safe-input guards + suggestion chips |
| Streaming / Shimmer loader | AI Elements (Shimmer) | No | Token-by-token streaming; calm pacing, no jarring flicker |
| Model selector | AI Elements (Model Selector) | No | Admin/teacher persona only — kids never pick raw models |
| Reasoning / Stream of Thought | AI Elements (Reasoning) + Shape of AI (Governors › Stream of Thought) | No | Collapsible; teacher-facing transparency. Hide raw chain from young kids |
| Sources / Inline Citation | AI Elements (Sources, Inline Citation) + Shape of AI (Governors › Citations) | Yes | Every factual claim links a vetted source — anti-hallucination for learning |
| Suggestion chips | AI Elements (Suggestion) + Shape of AI (Wayfinders › Suggestions) | Yes | Curated safe starters; solves blank-canvas for kids |
| Attachments | AI Elements (Attachments) | Yes | Upload guarded by content scanning + age rules |
| Avatar / AI persona identity | Shape of AI (Identifiers › Avatar, Name, Personality) | Yes | The "coach" character; consistent, friendly, clearly non-human |
| Voice input / transcription | AI Elements (Speech Input, Transcription) | Yes | Voice coaching for younger / pre-literate kids; transcripts auditable |
| Context indicator | AI Elements (Context) | No | Shows what the coach currently "knows" about the lesson |

### 3. Agentic Workflow
| Component / Pattern | Source | K-12 Safety-critical? | Notes |
|---|---|---|---|
| Task / Task list | AI Elements (Task) | No | Individual agent work items (e.g. "grade quiz", "draft parent note") |
| Plan / Action plan | AI Elements (Plan) + Shape of AI (Governors › Action plan) | Yes | Agent shows steps BEFORE acting — core HITL for adult-facing automation |
| Tool call | AI Elements (Tool) | Yes | Render tool name, args, result; never silent for consequential actions |
| Confirmation / Approval (HITL) | AI Elements (Confirmation) + Shape of AI (Governors › Verification) | Yes | Approve/reject before execution — required for anything touching a child's record |
| Checkpoint | AI Elements (Checkpoint) | No | Save/restore conversation or workflow state |
| Controls (pause / stop / resume) | AI Elements (Controls) + Shape of AI (Governors › Controls) | Yes | Always-available kill switch mid-stream |
| Branches / Variations | Shape of AI (Governors › Branches, Variations) | No | Teacher explores alternative AI drafts (e.g. feedback wording) |
| Queue | AI Elements (Queue) | No | Pending agent jobs (batch grading, bulk parent messages) |
| Footprints / decision trail | Shape of AI (Trust Builders › Footprints) | Yes | Auditable "what the agent did and why" — accountability for K-12 |
| Cost / usage estimate | Shape of AI (Governors › Cost estimates) | No | Admin-facing budget transparency (ties to TokenGuard) |

### 4. Learning
| Component / Pattern | Source | K-12 Safety-critical? | Notes |
|---|---|---|---|
| Progress bar / ring | Standard | No | Lesson + skill progress; warm, celebratory not clinical |
| Lesson card | Custom | No | Editorial card with serif title, illustration, difficulty, est. time |
| Quiz / question component | Custom | Yes | MCQ, free-text, drag-match; answers + AI feedback must be moderated |
| Achievement / badge | Custom | No | Motivational; avoid dark-pattern streak pressure on kids |
| Coaching nudge | Shape of AI (Wayfinders › Nudges) | Yes | "Try explaining it back" prompts; gentle, non-manipulative |
| Skill / mastery map | Custom | No | Visual learning path; parent + teacher legible |
| Hint / scaffold reveal | AI Elements (Reasoning, progressive disclosure) | Yes | Reveal answer gradually — pedagogy guard against "just give me the answer" |
| Frustration / sentiment signal | Custom (research: adaptive detection) | Yes | Detect confusion/disengagement; route to easier path or human |
| Lesson plan template | Shape of AI (Wayfinders › Templates) | No | Teacher-authored, AI-fillable dialogue templates |

### 5. Administration
| Component / Pattern | Source | K-12 Safety-critical? | Notes |
|---|---|---|---|
| Data table (sortable, paginated) | Standard | No | Students, classes, messages, audit logs |
| Filters / facets | Standard + Shape of AI (Tuners › Filters) | No | Filter by class, grade, status, flag |
| Class roster | Custom | Yes | Student PII — minimal display, role-gated |
| Dashboard / stat cards | Standard | No | Attendance, usage, well-being signals; charts |
| Gradebook | Custom | Yes | Grades are sensitive child data; export controls |
| Reporting / export | Standard | Yes | GDPR-compliant export; audit who exported what |
| Calendar / scheduling | Standard | No | Timetable, sessions, parent-teacher meetings |
| Bulk action bar | Standard | Yes | Batch ops on student records require confirmation (HITL) |
| Activity / audit log | Custom + Shape of AI (Footprints) | Yes | Immutable trail of AI + human actions on minors' data |
| Notification / message composer | Custom | Yes | Parent/teacher comms; AI-drafted notes pass moderation |

### 6. Trust & Safety  *(K-12 differentiator — see dedicated section below)*
| Component / Pattern | Source | K-12 Safety-critical? | Notes |
|---|---|---|---|
| Content flag / report control | Custom | Yes | One-tap "this made me uncomfortable" for kids |
| Moderation state banner | Custom | Yes | "Message under review" / "hidden by safety filter" states |
| Parental controls panel | Custom | Yes | Parent caps usage, topics, time; reviews transcripts |
| Consent / data ownership | Shape of AI (Trust Builders › Consent, Data ownership) | Yes | GDPR + parental consent capture; granular, revocable |
| AI disclosure marker | Shape of AI (Trust Builders › Disclosure) | Yes | Always-visible "you're talking to AI" for kids |
| Caveat / safety notice | Shape of AI (Trust Builders › Caveat) | Yes | "AI can make mistakes — check with a grown-up" |
| Incognito / memory controls | Shape of AI (Trust Builders › Incognito, Memory) | Yes | Control what the coach remembers about a child |
| Escalation to human | Custom (research: HITL escalation) | Yes | Route distress / safety triggers to a teacher/guardian fast |
| Safe-input guardrail state | Custom | Yes | Blocked-input feedback that's reassuring, not punitive |
| Verification / age gate | Shape of AI (Governors › Verification) | Yes | Age-appropriate routing of features and content |

### 7. Navigation & Shell
| Component / Pattern | Source | K-12 Safety-critical? | Notes |
|---|---|---|---|
| Sidebar (desktop) | Standard | No | The preview shell itself; categorized nav |
| Top tab bar (mobile) | Standard | No | Same IA collapsed; the responsive requirement |
| Persona switcher | Custom | Yes | Student / Parent / Teacher contexts; gates which UI + data show |
| App header / top bar | Standard | No | Title, search, account, AI accent identity |
| Breadcrumbs / wayfinding | Shape of AI (Wayfinders) | No | Where am I in a lesson/admin flow |
| Account / profile menu | Standard | No | Per-persona; child profile is minimized |
| Search / command | Standard | No | Find lesson, student, setting |

### 8. Forms & Inputs
| Component / Pattern | Source | K-12 Safety-critical? | Notes |
|---|---|---|---|
| Text field + validation | Standard | No | Inline, friendly error copy |
| Select / dropdown | Standard | No | — |
| Toggle / switch | Standard | Yes | Parental-control toggles need clear on/off semantics |
| Checkbox / radio | Standard | Yes | Consent checkboxes must be explicit, never pre-checked (GDPR) |
| Date / time picker | Standard | No | Scheduling |
| Slider / parameter tuner | Shape of AI (Tuners › Parameters, Modes) | No | Difficulty, tone, mode controls (teacher/admin) |
| Age-appropriate input (kid) | Custom | Yes | Large targets, icon-led, minimal typing for young users |
| File / attachment upload | AI Elements (Attachments) | Yes | Scanned, type-restricted |

### 9. Feedback & States
| Component / Pattern | Source | K-12 Safety-critical? | Notes |
|---|---|---|---|
| Empty state | Standard | No | Warm, encouraging; doubles as Wayfinder for first prompt |
| Loading / skeleton | Standard + AI Elements (Shimmer) | No | Calm streaming feel |
| Error state | Standard | Yes | Kid-safe, non-alarming error copy; never expose stack traces |
| Success / toast | Standard | No | Celebratory micro-feedback |
| Inline status badge | Custom | Yes | synced/drifted/stale + safety states (flagged, reviewed, blocked) |
| Confirmation dialog | Standard | Yes | Destructive/consequential admin actions |

---

## AI Elements — What's Reusable
Adopt these Vercel AI Elements primitives more or less directly (restyled to the cream/lavender/serif theme):

- **Conversation, Message, Prompt Input** — the chat core.
- **Reasoning, Sources, Inline Citation** — transparency + anti-hallucination for learning.
- **Suggestion** — safe starter chips (kid blank-canvas).
- **Shimmer** — streaming/loading.
- **Model Selector** — admin/teacher only.
- **Task, Plan, Tool, Confirmation, Checkpoint, Queue, Controls** — the full agentic/HITL set for the administration automation side.
- **Attachments, Context** — guarded uploads + context display.
- **Speech Input, Transcription, Audio Player** — voice coaching for young/pre-literate kids.

Deliberately **skip** the Code components (File Tree, Sandbox, Terminal, Stack Trace, Commit, etc.) and the visual Workflow-canvas set (Node/Edge/Canvas) — they're developer-tool primitives, not edtech surfaces. Plan/Task/Tool/Confirmation give us the agentic story without a node-graph canvas.

## Shape of AI Patterns — What Applies
- **Wayfinders** → Suggestions, Nudges, Templates, Initial CTA — onboarding kids into safe prompting and teachers into authored dialogue templates.
- **Governors (HITL)** → Action plan, Verification, Controls, Citations, Branches, Variations, Stream of Thought, Cost estimates — the oversight backbone for the admin/agentic side and for teacher review of AI output.
- **Trust Builders** → Disclosure, Caveat, Consent, Data ownership, Incognito, Memory, Footprints, Watermark — the K-12/EU compliance and child-safety layer (the differentiator).
- **Identifiers** → Avatar, Name, Personality, Color, Iconography — the warm, recognizable, clearly-non-human coach identity.
- **Tuners** → Filters, Parameters, Modes, Voice and tone — teacher/admin controls over how the AI behaves per class.

Patterns that **don't** strongly apply: the generative-media Inputs (Inpainting, Restyle, Restructure, Madlibs) — Connecta is conversational/educational, not an image/content-generation studio.

## Trust & Safety Surfaces (K-12-specific)
These are the surfaces that make Connecta defensible as an EU K-12 product. They deserve their own first-class category and design rigor:

1. **AI Disclosure marker** — persistent, kid-legible "this is AI" on every AI message (Shape of AI: Disclosure; EU AI Act transparency).
2. **Caveat banner** — "AI can be wrong, ask a grown-up" reinforcement.
3. **Content flag / report** — one-tap kid reporting; reassuring, low-friction.
4. **Moderation states** — under-review / hidden-by-filter / blocked, with calm copy.
5. **Escalation to human** — distress or safety-trigger routing to teacher/guardian.
6. **Parental controls** — time/topic/usage caps, transcript review, granular toggles.
7. **Consent & data ownership** — GDPR-grade, parental, explicit (never pre-checked), revocable.
8. **Memory / Incognito controls** — what the coach retains about a child.
9. **Footprints / audit log** — immutable trail of every AI + human action on a minor's data.
10. **Age gate / verification** — age-appropriate feature and content routing.
11. **Safe-input guardrail feedback** — blocked-input states that don't shame the child.

(Per the EDSAFE "S.A.F.E. By Design" framing: safety must be visible in the UI, continuously, not buried in settings.)

## Priority for First Preview (MVP set)
The 8-12 components to build first — they prove the theme, the AI-native story, and the K-12 differentiator in one preview page:

1. **Foundations strip** — color + serif type scale + spacing (proves the warm editorial theme).
2. **Conversation + Message** (with AI Disclosure marker baked in).
3. **Prompt Input** + **Suggestion chips** (kid-safe starters).
4. **Reasoning / Sources** (transparency + citations).
5. **Plan + Confirmation (HITL approval)** — the agentic + oversight headline.
6. **Tool call** display.
7. **Lesson card** + **Progress** (the Learning identity).
8. **Persona switcher** (Student / Parent / Teacher — the structural differentiator).
9. **Data table + Filters** (the admin story, one representative).
10. **Parental controls panel** + **Consent** (the K-12 trust headline).
11. **Sidebar → mobile tab bar shell** (the responsive requirement itself).
12. **States set** — empty / loading (Shimmer) / error (the polish layer).

---

### Sources
- [AI Elements (Vercel AI SDK)](https://elements.ai-sdk.dev)
- [The Shape of AI — UX pattern library](https://www.shapeof.ai/)
- [Student-Safe AI Tools in 2026 — SchoollyAI](https://schoollyai.com/blog/student-safe-ai-tools-2026/)
- [SAFE AI in K-12 schools — Alongside](https://www.alongside.care/learn/safe-ai-in-k-12-schools)
- [Teacher-Authored Prompts for Configuring Student–AI Dialogue (arXiv)](https://arxiv.org/html/2604.16738v1)
- [Designing Human-in-the-Loop for Agentic Workflows — AlignX AI](https://medium.com/@AlignX_AI/designing-human-in-the-loop-for-agentic-workflows-079faec737ed)
- [The 2026 Guide to Agentic Workflow Architectures — StackAI](https://www.stackai.com/blog/the-2026-guide-to-agentic-workflow-architectures)
- [ClassSync School Management Dashboard (multi-role: student/parent/teacher/admin)](https://contra.com/p/XMc23RUl-class-sync-school-management-dashboard-design-uiux)
