// Shared client helpers — fetch hook, hash router, tiny md renderer, token parser.
import { useEffect, useState } from 'react'

// ---- data fetching -------------------------------------------------------

export function useApi(path, deps = []) {
  const [state, setState] = useState({ loading: true, data: null, error: null })
  useEffect(() => {
    let alive = true
    setState((s) => ({ ...s, loading: true }))
    fetch(path)
      .then(async (r) => {
        const body = await r.json().catch(() => null)
        if (!alive) return
        if (!r.ok) setState({ loading: false, data: null, error: body ?? { error: `HTTP ${r.status}` } })
        else setState({ loading: false, data: body, error: null })
      })
      .catch((e) => {
        if (alive) setState({ loading: false, data: null, error: { error: String(e) } })
      })
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps])
  return state
}

// ---- hash routing --------------------------------------------------------

const currentRoute = () => window.location.hash.replace(/^#/, '') || '/'

export function useHashRoute() {
  const [route, setRoute] = useState(currentRoute)
  useEffect(() => {
    const onChange = () => setRoute(currentRoute())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

// ---- tiny markdown renderer (no deps) ------------------------------------

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const unesc = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
const escAttr = (s) => esc(s).replace(/"/g, '&quot;').replace(/'/g, '&#39;')

// Link targets come from agent-written markdown: only http(s), mailto, relative
// and #fragment URLs become links; any other scheme (javascript:, data:, …)
// renders as plain text. The scheme is read the way browsers read it — leading
// and trailing control chars/space trimmed, tabs and newlines dropped.
export function safeHref(url) {
  const u = String(url)
    .replace(/^[\x00-\x20]+|[\x00-\x20]+$/g, '')
    .replace(/[\t\n\r]/g, '')
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(u)
  return scheme && !/^(https?|mailto)$/i.test(scheme[1]) ? null : u
}

const link = (_, text, target) => {
  const href = safeHref(unesc(target))
  return href == null ? text : `<a href="${escAttr(href)}" target="_blank" rel="noreferrer">${text}</a>`
}

const inline = (s) =>
  s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, link)

const isTableRow = (l) => /^\s*\|.*\|\s*$/.test(l)
const isTableSep = (l) => /^[\s|:-]+$/.test(l)
const cells = (r) =>
  r
    .trim()
    .replace(/\\\|/g, '') // protect escaped pipes
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.replace(//g, '|').trim())

export function mdToHtml(md) {
  const lines = String(md ?? '').split('\n')
  const out = []
  let para = []
  const flush = () => {
    if (para.length) {
      out.push(`<p>${inline(esc(para.join(' ')))}</p>`)
      para = []
    }
  }
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    // fenced code
    if (/^```/.test(line)) {
      flush()
      const buf = []
      i++
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++])
      i++ // closing fence
      out.push(`<pre class="md-code"><code>${esc(buf.join('\n'))}</code></pre>`)
      continue
    }
    // heading
    const h = line.match(/^(#{1,6})\s+(.*)/)
    if (h) {
      flush()
      out.push(`<h${h[1].length}>${inline(esc(h[2]))}</h${h[1].length}>`)
      i++
      continue
    }
    // hr
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      flush()
      out.push('<hr />')
      i++
      continue
    }
    // table
    if (isTableRow(line) && i + 1 < lines.length && isTableRow(lines[i + 1]) && isTableSep(lines[i + 1])) {
      flush()
      const head = cells(line)
      i += 2
      const rows = []
      while (i < lines.length && isTableRow(lines[i])) rows.push(cells(lines[i++]))
      const thead = `<thead><tr>${head.map((c) => `<th>${inline(esc(c))}</th>`).join('')}</tr></thead>`
      const tbody = `<tbody>${rows
        .map((r) => `<tr>${r.map((c) => `<td>${inline(esc(c))}</td>`).join('')}</tr>`)
        .join('')}</tbody>`
      out.push(`<div class="md-table-wrap"><table>${thead}${tbody}</table></div>`)
      continue
    }
    // unordered list
    if (/^\s*[-*]\s+/.test(line)) {
      flush()
      const items = []
      while (i < lines.length && (/^\s*[-*]\s+/.test(lines[i]) || /^\s{2,}\S/.test(lines[i]))) {
        if (/^\s*[-*]\s+/.test(lines[i])) items.push(lines[i].replace(/^\s*[-*]\s+/, ''))
        else items[items.length - 1] += ' ' + lines[i].trim()
        i++
      }
      out.push(`<ul>${items.map((t) => `<li>${inline(esc(t))}</li>`).join('')}</ul>`)
      continue
    }
    // ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      flush()
      const items = []
      while (i < lines.length && (/^\s*\d+\.\s+/.test(lines[i]) || /^\s{2,}\S/.test(lines[i]))) {
        if (/^\s*\d+\.\s+/.test(lines[i])) items.push(lines[i].replace(/^\s*\d+\.\s+/, ''))
        else items[items.length - 1] += ' ' + lines[i].trim()
        i++
      }
      out.push(`<ol>${items.map((t) => `<li>${inline(esc(t))}</li>`).join('')}</ol>`)
      continue
    }
    // blank
    if (/^\s*$/.test(line)) {
      flush()
      i++
      continue
    }
    para.push(line.trim())
    i++
  }
  flush()
  return out.join('\n')
}

// ---- css token parsing ----------------------------------------------------

export const looksLikeColor = (v) =>
  /^(oklch|oklab|hsl|hsla|rgb|rgba|color)\(/i.test(v.trim()) || /^#[0-9a-f]{3,8}$/i.test(v.trim())

/** Extract `--var: value` pairs from :root and .dark blocks. */
export function parseTokenBlocks(css) {
  const bySelector = new Map()
  const blockRe = /(:root|\.dark)\s*\{([^}]*)\}/g
  let m
  while ((m = blockRe.exec(String(css ?? '')))) {
    const selector = m[1]
    if (!bySelector.has(selector)) bySelector.set(selector, [])
    const vars = bySelector.get(selector)
    const varRe = /--([\w-]+)\s*:\s*([^;]+);/g
    let v
    while ((v = varRe.exec(m[2]))) vars.push({ name: `--${v[1]}`, value: v[2].trim() })
  }
  return [...bySelector.entries()]
    .filter(([, vars]) => vars.length)
    .map(([selector, vars]) => ({ selector, vars }))
}

/** Group vars by their first name segment (--mint-500 -> "mint"). */
export function groupByPrefix(vars) {
  const groups = new Map()
  for (const v of vars) {
    const prefix = v.name.replace(/^--/, '').split('-')[0] || 'other'
    if (!groups.has(prefix)) groups.set(prefix, [])
    groups.get(prefix).push(v)
  }
  return [...groups.entries()].map(([prefix, items]) => ({ prefix, items }))
}

// ---- misc ------------------------------------------------------------------

export const fmtDate = (v) => {
  if (!v) return null
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? String(v) : d.toISOString().slice(0, 10)
}

export const asJson = (v) => JSON.stringify(v, null, 2)
