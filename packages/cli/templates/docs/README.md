# Design-system docs

Documentation for this repo's design system components — written to be
consumed by **humans** (read the pages) and by **agents** (frontmatter +
manifest are the machine contract).

## Layout

```
docs/
  README.md               ← you are here (the consumption contract)
  manifest.json           ← GENERATED component inventory (the agent entry point)
  components/
    _template.md          ← the per-component doc contract
    <slug>.md             ← one doc per component (skeletons until filled)
```

## How to consume

**Human:** start at `manifest.json` for the inventory or browse
`docs/components/`. Visual truth lives in the running app; when a doc's
`gallery` frontmatter is set, it names where to look.

**Agent:** read `docs/manifest.json` first — it maps every component to its
doc, source file, reference implementation, and status. Then read the doc's
frontmatter before the body. Rules of precedence:

1. `design/tokens.css` is canonical for values; `design/guardrails.mdx` for
   rules; `design/DESIGN.md` for rationale.
2. The component's **source** (the `source` path) is canonical for props and
   behavior. The doc summarizes; when they disagree, the source wins and the
   doc should be regenerated.
3. The **reference** (the `reference` path, when present) is the design
   intent the component was ported from — consult it for "why", never copy
   values from it.

## Doc contract

Every `docs/components/<slug>.md` carries frontmatter per `_template.md`:
`name · slug · group · status (ported|skeleton|deprecated) · source ·
reference · gallery · platforms · related`. Body sections in order:
**What & when · Props · Usage · States & variants · Platform notes &
deviations · Do & don't**.

## Regenerating

```
npx @getsystemix/cli docs sync                        # rebuild manifest.json from doc frontmatter
npx @getsystemix/cli docs sync --check                # CI guard: fails if the manifest is stale
npx @getsystemix/cli docs new <Name> --group <group>  # scaffold a new skeleton doc
```

The docs ARE the inventory: `manifest.json` is generated **from the
frontmatter of `docs/components/*.md`** — add a component by adding its doc
(`docs new`), never by editing the manifest. `docs sync` owns the manifest
only; it never touches doc bodies. Filling and refreshing bodies is the job
of the `/document` skill, which reads source + reference + this contract and
proposes doc updates as HITL diffs.
