---
name: drift-report
description: Audit the codebase for design-code drift — hardcoded colors, spacing, and type scales that should reference tokens. Produces a structured report with severity levels.
argument-hint: [path or figma-url]
---

# /drift-report — Design Drift Audit

Audit for design-code drift: $ARGUMENTS

## Usage
```
/drift-report                        # audit full component library
/drift-report src/components/ui/     # scope to a directory
/drift-report [figma-url]            # also compare Figma values vs token file
```

## Steps
1. Scan for hardcoded values: hex colors (#3B82F6), px spacing (mt-[24px]), font sizes (text-[14px])
2. Cross-reference with token files — flag values that have a token equivalent
3. If Figma URL provided: call `mcp__claude_ai_Figma__get_variable_defs`, diff against CSS token file
4. Generate report with Critical (token exists, not used) and Warning (no token match) categories
5. Suggest exact edits to fix each critical finding

## Output format
```
# Design-Code Drift Report
- Components audited: X
- With drift: Y
- Total instances: Z
| File | Line | Hardcoded | Should Use |
```
