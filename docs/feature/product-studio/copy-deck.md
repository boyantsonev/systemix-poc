# Copy deck: the landing on the product studio (2026-11-12)

Systemix is the proof-of-concept brand for the studio until contextcraft has its domain and
brand. The words live in `src/lib/landing/content.ts`; this file records why they say what they
say. The thesis comes from the founder: designers won't be replaced, they'll evolve. The studio is
free; a designer setting it up for a product is what we sell.

## Order

Hero · who uses it · five commands · how a goal ships (diagram) · rules as data · it improves itself
(diagram) · how it works · pricing · FAQ · install again. The old proof section (the earlier scan's
score) is gone until the studio's own score runs on this repo; "Docs" points at the studio's guide.

## Choices

| Element | Copy | Why |
|---|---|---|
| H1 | A product studio built on your design system. | It names the new thing (a product studio), keeps "design system" for search, and says what the studio stands on. |
| Subline | A designer sets it up once. Then engineers, product and marketing ship through it, inside Claude Code: the agent reads your rules before it builds, code checks the work, and a person makes every call. | Who sets it up, who uses it, where it runs, and the three promises, in order. |
| Facts | free · 5 commands · works before setup · sends nothing · a person makes the calls | "Works before setup" is the reason to install today: `/product-studio:check` runs on starter rules. |
| Who uses it | Designers, engineers, product managers, marketing; one command each | The studio now serves go-to-market and product, not only design. Each card ends with what that person types. |
| Commands | Three in a row (setup, brief, check), then two wider (loop, admin), each "a person runs it" | The layout carries the rule: Claude may run the first three; only a person runs the last two. |
| Improves | Logs · proposes · asks | The self-improvement, with the safety rail in the same breath. It links to this site's own public loop (GitHub issues labelled `studio`). |
| Pricing | The studio is free. Setting it up well takes a designer. | It sells the founder's thesis: the free tool shows what it won't decide, and a designer decides it. |
| FAQ | Adds "Does it replace designers?" | It answers the objection the thesis invites. |

## Alternatives considered for the H1

| Option | Copy | Best for |
|---|---|---|
| A (chosen) | A product studio built on your design system. | Search and clarity |
| B | Designers set it up. Everyone ships through it. | A bolder thesis line; it could become the subline in a later test |
| C | Your product's design studio, inside Claude Code. | Design-led buyers only |

## To do before this ships

- The root marketplace lists the `product-studio` plugin (the install line depends on it).
- The `studio` label and the first public goal issues exist, so the "Follow this site's loop" link
  shows something.
- Bring back a proof section from `product-studio score` (beta) once the studio runs on this repo.
