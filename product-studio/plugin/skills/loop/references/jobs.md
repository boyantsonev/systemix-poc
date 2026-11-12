# Jobs: map what people need before opening a goal (beta)

Offered by `open` only, when a goal's sentence names no outcome for a person. It is optional and in
beta. It writes nothing on its own: what it produces goes into the goal's `goal.md` through
`open`, after that file's yes.

**Not checked by code yet.** The `jobs check` command (parse the statements, lint
Minimize|Increase, recompute and rank the opportunity) is NOT YET BUILT. Until it is, this runs by
hand, without the check:

- There is no opportunity score. Don't compute one, and don't print a rank as if code made it.
- Every importance and satisfaction value is tagged `estimated: true`, unless a cited source backs
  it (a survey, an interview note, a support count with its date range).
- The first reply of the job step says, in these words: "This is beta, by hand: the `jobs check`
  command is not built yet, so nothing scores or ranks these outcomes." The reply with the outcome
  table says it again.

## 1 · The job

Ask, one question per turn, at most three:

1. Who is it for, and in what situation?
2. What are they trying to get done? (the job, not the feature)
3. Where does it go wrong for them today?

Write the job as one line: **When <situation>, <who> wants to <job>.**

## 2 · Outcomes

Draft **8 to 15** outcome statements, each in the canonical form:

    <Minimize|Increase> the <time|likelihood|number|effort> <it takes to / that> <object> <context>

Neutral example: *Minimize the time it takes to find last month's invoice when a client asks
for it.*

Each statement starts with Minimize or Increase, names one thing to measure, and names no
solution or feature.

For each, record:

| # | Outcome | Importance (1-10) | Satisfaction (1-10) | estimated | Source |
|---|---|---|---|---|---|

`estimated: true` when the Source column is empty. A source you cannot open goes under
"Couldn't read", and its values stay estimated.

## 3 · Where people are under-served, by hand

Without `jobs check`, name the outcomes that look under-served (high importance, low
satisfaction) as your reading, in words, and say it is an estimate. If two look alike, say they
tie; don't break the tie with arithmetic.

## 4 · Hand back to open

Turn the top one to three under-served outcomes into one-sentence goals, each naming the outcome
("…so that finding last month's invoice takes under a minute"). The person picks one, or none.

Go back to `${CLAUDE_PLUGIN_ROOT}/skills/loop/references/open.md` with the sentence they picked. Never open a
goal from here. Put the job line and the outcome table into the draft of `goal.md` under
**Context**, marked "beta, estimated", so it is shown with the rest before the yes.
