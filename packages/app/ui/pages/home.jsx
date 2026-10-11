// #/ — instance snapshot: setup checklist, context, counts, autonomy +
// signals, quick links.
import React from 'react'
import { CopyCmd, useApp } from '../app.jsx'
import { asJson } from '../lib.js'

export default function Home() {
  const { home, view } = useApp()
  if (!home) return <div className="empty-note">Loading…</div>

  if (view === 'machine') {
    return (
      <>
        <div className="eyebrow">GET /api/home</div>
        <pre className="machine-pre">{asJson(home)}</pre>
      </>
    )
  }

  const { context, counts, autonomy, signals, latestDrift, setup } = home
  const driftScore = latestDrift?.score ?? latestDrift?.count ?? null

  return (
    <>
      <div className="eyebrow">Instance</div>
      <h1>{home.instance}</h1>

      {setup && <SetupCard setup={setup} />}

      <div className="card">
        <div className="eyebrow">Context</div>
        {context ? (
          <dl className="kv">
            {Object.entries(context).map(([k, v]) => (
              <React.Fragment key={k}>
                <dt>{k.replace(/_/g, ' ')}</dt>
                <dd>{typeof v === 'string' ? v : asJson(v)}</dd>
              </React.Fragment>
            ))}
          </dl>
        ) : (
          <p className="muted">
            not captured yet — rerun <code>npx @getsystemix/cli init --reconfigure</code>
          </p>
        )}
      </div>

      <div className="stat-row">
        <Stat label="Components" value={counts.components} href="#/tokens" />
        <Stat label="Experiments" value={`${counts.experimentsRunning} / ${counts.experimentsTotal}`} hint="running / total" href="#/experiments" />
        <Stat label="Queue pending" value={counts.queuePending} amber={counts.queuePending > 0} href="#/queue" />
        <Stat label="Latest drift" value={driftScore ?? '—'} hint={latestDrift?.date ?? latestDrift?.at ?? null} />
      </div>

      <div className="card">
        <div className="eyebrow">Autonomy &amp; signals</div>
        <div className="chip-row">
          <span className="chip">autonomy: {autonomy ?? 'unset'}</span>
          {signals ? (
            Object.entries(signals).map(([name, cfg]) => (
              <span key={name} className={cfg?.enabled ? 'chip chip-green' : 'chip chip-muted'}>
                {name} {cfg?.enabled ? 'on' : 'off'}
              </span>
            ))
          ) : (
            <span className="chip chip-muted">no signals configured</span>
          )}
        </div>
      </div>

      <div className="card">
        <div className="eyebrow">Quick links</div>
        <div className="chip-row">
          <a className="chip chip-link" href="#/design">Overview</a>
          <a className="chip chip-link" href="#/tokens">Tokens</a>
          <a className="chip chip-link" href="#/experiments">Experiments</a>
          <a className="chip chip-link" href="#/queue">Queue</a>
          <a className="chip chip-link" href="#/skills">Skills</a>
        </div>
      </div>
    </>
  )
}

// The buddy checklist — done items collapse to calm green squares; todos get
// the hint + a copyable next command.
function SetupCard({ setup }) {
  const todo = setup.filter((i) => !i.done)
  return (
    <div className="card">
      <div className="eyebrow">Setup</div>
      {todo.length === 0 ? (
        <div className="setup-all-done">
          <span className="setup-square done" /> all set — the loop is fully wired
        </div>
      ) : (
        <ul className="setup-list">
          {setup.map((item) => (
            <li key={item.id} className={item.done ? 'setup-item done' : 'setup-item'}>
              <span className={item.done ? 'setup-square done' : 'setup-square todo'} />
              <span className="setup-label">{item.label}</span>
              {!item.done && (
                <span className="setup-next">
                  <span className="setup-hint">{item.hint}</span>
                  {item.command && <CopyCmd command={item.command} />}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Stat({ label, value, hint, amber, href }) {
  const body = (
    <>
      <div className={amber ? 'stat-value amber' : 'stat-value'}>{value}</div>
      <div className="stat-label">{label}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </>
  )
  return href ? (
    <a className="stat card" href={href}>
      {body}
    </a>
  ) : (
    <div className="stat card">{body}</div>
  )
}
