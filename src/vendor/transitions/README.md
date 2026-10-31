# transitions.dev (vendored)

The UI generation runtime from [transitions.dev](https://transitions.dev)
(Jakubantalik/transitions.dev, commit e3aefb554d8f), copied unchanged:
`ui-generation.js`, `text-image-generation.js` (imported by it) and `ui-generation.css`.

**License:** the Transitions.dev License in `LICENSE.txt`, not this repo's MIT license.
Free to use on this website; not to be redistributed. **Never copy these files, or any
snippet in `src/styles/motion.css`, into `plugin/` or `packages/cli/templates/`**
(the kit we ship); a test checks it (`src/lib/motion/motion.test.ts`).

Do not edit the runtime: its timings are tuned together. The site maps its colours to our
tokens in `src/styles/motion.css`.
