# Option: --docs, component docs from source

Fills the component docs in `docs/components/<slug>.md` from the real component source, one
component per yes, and keeps `docs/manifest.json` in step. The paths stay where an existing
install already has them.

## 1. What needs a doc

1. `node "${CLAUDE_PLUGIN_ROOT}/scan/product-studio.js" docs sync --check --json`. It writes nothing and reports drift between
   `docs/components/*.md` and `docs/manifest.json`. If it reports drift, show it and propose
   `node "${CLAUDE_PLUGIN_ROOT}/scan/product-studio.js" docs sync` (it writes the manifest) as its own yes.
2. Read `docs/manifest.json` if it exists. Pick the component the person named, else the
   entries whose `status` is `skeleton`, in manifest order.
3. A component with no doc yet starts from `${CLAUDE_PLUGIN_ROOT}/templates/docs/components/_skeleton.md`.
   Propose the new file; write it only after the yes.

## 2. Read the truth, in this order

1. **The source**: the file named by the doc's `source` frontmatter. It is canonical for props
   and behaviour.
2. **The reference**: the doc's `reference` path, if there is one. Use it for intent and the
   reason why, never for values.
3. **The template**: `${CLAUDE_PLUGIN_ROOT}/templates/docs/components/_skeleton.md`, for the sections.

Never invent. If the source can't be read, say so under "couldn't read" and skip the
component.

## 3. The props table comes from code

```
node "${CLAUDE_PLUGIN_ROOT}/scan/product-studio.js" docs props <component-source-file> --json
```

It prints `{component, props[{name, type, required}]}`. The doc's props table has exactly those
rows: the same names, types and required flags. Add a default or a note only when you can point
to the line of source that shows it. A prop you can't find in this output does not go in the
table.

## 4. Write the body (proposed as a diff)

- **What and when**: one or two plain sentences.
- **Props**: the table from step 3.
- **Usage**: a short working snippet with the real import path.
- **States and variants**: the variants, sizes and states in the source, and the tokens that
  carry them (names from `design/tokens.css`).
- **Deviations**: anything that differs from the system on purpose, citing the decision
  (`design/decisions/D-NNN-<slug>.md`) or goal (`G-NNN`) that recorded it. No citation, no
  deviation: list it as an open question.
- **Do and don't**: short imperatives, each tied to a rule ID from `design/rules.md` where one
  applies.

Frontmatter stays as it is. The one allowed change is the status flip away from `skeleton`, to
the value the manifest already uses for a filled doc (ask if the manifest has none yet).

Show the diff for this one component and wait for the yes. Then the next component.

## 5. Verify

After each write, `node "${CLAUDE_PLUGIN_ROOT}/scan/product-studio.js" docs sync --check --json`. If it reports drift, propose
`node "${CLAUDE_PLUGIN_ROOT}/scan/product-studio.js" docs sync` and the manifest change in the same yes. Then `node "${CLAUDE_PLUGIN_ROOT}/scan/product-studio.js" docs props` again on
the source and compare the names with the table you wrote; any mismatch is a failure to fix,
not to explain away.

Return to the setup guide for the reply and the run-log row.
