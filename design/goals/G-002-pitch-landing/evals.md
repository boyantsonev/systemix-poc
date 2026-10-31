# G-002 · evals

| id | must be true | checked by | bar | answered at | status |
|---|---|---|---|---|---|
| E1 | The hero says the pitch, with "design system" in the H1 | the rendered page source | the approved H1 and subline, word for word | product.score | pass |
| E2 | Every pillar claim is true today | each card checked against the plugin README and launch-review.md | 0 claims ahead of what ships | product.score | pass |
| E3 | Everything is readable without JavaScript | a Playwright screenshot with JavaScript off | all text visible on every section | build.test | pass |
| E4 | Reduced motion turns every animation off | Playwright with reduced motion emulated | 0 running animations or transitions | build.test | pass |
| E5 | The first screen stays fast | Lighthouse mobile on the Vercel preview | LCP ≤ 2.5 s, CLS ≤ 0.1 | build.test | open |
| E6 | Motion follows the design system | a search for durations and easings outside the motion tokens | 0 raw values in components | build.test | pass |
| E7 | The page holds at phone width | a 390 px screenshot of every section | no horizontal scroll, no clipped text | build.test | pass |
| E8 | The transitions.dev license is kept | a search of plugin/ and packages/cli/templates/, and of each snippet's comment | no snippet in the kit; the comment kept in each | build.test | pass |
| E9 | A visitor can say what Systemix does | 3 people read the first screen for 10 seconds, observed | each names at least 2 of the 3 pillars in their own words | build.measure | open |
