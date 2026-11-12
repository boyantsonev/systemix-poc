# Joins: where one loop hands another a file

A join is where one loop hands the other a file. Each join carries one; cut any of them and one loop
runs on another's stale picture.

### product.validate → build.plan
A validated design is the build's contract: the goal, its evals and the chosen variant, in one
folder. Without it the build plans from memory.
- carries: design/goals

### build.measure → product.learn
The goal's evals marked on the shipped build are what the next goal is chosen from. Without them
the product loop learns from opinions.
- carries: design/evaluations.md

### product.learn → product.goal
What a goal learned is read before the next goal is framed.
- carries: design/LEARNINGS.md
