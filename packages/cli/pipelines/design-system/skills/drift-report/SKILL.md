---
name: drift-report
description: Code-only audit for design-code drift — hardcoded colors, spacing, and type values that should reference the tokens in design/tokens.css, checked against the rules in design/guardrails.mdx. No Figma required. Produces a structured report with severity levels.
argument-hint: [path]
---

# /drift-report — Design Drift Audit (code-first)

Audit for design-code drift: $ARGUMENTS

## Usage
```
/drift-report                        # audit the whole repo
/drift-report src/components/ui/     # scope to a directory
```

## Steps
1. **Load the design system** — read the canonical tokens from `design/tokens.css`
   (the `:root` / `.dark` custom properties) and the rules from `design/guardrails.mdx`.
2. **Scan the code** ($ARGUMENTS, else the repo) for hardcoded values the guardrails
   forbid: hex colors (`#3B82F6`), raw `rgb()/hsl()`, px spacing (`mt-[24px]`), and
   font sizes (`text-[14px]`).
3. **Cross-reference** each hardcoded value against `design/tokens.css`:
   - **Critical** — a token with that value exists; the code should reference it instead.
   - **Warning** — no token matches; either add a token to `design/tokens.css` or confirm it's intentional.
4. **Apply the guardrails** in `design/guardrails.mdx` (no raw hex/px, spacing on the scale, type from tokens, etc.).
5. **Suggest the exact edit** for each Critical finding (the token reference to use).

## Output format
```
# Design-Code Drift Report
- Files audited: X · with drift: Y · total instances: Z
| File | Line | Hardcoded | Should use (token) | Severity |
```

## Notes
- **Code-only**: no Figma, no design tool. The source of truth is `design/tokens.css`.
- Run it as a CI gate (the scheduled routine runs it) — failing on new Critical drift keeps code true to the design system.
- Autonomy: reconciling drift is a `record` artifact (auto at every tier); proposing a NEW token or a tighter guardrail is a separate, always-HITL path (`/hermes`).
- Pushing the repo's tokens *out* to a design tool is the optional Figma adapter, not this skill.
