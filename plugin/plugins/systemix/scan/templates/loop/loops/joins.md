# Joins — where one loop hands another a file

Each join carries one file; cut any of them and one loop runs on another's
stale picture.

### product.validate → build.plan
A validated design is the build's contract — the goal, its evals and the
pictures, in one folder; without it the build plans from memory.
- carries: design/goals

### build.measure → product.learn
The goal's evals marked on the shipped build, and the trend row, are what the
next goal is chosen from; without them the product loop learns from opinions.
- carries: design/evaluations.md

### product.learn → product.goal
The market loop (the experiments in `experiments/`) and the product loop share one
memory: what a goal or an experiment learned is read before the next goal is framed.
- carries: experiments/LEARNINGS.md
