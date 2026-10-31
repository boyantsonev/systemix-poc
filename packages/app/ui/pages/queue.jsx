// #/queue — the HITL stream. The hub reads; a person types the ruling
// (`systemix experiment ack`), so a click can never be the agent's.
import React from 'react'
import { useApp } from '../app.jsx'
import { asJson, useApi } from '../lib.js'

export default function Queue() {
  const { view } = useApp()
  const { data, error, loading } = useApi('/api/queue', [])

  if (loading && !data) return <div className="empty-note">Loading…</div>
  if (error) return <div className="empty-note">Failed to load queue: {error.error}</div>

  if (view === 'machine') {
    return (
      <>
        <div className="eyebrow">GET /api/queue</div>
        <pre className="machine-pre">{asJson(data)}</pre>
      </>
    )
  }

  return (
    <>
      <div className="eyebrow">Queue</div>
      <h1>
        HITL queue{' '}
        {data.pendingCount > 0 && <span className="chip chip-amber">{data.pendingCount} pending</span>}
      </h1>

      <p className="muted">The hub never rules. To rule on a card, type the command under it in your terminal.</p>

      {data.items.length === 0 && <div className="empty-note">Queue is empty — nothing needs a human right now.</div>}

      {data.items.map((item) => (
        <QueueCard key={`${item._source}:${item.id}`} item={item} />
      ))}
    </>
  )
}

function QueueCard({ item }) {
  const pending = item.status === 'pending'
  const subject = item.subject ?? item.experimentId ?? item.title ?? item.id
  const when = item.requestedAt ?? item.createdAt ?? null
  const payload = item.payload ?? item.summary ?? item.body ?? null

  return (
    <div className={pending ? 'card queue-card' : 'card queue-card resolved'}>
      <div className="queue-head">
        <span className={pending ? 'chip chip-amber' : 'chip chip-muted'}>{item.type ?? item._source}</span>
        <span className="queue-subject">{subject}</span>
        {when && <span className="queue-when">{String(when).replace('T', ' ').slice(0, 16)}</span>}
      </div>
      {payload != null && (
        <pre className="queue-payload">{typeof payload === 'string' ? payload : asJson(payload)}</pre>
      )}
      {pending ? (
        <div className="queue-actions">
          <code className="queue-command">npx @getsystemix/cli experiment ack {item.id}</code>
          <code className="queue-command muted">npx @getsystemix/cli experiment ack {item.id} --decline</code>
        </div>
      ) : (
        <div className="queue-resolution muted">
          {item.status}
          {item.resolution?.action && ` — ${item.resolution.action}`}
          {item.resolution?.note && ` · ${item.resolution.note}`}
          {item.resolvedAt && ` · ${String(item.resolvedAt).replace('T', ' ').slice(0, 16)}`}
        </div>
      )}
    </div>
  )
}
