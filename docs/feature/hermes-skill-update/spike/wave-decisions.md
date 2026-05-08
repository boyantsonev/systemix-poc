# SPIKE Decisions — hermes-skill-update

## Assumption Tested
Can Hermes (local Ollama LLM, hermes3) read a SKILL.md file, produce a valid targeted update to a specific section, and write the result back without corrupting file structure?

## Probe Verdict
WORKS: hermes3:latest (8B Q4_0) extracted the Success Criteria section from nw-buddy/SKILL.md, added one bullet point, returned only the section content, and left all other sections intact. One edge case: trailing whitespace injected on preserved lines — fixed with .rstrip().

## Promotion Decision
DISCARD: Findings answer the question and give DESIGN what it needs. Feature not yet on the roadmap — Move 5 distribution is the immediate priority.

## Design Implications
- Pass only the target section to the model (not the full file)
- Prompt must embed current section verbatim + name exact heading
- Post-process: strip trailing whitespace, verify heading preserved, verify original bullets present
- In-memory validate before write — never touch the real file until validation passes
- Retry cap of 2 — abort on malformed output rather than apply
- HITL still required for structural edits (new sections, reordering); bullet-level updates safe to automate

## Constraints Discovered
- hermes3 8B is capable of scoped section edits with tight prompting
- Trailing whitespace injection is a consistent behaviour — must be normalized in any real implementation
