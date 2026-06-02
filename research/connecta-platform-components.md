# Connecta Platform — Components & Patterns (educational + agentic)

**Issue:** #13 (M3) · **Builds on:** `connecta-component-inventory.md` (C1 — landing/DS inventory)
**Date:** 2026-06-02

> Deeper, platform-specific pass for `apps/platform` — the K-12 safe-chat + AI-coaching product. Centered on **decision F**: the components *and design rationale* for **human↔AI, AI↔human, and agent↔agent** interactions and their **microinteractions** (streaming, thinking, loading…). Does not repeat C1's inventory — this is the runtime interaction layer.

## Organizing idea: three interaction axes → three protocols
The 2026 agentic-UX consensus maps cleanly onto Connecta:

| Axis | What it is | Protocol | Connecta surface |
|---|---|---|---|
| **Human → AI** | the child/teacher inputs intent | **AG-UI** (event-based, user-facing) | prompt/voice input, suggestions, mode/model select |
| **AI → Human** | the coach streams back | **AG-UI** | streaming message, thinking trace, sources, confidence, follow-up checks |
| **AI → tools** | the coach acts | **MCP** | tool-call display, retrieval state |
| **Agent ↔ Agent** | coach hands off to a specialist/teacher-agent | **A2A** | handoff visualization, sub-agent status, approval gate |

Design rationale (2026): **motion communicates state and system intent, not decoration** — "calm interfaces, transparent AI." Every AI interface is judged on four properties: **capability transparency · recovery patterns · confidence display · accessibility.**

---

## A. Human → AI components
| Component | Notes (K-12) | Source |
|---|---|---|
| Prompt input | Large target, friendly placeholder; profanity/safe-input pre-filter | AI Elements |
| **Voice input + transcription** | First-class for young / pre-literate / motor-impaired learners (accessibility) | AI Elements |
| Suggestion chips | Scaffolded next-steps; reduce blank-page anxiety | Shape of AI (Wayfinders) |
| Mode / model selector | Hidden from students; teacher-facing only | AI Elements |
| Attachment / photo of homework | Moderated on upload | Custom |

## B. AI → Human components (+ microinteractions)
| Component | Microinteraction / state | Rationale |
|---|---|---|
| **Streaming message** | token-by-token; defer code/structured blocks until complete; **stop button** | streaming is the baseline 2026 expectation; interruptible |
| **Thinking / reasoning trace** | distinct "thinking" vs "retrieving" vs "generating" states | users assume the worst without explicit status; collapsible for kids |
| Tool-call display | "checking your lesson…" inline pill while MCP tool runs | capability transparency |
| Sources / inline citation | show what grounded the answer | trust |
| **Confidence display** | calibrated "I'm sure / let me check / I'm not certain" | confidence display property; safety-critical for tutoring |
| Follow-up check (Socratic) | "does that make sense? try the next step" turn-taking | core tutoring loop; checks understanding |
| Structured cards | quiz, lesson step, hint reveal | progressive disclosure |
| **Recovery / retry** | clear error + one-tap retry; never a dead end | recovery-patterns property |

## C. Agent ↔ Agent components (the "if needed" axis)
For when the coach escalates to a specialist agent or a human teacher.
| Component | Microinteraction | Rationale |
|---|---|---|
| **Handoff visualization** | "bringing in your teacher / a math specialist…" with context-preserved indicator | transparent handoffs + context preservation |
| Sub-agent status | per-agent state chips (idle/working/done) | orchestration transparency |
| Orchestration view (teacher) | directed-graph of agent steps (LangGraph-style) | override control over multi-step flows |
| **Approval gate (HITL)** | human-in-the-loop card between agents for sensitive actions | Governors; K-12 oversight |
| Shared-memory / context view | what the next agent will see | trust + privacy |

---

## Microinteraction state catalog (decision F core)
A single, named state machine the whole platform shares — **calm, state-communicating motion only**:
`idle · listening (voice) · typing · thinking · retrieving · generating (streaming) · tool-calling · awaiting-tool · handoff · awaiting-approval (HITL) · success · error→retry · interrupted (stopped) · rate-limited · offline`

Each maps to one Tamagui-animated primitive (Moti driver, cross-platform). No state is silent — silence reads as failure to a child.

---

## D. Learning components
Tutor turn-taking · step-by-step reveal · **hint escalation ladder** · adaptive difficulty signal (response-time/accuracy/engagement → skill-gap) · mastery/progress · lesson card · quiz · achievement/streak · **customizable pacing + TTS** (universal design).

## E. Administration components
Teacher **dual-mode** (lesson-planning vs live-class) · roster · **real-time engagement/progress monitor** · parent dashboard · reports/exports · assignment flows.

## F. Trust & Safety (K-12) — the differentiator (extends C1's 11 surfaces with runtime states)
1. **Clearly-non-human identity** (Identifier) — the coach never pretends to be a person.
2. AI disclosure + caveats on every session.
3. Content-moderation states (input + output) with kid-safe messaging.
4. **Escalation-to-human** — "let me get your teacher" handoff for sensitive/uncertain topics; **crisis-detection → immediate human**.
5. Parental controls + consent (COPPA/GDPR-K, age gate).
6. Memory / incognito toggle; footprints / audit log.
7. Safe-input feedback (gentle redirect, never punitive).
8. "I'm not sure" honesty pattern (tie to Confidence display).

## Persona-gated UI (Student / Parent / Teacher)
| Persona | Tone & priorities |
|---|---|
| **Student** | warm/playful (theme energy), large targets, voice-first option, heavy safety, hidden complexity |
| **Parent** | oversight, controls, consent, reports — calm/clear |
| **Teacher** | admin + planning + live monitoring + override; the orchestration/agent views live here |

The **persona switcher** gates which axes/surfaces appear (e.g., agent-orchestration view is teacher-only; model selector hidden from students).

---

## Priority — Platform v1 MVP (build first)
1. Streaming message + stop  2. Thinking/status states  3. Confidence display  4. Voice input + TTS  5. Follow-up-check turn-taking  6. Hint escalation  7. Tool-call display  8. Escalation-to-human handoff  9. Crisis-detection → human  10. Persona switcher  11. Parental consent/age gate  12. Progress/mastery card.

These exercise all three axes + the safety spine in one coherent first slice — built on the Connecta base theme (#9) with Tamagui + Moti microinteractions.

## Sources
- [Setproduct — AI chat interface anatomy & patterns](https://www.setproduct.com/blog/ai-chat-interface-ui-design) · [TheFrontKit — AI Chat UI best practices 2026](https://thefrontkit.com/blogs/ai-chat-ui-best-practices) · [UX Patterns — AI loading states](https://uxpatterns.dev/patterns/ai-intelligence/ai-loading-states)
- [Fuselab — Agent UX 2026](https://fuselabcreative.com/ui-design-for-ai-agents/) · [Agentic Design — UI/UX patterns](https://agentic-design.ai/patterns/ui-ux-patterns) · [Microsoft — Handoff orchestration](https://devblogs.microsoft.com/agent-framework/a-tour-of-handoff-orchestration-pattern/)
- [Envato — 2026 UX trends: calm interfaces, transparent AI](https://elements.envato.com/learn/ux-ui-design-trends)
- [Hunt Institute — AI tutoring in K-12](https://hunt-institute.org/resources/2025/06/ai-tutoring-alpha-school-personalized-learning-technology-k-12-education/) · [arXiv — Designing AI learning experiences for K-12](https://arxiv.org/pdf/2009.10228)
