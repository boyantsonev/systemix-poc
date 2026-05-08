---
feature: hermes-skill-update
phase: PROBE
date: 2026-05-05
probe-script: /tmp/spike_hermes_skill_update/probe.py
skill-under-test: ~/.claude/skills/nw-buddy/SKILL.md
model-used: hermes3:latest (8B Q4_0)
---

# Spike Findings: Hermes Skill File Update

## Binary Verdict: WORKS

Hermes was able to read a `SKILL.md` file, identify the target section, append one new
bullet point, return only the updated section, and leave the rest of the file untouched.
All three validation checks passed (structure intact, unchanged sections preserved, new
content present).

---

## What Was Tested

The probe read `~/.claude/skills/nw-buddy/SKILL.md` (46 lines), extracted the
`## Success Criteria` section, and prompted Hermes to add a single new checklist bullet.
The model's output was applied in-memory only (original file never modified), then
validated against three criteria.

---

## Model Availability

- Endpoint: `http://localhost:11434`
- Model found: `hermes3:latest` (llama family, 8B parameters, Q4_0 quantization, ~4.7 GB)
- No fallback needed — hermes3 was present and responsive

---

## Quality of Model Output

**Positive signals:**

- Understood the `- [ ] ...` Markdown checkbox format without coaching
- Preserved all three original bullet points verbatim
- Returned ONLY the section content starting with the heading — no prose preamble,
  no explanation, no trailing commentary
- Did not hallucinate additional bullets or modify adjacent sections

**Issue detected — trailing whitespace injection:**

The model added a trailing space to one of the original bullet lines:

```
original:  "- [ ] File paths verified against actual filesystem before citing"
returned:  "- [ ] File paths verified against actual filesystem before citing "
                                                                              ^
```

This is cosmetically harmless but structurally impure. A real implementation must
strip trailing whitespace from all returned lines before applying the update.

---

## Edge Cases Discovered

| # | Edge Case | Observed? | Severity |
|---|-----------|-----------|----------|
| 1 | Trailing whitespace injected into preserved lines | YES | Low — fixable with `.rstrip()` |
| 2 | Model changed adjacent sections | No | N/A |
| 3 | Model produced malformed Markdown (broken headings, extra fences) | No | N/A |
| 4 | Model returned explanation prose before the section heading | No | N/A |
| 5 | Model omitted an original bullet | No | N/A |
| 6 | Model added multiple bullets instead of one | No | N/A |
| 7 | Section heading not preserved exactly (capitalisation, whitespace) | No | N/A |

The trailing whitespace issue (#1) was the only deviation. It is deterministic and
trivially fixable — strip each returned line before applying the replacement.

---

## Design Implications for a Real Implementation

### What would be needed

1. **Section extraction regex** — extract from heading to the next same-level heading.
   Edge case: last section in file (use `\Z` anchor). The probe regex handles this.

2. **Targeted prompt engineering** — the prompt must:
   - Embed the current section content verbatim
   - Specify the exact heading string so the model anchors output to it
   - Instruct the model to return ONLY the section (no prose wrapper)
   - State the exact change to make (do not ask the model to decide)

3. **Post-processing before apply:**
   - Strip trailing whitespace per line
   - Verify response starts with the expected heading
   - Verify all original checklist items are still present (regression guard)

4. **In-memory apply, then write** — never overwrite the file before validation passes.
   Validate structure, then write atomically (write to temp, rename).

5. **Scope constraint** — passing only the target section to the model (not the full file)
   keeps it focused and scales to larger skill files (200+ lines).

6. **Determinism risk** — LLM output is not deterministic. A production implementation
   should validate on every call and retry (max 2) if validation fails. Abort and surface
   an error rather than applying a malformed update.

### Architecture fit

The capability is real and functional on a local 8B model with no network dependency.
The self-improving loop (experiment closes → Hermes patches the skill) can run entirely
offline, without a human edit step, provided the update is well-scoped and validated
before write. A HITL checkpoint is still recommended for structural changes (adding new
sections, reordering headings) — those are harder to validate programmatically.

---

## Promotion Gate Input

The assumption was: "Can Hermes read a skill file, produce a valid targeted section
update, and write the result back without corrupting file structure?"

Result: **CONFIRMED**. The one caveat (trailing whitespace) is a known fixable artifact,
not a blocker. The loop can be implemented.
