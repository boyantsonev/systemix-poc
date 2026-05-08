<!-- markdownlint-disable MD024 -->
# User Stories — Agentic Loop Thesis
**DISCUSS wave — Agentic Loop Thesis**
**Date:** 2026-05-05
**Persona:** Tomas Brandt — pre-PMF founder, vibe-coding with Claude Code, running PostHog experiments
**JTBD trace:** All stories trace to JOB-001 (evidence-permanence-at-decision-time, jobs.yaml)

## System Constraints

- No banned terms in any copy or AC: `memory layer`, `living system of record`, `single source of truth`, `AI-powered`, `intelligent`
- All CLI interactions follow `systemix [noun] [verb]` pattern consistently
- Contract format: DESIGN.md frontmatter extension (adopts Google DESIGN.md as carrier per beta brief Move 2)
- Hermes must run locally via Ollama — no cloud LLM dependency for the synthesis step
- PostHog is the only validated evidence source in this scope; other analytics tools are out of scope for these stories
- Stories are sized for the pre-PMF founder ICP only; design-engineer ICP stories are out of scope this wave

---

## US-001: Hypothesis Contract Initialisation

### Problem
Tomas is a solo founder who is about to run his fourth landing page experiment this quarter. He finds it tedious to keep a structured record of each hypothesis because Notion pages go stale and are never read when the next related decision comes up. His workaround is a Slack thread that is buried within two weeks.

### Who
- Pre-PMF founder (1–3 person team) | Running 2+ concurrent experiments | Using PostHog as primary analytics

### Solution
A CLI command that creates a structured hypothesis contract file in the repo at the moment an experiment starts — committed alongside the code change it describes.

### Domain Examples

#### 1: Happy path — Tomas initialises before running an experiment
Tomas is changing his pricing page headline. Before he pushes the change, he runs `systemix experiment init "pricing-headline-v2"`. Systemix creates `contract/hypotheses/pricing-headline-v2.md` with DESIGN.md frontmatter, asks him for hypothesis, variants, and primary PostHog event, and commits the file. The experiment is now tracked.

#### 2: Edge case — Tomas initialises after the experiment is already running
Tomas forgot to initialise before pushing. The experiment has been running for 2 days. He runs `systemix experiment init "onboarding-step-3" --started-at 2026-05-03`. Systemix creates the contract backdated to the start date and notes `retrospective: true` in the frontmatter.

#### 3: Error — PostHog event name does not match any known event
Tomas types `signup_completed` but his PostHog event is actually `signup-completed` (hyphen, not underscore). Systemix checks the PostHog API, finds no matching event, and surfaces the closest match: "Did you mean `signup-completed`? (y/n)". Tomas confirms. The contract is created with the correct event name.

### UAT Scenarios (BDD)

#### Scenario: Hypothesis contract created before experiment starts
Given Tomas has PostHog configured with key `phx_test123` in his environment
And he is in the root of his project directory `/Users/tomas/founders-app`
When he runs `systemix experiment init "pricing-headline-v2"`
And enters his hypothesis, variants, and primary event `signup-completed`
Then a file exists at `contract/hypotheses/pricing-headline-v2.md`
And the file contains a `hypothesis` field, a `variants` field, and an `evidence_source` field pointing to PostHog
And the file is committed to git with message `chore(experiment): init pricing-headline-v2`
And Tomas sees "Contract created. Hermes is now watching `signup-completed`."

#### Scenario: Contract creation is blocked by unknown PostHog event
Given Tomas has PostHog configured
And he enters primary event `signup_completed` (underscore)
And PostHog API returns no match for that event
When Systemix validates the event name
Then Systemix displays "No PostHog event found: `signup_completed`. Did you mean `signup-completed`?"
And waits for Tomas to confirm or enter a different event name
And does not create the contract file until a valid event is confirmed

#### Scenario: Retrospective contract creation for an in-flight experiment
Given an experiment has been running for 2 days without a contract
When Tomas runs `systemix experiment init "onboarding-step-3" --started-at 2026-05-03`
Then the contract is created with `started_at: 2026-05-03` in frontmatter
And a `retrospective: true` field is present
And Systemix warns "Experiment already running. Evidence before 2026-05-03 will not be captured."

### Acceptance Criteria
- [ ] `systemix experiment init <name>` creates a DESIGN.md contract file at `contract/hypotheses/<name>.md`
- [ ] Contract file contains: `hypothesis`, `variants`, `evidence_source` (PostHog event), `confidence_threshold` (default 95%), `started_at`, `status: running`
- [ ] PostHog event name is validated against the PostHog API before contract is written; invalid names trigger a did-you-mean prompt
- [ ] Contract file is committed to git automatically with a standard commit message
- [ ] `--started-at` flag allows retrospective initialisation with a `retrospective: true` field
- [ ] First successful init displays the count of open experiments and Hermes watch status

### Outcome KPIs
- **Who:** Pre-PMF founder running PostHog experiments
- **Does what:** Creates a hypothesis contract before running the experiment (not after)
- **By how much:** >70% of experiments initialised before PostHog data collection begins (not retrospectively)
- **Measured by:** `started_at` vs `retrospective: true` field ratio in contract files
- **Baseline:** 0% (no contracts exist today)

### Technical Notes
- Contract format: DESIGN.md frontmatter extension (see beta brief Move 2 — adopt Google DESIGN.md as carrier)
- PostHog event validation requires read access to PostHog API (existing integration)
- Git commit is authored by Systemix with `[skip ci]` tag to avoid triggering CI on every experiment init

**Size:** S | **JOB-001 trace:** JOB-001 step `define` — "Teams define hypotheses verbally or in Notion, unstructured" | **Priority:** P1 (walking skeleton step 1)

---

## US-002: Hermes Significance Watch

### Problem
Tomas is a solo founder who runs PostHog experiments but misses the moment they reach significance. He checks the PostHog dashboard manually every few days, often acting on data that is not yet significant (false positive) or waiting too long after significance is reached (delayed decision). His workaround is a PostHog alert email that fires at 100 events — a threshold that has no statistical basis.

### Who
- Pre-PMF founder | PostHog user running 2+ concurrent experiments | Using local Ollama (Hermes installed)

### Solution
Hermes watches the PostHog API for each open experiment contract. When the configured confidence threshold is reached, Hermes synthesises the result and places a decision card in the HITL queue. Tomas does not need to be watching PostHog at that moment.

### Domain Examples

#### 1: Happy path — Hermes detects significance and queues a card
Tomas's pricing-headline-v2 experiment reaches 94.3% confidence at 9:17am on 2026-05-12. Tomas is writing code. Hermes places the decision card in the queue. When Tomas runs `systemix queue` at 10:30am, the card is waiting.

#### 2: Edge case — significance reached with low traffic (borderline n)
Tomas's experiment reaches 92% confidence with only n=234 visitors. The configured threshold is 95%. Hermes does not queue the card but updates the experiment status to "trending — not yet significant" and surfaces it as a low-priority item in the queue with the current confidence level shown.

#### 3: Error — PostHog API key expires mid-experiment
Hermes tries to poll PostHog and receives a 401. Systemix surfaces a notification on the next `systemix queue` run: "PostHog connection lost for pricing-headline-v2. Check POSTHOG_API_KEY. Last successful poll: 2026-05-11 18:00."

### UAT Scenarios (BDD)

#### Scenario: Decision card appears when experiment reaches confidence threshold
Given the experiment `pricing-headline-v2` has been running for 8 days
And the configured confidence threshold is 95%
And PostHog reports variant B at 94.3% confidence with n=847
When Hermes polls PostHog at its next scheduled interval
Then a decision card for `pricing-headline-v2` appears in the HITL queue
And the card displays: variant name, conversion lift percentage, confidence level, sample size, and Hermes's recommended action

#### Scenario: Below-threshold experiment is flagged but not queued
Given an experiment has reached 82% confidence with n=190
And the configured threshold is 95%
When Tomas runs `systemix queue`
Then the queue shows "1 experiment trending — not yet significant"
And the experiment displays current confidence and estimated additional sample needed
And no approval action is available until threshold is reached

#### Scenario: PostHog polling failure is surfaced on next queue check
Given Hermes has been unable to poll PostHog for 6+ hours due to an expired API key
When Tomas runs `systemix queue`
Then the queue displays a connectivity warning for the affected experiments
And the warning includes the last successful poll timestamp
And instructions for resolving the PostHog connection are shown

### Acceptance Criteria
- [ ] Hermes polls PostHog at a configurable interval (default: every 4 hours)
- [ ] When an experiment's primary event reaches the configured confidence threshold, a decision card is created in the HITL queue automatically
- [ ] Decision card includes: experiment name, winning variant, conversion lift, confidence percentage, sample size, observation window in days, Hermes's recommended action (promote/iterate/kill)
- [ ] Below-threshold experiments are surfaced as "trending" in the queue with current confidence and estimated sample needed, but without an approval action
- [ ] PostHog connectivity failures are surfaced on the next `systemix queue` run with last-successful-poll timestamp and resolution instructions
- [ ] Hermes watch runs as a background process that persists across terminal sessions (daemon or scheduled job)

### Outcome KPIs
- **Who:** Pre-PMF founder with open experiments
- **Does what:** Receives a decision card within 4 hours of an experiment reaching significance (instead of checking PostHog manually)
- **By how much:** 100% of experiments that reach significance produce a HITL card — zero missed significance events
- **Measured by:** Ratio of PostHog significance events to HITL cards generated (should be 1:1)
- **Baseline:** 0% automated (all manual today)

### Technical Notes
- Hermes runs via Ollama locally — no cloud API calls for the synthesis step
- Hermes synthesis acceptance rate must reach >80% unmodified per SPIKE 1 validation criterion
- Polling interval is configurable in `.systemix/config.yaml`; default 4 hours balances responsiveness with API quota

**Size:** M | **JOB-001 trace:** JOB-001 steps `confirm` + `monitor` — "No mechanism to know when an experiment has enough data to decide" | **Priority:** P2 (riskiest assumption — Hermes quality)

---

## US-003: HITL Queue Review and Decision

### Problem
Tomas is a solo founder who needs to make a call on a PostHog experiment result. He finds it frustrating to open PostHog, locate the experiment, interpret the statistical output, and then manually write the decision somewhere. His workaround is to approve or reject variants from memory, with no record of the rationale.

### Who
- Pre-PMF founder | Has a decision card waiting in the HITL queue | Wants to close the decision in under 2 minutes

### Solution
The HITL queue presents one card at a time. Each card contains Hermes's synthesis — the reading has already been done. Tomas reviews, approves or edits, and the loop closes with one keystroke.

### Domain Examples

#### 1: Happy path — Tomas approves Hermes's recommendation
Tomas opens the queue. The card for `pricing-headline-v2` is waiting. Hermes has summarised: variant B +14%, 94.3% confidence, consistent across mobile and desktop. Tomas presses `a` to approve. The contract is updated. Git commit is created. Done in 45 seconds.

#### 2: Edge case — Tomas disagrees with Hermes's recommendation
Hermes recommends "promote" but Tomas knows from a customer call that the variant B headline is misleading — it generated signups but the activation rate on those signups was lower. He presses `e` to edit the rationale, changes the decision to "iterate" with a note about activation rate, and approves. The edited rationale is written to the contract.

#### 3: Error — Tomas defers a decision and comes back later
Tomas is in the middle of something important. He presses `d` to defer the card. The card stays in the queue. Seven days later, the card is re-surfaced with a "pending 7 days" label. Tomas makes the call.

### UAT Scenarios (BDD)

#### Scenario: Decision card reviewed and approved in under 2 minutes
Given a decision card for `pricing-headline-v2` is in the HITL queue
And the card contains Hermes's synthesis with variant, lift, confidence, and recommended action
When Tomas runs `systemix queue` and presses `a` to approve
Then the experiment contract at `contract/hypotheses/pricing-headline-v2.md` is updated with `decision: promote`, `decided_at`, `evidence_source`, `confidence`, `winning_variant`, and `rationale`
And a git commit is created with message `chore(evidence): close pricing-headline-v2`
And Tomas sees "Loop closed. Evidence written to contract."
And the card is removed from the queue

#### Scenario: Founder edits Hermes rationale before approving
Given a decision card with Hermes recommendation "promote"
When Tomas presses `e` to edit the rationale
And changes the decision to `iterate` and adds "activation rate on variant B cohort was 12% lower — investigate before promoting"
And presses `a` to approve the edited version
Then the contract is written with the founder's rationale, not Hermes's original
And the `rationale_source: founder-edited` field is written to the contract

#### Scenario: Deferred card is re-surfaced after 7 days
Given Tomas pressed `d` to defer a decision card 7 days ago
When Tomas runs `systemix queue`
Then the card appears with label "Pending 7 days — needs a call"
And the card is prioritised above any newer cards in the queue
And the "defer" option is still available but shows "deferred 2x" if deferred again

### Acceptance Criteria
- [ ] `systemix queue` displays all pending HITL cards in order of time-pending (oldest first)
- [ ] Each card shows: experiment name, winning variant, lift percentage, confidence, sample size, observation window, Hermes's recommended action (promote/iterate/kill)
- [ ] Single-keystroke actions available: `a` (approve), `e` (edit rationale), `d` (defer), `k` (kill experiment)
- [ ] On approve: contract frontmatter is updated with `decision`, `decided_at`, `evidence_source`, `confidence`, `winning_variant`, `rationale` fields; git commit is created automatically
- [ ] On edit: founder's edited rationale overwrites Hermes's synthesis; `rationale_source: founder-edited` is written to the contract
- [ ] Deferred cards are re-surfaced after 7 days with a "pending N days" label and are prioritised at the top of the queue
- [ ] Approved card is removed from the queue; the contract status changes from `running` to `closed`

### Outcome KPIs
- **Who:** Pre-PMF founder with a pending HITL card
- **Does what:** Closes the decision (approves, edits, or kills) within 48 hours of card appearing
- **By how much:** >80% of cards closed within 48 hours of appearance (not deferred indefinitely)
- **Measured by:** Time-to-close per card (from card creation to `decision` field written in contract)
- **Baseline:** No baseline — this behaviour does not exist today

### Technical Notes
- Contract write must be atomic — partial writes leave the contract in an inconsistent state; use a temp-file-and-rename pattern
- Git commit requires a clean working tree in the `contract/` directory; if dirty, surface a warning and do not commit automatically
- The `rationale` field in the contract should be plain English, not structured data — it is read by agents and humans equally

**Size:** M | **JOB-001 trace:** JOB-001 step `execute` — "Decision made verbally or in Slack, not recorded" + step `modify` — "Results do not flow back to the artifact that was changed" | **Priority:** P1 (walking skeleton — this IS the loop closure)

---

## US-004: Agent Reads Evidence Contract Before Acting

### Problem
Tomas is a solo founder whose Claude Code agent refactors a component that was the subject of a closed experiment. The agent has no awareness of the prior experiment. It reverts the winning variant — the headline that drove +14% signups — back to the control. Tomas discovers this two days later when PostHog shows a signup drop. His workaround is to manually prefix every agent prompt with "don't change the pricing headline."

### Who
- Pre-PMF founder | Using Claude Code with Systemix MCP configured | Has at least one closed experiment contract in the repo

### Solution
The Systemix MCP server exposes a `get_experiment_evidence` tool that Claude Code calls before acting on any file that has a corresponding hypothesis contract. The agent cites the evidence in its response. It does not revert closed experiments.

### Domain Examples

#### 1: Happy path — agent reads evidence before refactoring
Tomas asks Claude Code to "refactor the pricing page for clarity." Claude Code calls `systemix:get_experiment_evidence` for `pricing-page`. The MCP returns the closed `pricing-headline-v2` contract: variant B promoted, +14%, 94.3% confidence. Claude Code preserves "Ship faster with evidence." in the refactor and cites the evidence in its response.

#### 2: Edge case — no experiment contract exists for this file
Tomas asks Claude Code to work on `onboarding-step-4.tsx`, which has no hypothesis contract. The MCP returns an empty evidence set. Claude Code proceeds without evidence constraints and notes "No experiment evidence found for this file."

#### 3: Error — MCP server is not running
Claude Code calls `systemix:get_experiment_evidence` and gets a connection error. Claude Code falls back to acting without evidence context and adds a warning in its response: "Systemix MCP not available — proceeding without experiment evidence. Run `systemix mcp start` to enable evidence-aware mode."

### UAT Scenarios (BDD)

#### Scenario: Agent preserves winning variant when refactoring an evidenced component
Given `contract/hypotheses/pricing-headline-v2.md` has `decision: promote` and `winning_variant: B`
And the Systemix MCP server is running
When Tomas asks Claude Code to refactor the pricing page
Then Claude Code calls `systemix:get_experiment_evidence` for the pricing page component
And Claude Code's response includes the evidence summary: "Evidence contract shows variant B promoted (+14% signup, 94.3% confidence)"
And the refactored code preserves "Ship faster with evidence." as the headline
And no change is made to the evidenced element without an explicit override from Tomas

#### Scenario: Agent notes absence of evidence for unevidenced files
Given no hypothesis contract exists for `onboarding-step-4.tsx`
When Tomas asks Claude Code to refactor that component
Then Claude Code calls `systemix:get_experiment_evidence` and receives an empty result
And Claude Code notes "No experiment evidence found for this file — proceeding without evidence constraints"
And Claude Code proceeds with the refactor normally

#### Scenario: Agent gracefully handles MCP server unavailability
Given the Systemix MCP server is not running
When Claude Code attempts to call `systemix:get_experiment_evidence`
Then Claude Code receives a connection error
And Claude Code includes a warning: "Systemix MCP not available — run `systemix mcp start` to enable evidence-aware mode"
And Claude Code proceeds with the task rather than blocking on the error

### Acceptance Criteria
- [ ] Systemix MCP server exposes a `get_experiment_evidence` tool that accepts a file path or component name and returns all closed experiment contracts related to that file
- [ ] The returned contract data includes: `decision`, `winning_variant`, `confidence`, `rationale`, `decided_at`, `evidence_source`
- [ ] Claude Code (and any MCP-compatible agent) can call this tool without additional configuration beyond adding the Systemix MCP to their MCP server list
- [ ] MCP server starts with `systemix mcp start` and runs as a local process
- [ ] When MCP is unavailable, agents receive a structured error that includes recovery instructions (not a silent failure)
- [ ] `systemix mcp status` shows whether the server is running, which experiments are indexed, and when the index was last updated

### Outcome KPIs
- **Who:** Pre-PMF founder using Claude Code with Systemix MCP
- **Does what:** Agent cites experiment evidence in its response when acting on an evidenced component
- **By how much:** 100% of agent calls on evidenced components reference the evidence without prompting (zero silent reversions of closed experiments)
- **Measured by:** Manual review of agent responses on evidenced components — does the response cite the contract? (requires observational testing, SPIKE 3)
- **Baseline:** 0% — agents currently have no awareness of experiment history

### Technical Notes
- MCP server implementation: follows Claude Code MCP specification
- Evidence index: built from `contract/hypotheses/` directory on `systemix mcp start`; refreshed when a new contract is closed
- File-to-contract mapping: the MCP uses a fuzzy match on the contract's `artifact_path` field (set during `experiment init`) to identify which contracts relate to which source files
- SPIKE 3 from beta brief is the feasibility validation for this story — it must pass before this story is scheduled for DESIGN wave

**Size:** M | **JOB-001 trace:** JOB-001 step `conclude` — "Contract is the permanent record; agent reads it on next /component or /generate call" + ODI-3 — "Minimize the likelihood that an AI agent acts on an artifact without awareness of the experiments and decisions that produced it" | **Priority:** P3 (high value, depends on US-003)

---

## US-005: Experiment Status Dashboard (Queue Overview)

### Problem
Tomas is a solo founder running 3 concurrent experiments. He finds it mentally taxing to remember which experiments are running, which are close to significance, and which he has not looked at in two weeks. His workaround is a sticky note on his monitor with experiment names and rough notes.

### Who
- Pre-PMF founder | Running 2+ concurrent experiments | Wants a single command to orient before starting work

### Solution
`systemix status` shows all open experiments with their current state: confidence level, days running, sample size, and whether a card is waiting in the queue. One command replaces the sticky note.

### Domain Examples

#### 1: Happy path — Tomas checks status at the start of a work session
Tomas runs `systemix status`. Three experiments are shown: pricing-headline-v2 (card ready in queue), onboarding-step-3 (82% confidence, trending), cta-button-color (12% confidence, early). He goes to the queue first to close the pricing headline card.

#### 2: Edge case — all experiments are early-stage, queue is empty
No experiments have reached significance. The status screen shows all three experiments as early-stage with days elapsed and current confidence. Tomas sees "Queue empty — nothing to decide today" and continues building.

#### 3: Error — Hermes has been offline for 24 hours
The status screen shows a warning: "Hermes offline 24h — confidence levels may be stale." The last known confidence levels are shown with a `[stale]` label.

### UAT Scenarios (BDD)

#### Scenario: Status screen shows all experiments with current confidence
Given three experiments are open with different confidence levels
When Tomas runs `systemix status`
Then each experiment is shown with: name, days running, current confidence percentage, sample size, and status (early/trending/ready/card-waiting)
And experiments with cards in the queue are highlighted at the top
And the total count of open experiments and pending decisions is shown in the header

#### Scenario: Empty queue is communicated clearly
Given no experiments have reached significance
When Tomas runs `systemix status`
Then the queue shows "0 decisions pending"
And all open experiments are listed with their current confidence levels
And the message "Nothing to decide today" is shown — not a blank screen

#### Scenario: Stale data is flagged when Hermes is offline
Given Hermes has not polled PostHog in more than 12 hours
When Tomas runs `systemix status`
Then confidence levels are shown with a `[stale]` label
And the time of last successful poll is displayed
And instructions to restart Hermes are shown

### Acceptance Criteria
- [ ] `systemix status` displays all open experiments (status: running) in a single screen output
- [ ] Each experiment row shows: name, days running, current confidence %, sample size, status label (early/trending/ready/card-waiting)
- [ ] Experiments with pending HITL cards are shown first, distinguished visually (e.g. `[READY]` label)
- [ ] An empty queue is communicated with a positive message ("Nothing to decide today") — not a blank screen
- [ ] When Hermes has not polled for >12 hours, confidence levels are shown with a `[stale]` label and last-poll timestamp
- [ ] `systemix status` completes in <2 seconds (reads from local cache, does not block on PostHog API)

### Outcome KPIs
- **Who:** Pre-PMF founder with 2+ open experiments
- **Does what:** Runs `systemix status` at the start of a work session instead of opening PostHog
- **By how much:** >60% of work sessions for active users begin with a `systemix status` call (measured by command telemetry if telemetry is opted in)
- **Measured by:** Command frequency telemetry (opt-in only) or cohort survey at 30-day mark
- **Baseline:** 0% — behaviour does not exist today

### Technical Notes
- Status reads from a local cache (`.systemix/state.json`) updated by Hermes on each poll cycle — `systemix status` must never block on a live API call
- Cache TTL warning threshold: 12 hours. At 24 hours, show a prominent warning.
- Colour convention: green = card ready, yellow = trending, dim = early, red = stale

**Size:** S | **JOB-001 trace:** JOB-001 step `monitor` — "No live view of which hypotheses are open, stalled, or ready" | **Priority:** P2 (supports queue discoverability — onboarding goal Priority 4)

---

## DoR Validation

| DoR Item | US-001 | US-002 | US-003 | US-004 | US-005 |
|---|---|---|---|---|---|
| Problem statement clear, domain language | PASS | PASS | PASS | PASS | PASS |
| User/persona identified with specific characteristics | PASS | PASS | PASS | PASS | PASS |
| 3+ domain examples with real data | PASS | PASS | PASS | PASS | PASS |
| UAT scenarios in Given/When/Then (3-7) | PASS (3) | PASS (3) | PASS (3) | PASS (3) | PASS (3) |
| AC derived from UAT | PASS | PASS | PASS | PASS | PASS |
| Right-sized (1-3 days, 3-7 scenarios) | PASS (S) | PASS (M) | PASS (M) | PASS (M) | PASS (S) |
| Technical notes: constraints/dependencies | PASS | PASS | PASS | PASS | PASS |
| Dependencies tracked | PASS | PASS | US-002 (Hermes) | US-003 (loop close), SPIKE 3 | PASS |
| Outcome KPIs defined with measurable targets | PASS | PASS | PASS | PASS | PASS |
| Traceable to JOB-001 | PASS | PASS | PASS | PASS | PASS |
| Banned terms absent | PASS | PASS | PASS | PASS | PASS |

**DoR Status: ALL PASSED**

### Dependency map
- US-001 has no dependencies
- US-002 depends on US-001 (contract exists to watch)
- US-003 depends on US-002 (card exists to review)
- US-004 depends on US-003 (closed contract exists to expose via MCP) AND requires SPIKE 3 to confirm feasibility
- US-005 depends on US-002 (Hermes cache exists to read)

### Walking skeleton
US-001 → US-002 → US-003 forms the minimum end-to-end loop: init experiment → Hermes detects significance → founder closes the loop. US-004 (agent reads evidence) is the payoff. US-005 (status) is supporting infrastructure for onboarding retention.
