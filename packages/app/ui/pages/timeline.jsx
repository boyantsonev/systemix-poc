// #/timeline — the sacred timeline: drift score over time, branches (critical
// runs) forking off and getting pruned, token commits on a second track.
import React from 'react'
import { GuideNote, useApp } from '../app.jsx'
import { asJson, useApi } from '../lib.js'

const RED = 'var(--red)'

const ts = (v) => new Date(v).getTime()
const fmtDT = (v) => {
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? String(v) : d.toISOString().slice(0, 16).replace('T', ' ')
}

// Scores from different formulas are not comparable: `drift scan` tags a snapshot with
// scoreFormula, older ones carry none ("legacy"). Never take a delta or join a line across the two.
const formulaOf = (s) => s.scoreFormula || 'legacy'

const nodeState = (s) => (s.critical > 0 ? 'red' : s.warnings > 0 ? 'amber' : 'green')
const nodeColor = { red: RED, amber: 'var(--amber)', green: 'var(--green)' }

// Contiguous runs of critical > 0. A run ends (is pruned) at the next snapshot
// with critical == 0 or less than half the previous — which may itself open a
// new run. A run still alive at the latest snapshot stays open (dashed tail).
function computeBranches(snapshots) {
  const runs = []
  let run = null
  for (let i = 0; i < snapshots.length; i++) {
    const s = snapshots[i]
    if (!run) {
      if (s.critical > 0) run = { indices: [i], pruneIdx: null, open: false }
      continue
    }
    const prev = snapshots[run.indices[run.indices.length - 1]]
    if (s.critical === 0 || s.critical < prev.critical / 2) {
      run.pruneIdx = i
      runs.push(run)
      run = s.critical > 0 ? { indices: [i], pruneIdx: null, open: false } : null
    } else {
      run.indices.push(i)
    }
  }
  if (run) {
    run.open = true
    runs.push(run)
  }
  return runs
}

// Contiguous runs of points that share a score formula; the line is drawn per run.
function formulaRuns(points) {
  const runs = []
  for (const p of points) {
    const last = runs[runs.length - 1]
    if (last && formulaOf(last[0].s) === formulaOf(p.s)) last.push(p)
    else runs.push([p])
  }
  return runs
}

// Catmull-Rom → cubic bezier through the snapshot points, control ys clamped
// to the score band so the line never overshoots past 0 or 100.
function smoothPath(pts, yMin, yMax) {
  if (pts.length < 2) return ''
  const clampY = (y) => Math.max(yMin, Math.min(yMax, y))
  let d = `M ${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = clampY(p1.y + (p2.y - p0.y) / 6)
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = clampY(p2.y - (p3.y - p1.y) / 6)
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x} ${p2.y}`
  }
  return d
}

const MAX_EVENTS = 90
const PAD_L = 52
const PAD_R = 36
const INNER_W = 720
const MIN_GAP = 16
const BAND_TOP = 26
const BAND_H = 150
const BAND_BOTTOM = BAND_TOP + BAND_H
const TRACK_Y = 218
const SVG_H = 252
const BRANCH_LIFT = 26

const yForScore = (score) => BAND_TOP + ((100 - Math.max(0, Math.min(100, score ?? 0))) / 100) * BAND_H

// Time-proportional x positions across the union of event times, clamped to
// the last MAX_EVENTS events, with a minimum gap between distinct times.
function layout(snapshots, commits) {
  let events = [
    ...snapshots.map((s, i) => ({ t: ts(s.runAt), kind: 'snap', i })),
    ...commits.map((c, i) => ({ t: ts(c.date), kind: 'commit', i })),
  ]
    .filter((e) => !Number.isNaN(e.t))
    .sort((a, b) => a.t - b.t)
  if (events.length > MAX_EVENTS) events = events.slice(events.length - MAX_EVENTS)
  if (!events.length) return { snapX: new Map(), commitX: new Map(), width: 800, t0: null, t1: null }

  const t0 = events[0].t
  const t1 = events[events.length - 1].t
  const span = Math.max(1, t1 - t0)
  const snapX = new Map()
  const commitX = new Map()
  let prevX = -Infinity
  let prevT = null
  for (const e of events) {
    const raw = PAD_L + ((e.t - t0) / span) * INNER_W
    const x = e.t === prevT ? prevX : Math.max(raw, prevX + MIN_GAP)
    prevX = x
    prevT = e.t
    if (e.kind === 'snap') snapX.set(e.i, x)
    else commitX.set(e.i, x)
  }
  return { snapX, commitX, width: Math.max(800, prevX + PAD_R), t0, t1 }
}

export default function Timeline() {
  const { view, home } = useApp()
  const { data, error, loading } = useApi('/api/drift')
  const driftItem = home?.setup?.find((s) => s.id === 'drift')
  if (loading) return <div className="empty-note">Loading…</div>
  if (error) return <div className="empty-note">Failed to load drift history: {error.error}</div>

  if (view === 'machine') {
    return (
      <>
        <div className="eyebrow">GET /api/drift</div>
        <pre className="machine-pre">{asJson(data)}</pre>
      </>
    )
  }

  const snapshots = [...(data.snapshots ?? [])].sort((a, b) => ts(a.runAt) - ts(b.runAt))
  const commits = [...(data.tokensLog ?? [])].sort((a, b) => ts(a.date) - ts(b.date))

  if (!snapshots.length && !commits.length) {
    return (
      <>
        <div className="eyebrow">Timeline</div>
        <h1>Sacred timeline</h1>
        <GuideNote
          hint={driftItem?.hint ?? 'no drift snapshots yet — run the first scan'}
          command={driftItem?.command ?? 'npx @getsystemix/cli drift scan'}
        />
      </>
    )
  }

  const branches = computeBranches(snapshots)
  const { snapX, commitX, width, t0, t1 } = layout(snapshots, commits)
  const visibleCommits = commits.filter((_, i) => commitX.has(i))
  const pts = snapshots.map((s, i) => (snapX.has(i) ? { x: Math.round(snapX.get(i)), y: yForScore(s.score), s, i } : null))

  const latest = snapshots[snapshots.length - 1] ?? null
  const prev = snapshots[snapshots.length - 2] ?? null
  const delta = latest && prev && formulaOf(latest) === formulaOf(prev) ? latest.score - prev.score : null
  const openBranches = branches.filter((b) => b.open).length
  const latestState = latest ? nodeState(latest) : null

  return (
    <>
      <div className="eyebrow">Timeline</div>
      <h1>Sacred timeline</h1>

      {latest && (
        <div className="stat-row">
          <div className="stat card">
            <div className={`stat-value tl-score tl-${latestState}`}>{latest.score}</div>
            <div className="stat-label">Latest score</div>
            <div className="stat-hint">
              {delta === null ? (prev ? 'new score formula — not comparable with previous' : 'no previous scan') : delta === 0 ? '± 0 vs previous' : `${delta > 0 ? '▲ +' : '▼ '}${delta} vs previous`}
            </div>
          </div>
          <div className="stat card">
            <div className="stat-value">{snapshots.length}</div>
            <div className="stat-label">Snapshots</div>
            <div className="stat-hint">{latest ? fmtDT(latest.runAt) : null}</div>
          </div>
          <div className="stat card">
            <div className={openBranches > 0 ? 'stat-value amber' : 'stat-value'}>{openBranches}</div>
            <div className="stat-label">Open branches</div>
            <div className="stat-hint">{openBranches > 0 ? 'drift still running' : 'all pruned'}</div>
          </div>
          <div className="stat card">
            <div className="stat-value">{commits.length}</div>
            <div className="stat-label">Token commits</div>
            <div className="stat-hint">design/tokens.css</div>
          </div>
        </div>
      )}

      {!snapshots.length && (
        <GuideNote
          hint={driftItem?.hint ?? 'no drift snapshots yet — run the first scan'}
          command={driftItem?.command ?? 'npx @getsystemix/cli drift scan'}
        />
      )}

      <div className="card tl-svg-wrap">
        <svg
          className="tl-svg"
          width={width}
          height={SVG_H}
          viewBox={`0 0 ${width} ${SVG_H}`}
          role="img"
          aria-label="Drift timeline: score over time with branches for critical runs and token commits"
        >
          <defs>
            <linearGradient id="tl-branch" x1="0" y1="0" x2={width} y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="var(--amber)" />
              <stop offset="1" stopColor={RED} />
            </linearGradient>
          </defs>

          {/* score gridlines */}
          {[100, 75, 50, 25].map((score) => (
            <g key={score}>
              <line
                x1={PAD_L}
                x2={width - PAD_R}
                y1={yForScore(score)}
                y2={yForScore(score)}
                stroke="var(--hairline)"
                strokeDasharray={score === 100 ? 'none' : '2 4'}
              />
              <text x={PAD_L - 8} y={yForScore(score) + 3} textAnchor="end" className="tl-grid-label">
                {score}
              </text>
            </g>
          ))}
          <line x1={PAD_L} x2={width - PAD_R} y1={BAND_BOTTOM} y2={BAND_BOTTOM} stroke="var(--hairline)" />
          <text x={PAD_L - 8} y={BAND_BOTTOM + 3} textAnchor="end" className="tl-grid-label">
            0
          </text>

          {/* branches — behind the main line */}
          {branches.map((run, bi) => {
            const runPts = run.indices.map((i) => pts[i]).filter(Boolean)
            if (!runPts.length) return null
            const fork = runPts[0]
            const lift = (p) => Math.max(10, p.y - BRANCH_LIFT)
            const followPts = runPts.slice(1).map((p) => `L ${p.x} ${lift(p)}`)
            const prunePt = run.pruneIdx !== null && pts[run.pruneIdx] ? pts[run.pruneIdx] : null
            let d = `M ${fork.x} ${fork.y}`
            if (followPts.length) d += ` ${followPts.join(' ')}`
            else if (prunePt || run.open) d += ` L ${fork.x + 14} ${lift(fork)}`
            if (prunePt) d += ` L ${prunePt.x} ${lift(prunePt)}`
            const last = runPts[runPts.length - 1]
            return (
              <g key={bi}>
                <path d={d} fill="none" stroke="url(#tl-branch)" strokeWidth="1.75" opacity="0.9" />
                {run.open && (
                  <line
                    x1={followPts.length ? last.x : fork.x + 14}
                    y1={lift(followPts.length ? last : fork)}
                    x2={(followPts.length ? last.x : fork.x + 14) + 26}
                    y2={lift(followPts.length ? last : fork) - 4}
                    stroke={RED}
                    strokeWidth="1.75"
                    strokeDasharray="3 4"
                    opacity="0.9"
                  />
                )}
                {prunePt && (
                  <g>
                    <title>{`pruned ${fmtDT(prunePt.s.runAt)} — critical ${prunePt.s.critical}`}</title>
                    <circle cx={prunePt.x} cy={lift(prunePt)} r="5.5" fill="var(--paper)" stroke={RED} strokeWidth="1.5" />
                    <path
                      d={`M ${prunePt.x - 2.4} ${lift(prunePt) - 2.4} L ${prunePt.x + 2.4} ${lift(prunePt) + 2.4} M ${prunePt.x + 2.4} ${lift(prunePt) - 2.4} L ${prunePt.x - 2.4} ${lift(prunePt) + 2.4}`}
                      stroke={RED}
                      strokeWidth="1.4"
                    />
                  </g>
                )}
              </g>
            )
          })}

          {/* the sacred timeline */}
          {formulaRuns(pts.filter(Boolean)).map((run) =>
            run.length >= 2 ? (
              <path key={run[0].i} d={smoothPath(run, BAND_TOP, BAND_BOTTOM)} fill="none" stroke="var(--ink)" strokeWidth="2" />
            ) : (
              <line key={run[0].i} x1={run[0].x - 20} x2={run[0].x + 20} y1={run[0].y} y2={run[0].y} stroke="var(--ink)" strokeWidth="2" />
            ),
          )}

          {/* snapshot nodes */}
          {pts.filter(Boolean).map((p) => (
            <circle key={p.i} cx={p.x} cy={p.y} r="4.5" fill={nodeColor[nodeState(p.s)]} stroke="var(--paper)" strokeWidth="1.5">
              <title>
                {`${fmtDT(p.s.runAt)} · score ${p.s.score}${p.s.scoreFormula ? '' : ' (legacy formula)'} · ${p.s.critical} critical / ${p.s.warnings} warnings · ${p.s.triggeredBy}` +
                  (p.s.topOffenders?.length ? `\ntop: ${p.s.topOffenders.slice(0, 3).join(', ')}` : '')}
              </title>
            </circle>
          ))}

          {/* token commits track */}
          <text x={PAD_L} y={TRACK_Y - 12} className="tl-track-label">
            design/tokens.css
          </text>
          <line x1={PAD_L} x2={width - PAD_R} y1={TRACK_Y} y2={TRACK_Y} stroke="var(--hairline)" />
          {commits.map((c, i) => {
            if (!commitX.has(i)) return null
            const x = Math.round(commitX.get(i))
            return (
              <rect
                key={c.hash}
                x={x - 4}
                y={TRACK_Y - 4}
                width="8"
                height="8"
                transform={`rotate(45 ${x} ${TRACK_Y})`}
                fill="var(--amber)"
                stroke="var(--paper)"
                strokeWidth="1"
              >
                <title>{`${c.hash} · ${c.subject} · ${fmtDT(c.date)}`}</title>
              </rect>
            )
          })}
          {!visibleCommits.length && (
            <text x={PAD_L + 10} y={TRACK_Y + 4} className="tl-grid-label">
              no token commits
            </text>
          )}

          {/* time domain labels */}
          {t0 !== null && (
            <>
              <text x={PAD_L} y={SVG_H - 6} className="tl-grid-label">
                {fmtDT(t0)}
              </text>
              {t1 !== t0 && (
                <text x={width - PAD_R} y={SVG_H - 6} textAnchor="end" className="tl-grid-label">
                  {fmtDT(t1)}
                </text>
              )}
            </>
          )}
        </svg>
      </div>

      {snapshots.length > 0 && (
        <>
          <h2>Recent snapshots</h2>
          <div className="card tl-list">
            {[...snapshots]
              .reverse()
              .slice(0, 10)
              .map((s) => (
                <div key={s.runAt} className="tl-row">
                  <span className={`tl-dot tl-dot-${nodeState(s)}`} />
                  <span className="tl-when">{fmtDT(s.runAt)}</span>
                  <span className="tl-row-score">score {s.score}</span>
                  <span className="tl-row-meta">
                    {s.critical} critical · {s.warnings} warnings · {s.componentsAudited} audited
                  </span>
                  <span className="chip chip-muted">{s.triggeredBy}</span>
                </div>
              ))}
          </div>
        </>
      )}
    </>
  )
}
