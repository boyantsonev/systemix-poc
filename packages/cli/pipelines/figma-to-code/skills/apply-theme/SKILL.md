---
name: apply-theme
description: Apply a client brand via token overrides only — no component changes required. Generates a theme CSS file and reports coverage.
argument-hint: [client-name] [figma-variables-url?]
---

# /apply-theme — Apply Client Theme

Apply brand theme for: $ARGUMENTS

## Usage
```
/apply-theme [client-name]
/apply-theme [client-name] [figma-variables-url]
```

## Steps
1. Parse client name and optional Figma variables URL from arguments
2. If Figma URL: call `mcp__claude_ai_Figma__get_variable_defs` to extract brand variables
3. Audit theme readiness: are components using semantic tokens or hardcoded values?
4. Report "theme readiness score" before generating — Score = (components using CSS vars / total components) × 100. Report as X% theme-ready.
5. Generate `tokens/themes/[client].css` with semantic token overrides only
6. Output: tokens overridden, components affected, visual coverage %, drift risks

## Output format
```css
[data-theme="client"] {
  --color-primary: [brand-primary];
  --color-background: [brand-background];
  --radius-base: [brand-radius];
}
```

## Goal: a full rebrand touching only the tokens layer, zero component changes
