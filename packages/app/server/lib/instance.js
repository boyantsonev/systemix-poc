// Instance readers — plain-fs views over a systemix instance's files.
// The app is a VIEWER + HITL actuator over the SAME files the skills, CLI and
// MCP use (three-doors parity): no new state, no new semantics. Fresh
// projectRoot-scoped ports of the POC's src/lib readers (queue-store,
// drift-history, learnings) — follow-up: extract a shared instance-lib.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import YAML from 'yaml'

const readJson = (file, fallback) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

const readText = (file) => {
  try {
    return fs.readFileSync(file, 'utf8')
  } catch {
    return null
  }
}

export function loadConfig(root) {
  const raw = readText(path.join(root, 'systemix.config.yaml'))
  let config = null
  try {
    config = raw ? YAML.parse(raw) : null
  } catch {
    config = null
  }
  return { raw, config, instance: path.basename(root) }
}

export function loadDocsManifest(root) {
  return readJson(path.join(root, 'docs', 'manifest.json'), null)
}

// ---- theme — the app wears the instance's skin -----------------------------
// Parse the instance's canonical tokens css and resolve the semantic aliases
// for both scopes (:root = light, .dark = overlay). Values stay as authored
// (oklch is fine — browsers render it); we only flatten var() chains.

const tokensCssPath = (config) => config?.design?.tokens ?? 'design/tokens.css'

function parseCssVars(css) {
  const root = {}
  const dark = {}
  const blockRe = /(:root|\.dark)\s*\{([^}]*)\}/g
  let m
  while ((m = blockRe.exec(String(css ?? '')))) {
    const target = m[1] === '.dark' ? dark : root
    const varRe = /--([\w-]+)\s*:\s*([^;]+);/g
    let v
    while ((v = varRe.exec(m[2]))) target[`--${v[1]}`] = v[2].trim()
  }
  return { root, dark }
}

function resolveVars(value, lookup, depth = 0) {
  if (!value || depth > 8 || !value.includes('var(')) return value
  return value.replace(/var\((--[\w-]+)(?:\s*,\s*([^()]+))?\)/g, (whole, name, fallback) => {
    const next = lookup(name)
    if (next != null) return resolveVars(next, lookup, depth + 1)
    return fallback ? resolveVars(fallback.trim(), lookup, depth + 1) : whole
  })
}

// semantic key -> candidate custom properties (first hit wins)
const THEME_KEYS = {
  background: ['--background'],
  foreground: ['--foreground'],
  card: ['--card'],
  muted: ['--muted'],
  mutedForeground: ['--muted-foreground'],
  border: ['--border'],
  primary: ['--primary'],
  primaryForeground: ['--primary-foreground'],
  secondary: ['--secondary'],
  accent: ['--accent'],
  ring: ['--ring'],
  success: ['--success'],
  warning: ['--warning'],
  danger: ['--danger', '--destructive'],
}

export function loadTheme(root, config) {
  const cssPath = tokensCssPath(config)
  const css = readText(path.join(root, cssPath))
  if (css == null) return null
  const vars = parseCssVars(css)
  const scopes = {
    light: (name) => vars.root[name],
    dark: (name) => vars.dark[name] ?? vars.root[name], // .dark overlays :root
  }
  const theme = { source: cssPath, light: {}, dark: {} }
  for (const [scope, lookup] of Object.entries(scopes)) {
    for (const [key, candidates] of Object.entries(THEME_KEYS)) {
      const cssVar = candidates.find((c) => lookup(c) != null)
      if (!cssVar) continue
      const resolved = resolveVars(lookup(cssVar), lookup)
      if (resolved && !resolved.includes('var(')) theme[scope][key] = resolved
    }
  }
  return Object.keys(theme.light).length ? theme : null
}

// ---- setup — the buddy checklist -------------------------------------------
// Ordered, computed from the instance files. Each item: {id, label, done,
// hint, command}. The UI renders todos as guided next steps.

export function loadSetup(root, config) {
  const exists = (...p) => fs.existsSync(path.join(root, ...p))
  const signalsOn = Object.values(config?.signals ?? {}).some((s) => s?.enabled)
  const drift = readJson(path.join(root, '.systemix', 'drift-history.json'), null)
  const driftCount = Array.isArray(drift) ? drift.length : (drift?.snapshots?.length ?? 0)
  let experimentCount = 0
  try {
    experimentCount = fs
      .readdirSync(path.join(root, 'experiments'))
      .filter((f) => f.endsWith('.mdx') && !f.startsWith('_')).length
  } catch {
    experimentCount = 0
  }
  return [
    {
      id: 'config',
      label: 'Instance config',
      done: exists('systemix.config.yaml'),
      hint: 'no systemix.config.yaml — initialize the instance',
      command: 'npx @getsystemix/cli init',
    },
    {
      id: 'context',
      label: 'Context captured',
      done: Boolean(config?.context && Object.keys(config.context).length),
      hint: 'the config has no context block — rerun the init interview',
      command: 'npx @getsystemix/cli init --reconfigure',
    },
    {
      id: 'tokens',
      label: 'Design tokens',
      done: exists(tokensCssPath(config)),
      hint: 'scaffold design/ via init, or set design.tokens in systemix.config.yaml',
      command: 'npx @getsystemix/cli init',
    },
    {
      id: 'design-md',
      label: 'DESIGN.md',
      done: exists('design', 'DESIGN.md'),
      hint: 'no design/DESIGN.md — the design-system source of truth',
      command: 'npx @getsystemix/cli init',
    },
    {
      id: 'guardrails',
      label: 'Guardrails',
      done: exists('design', 'guardrails.mdx'),
      hint: 'no design/guardrails.mdx — the rules drift checks enforce',
      command: 'npx @getsystemix/cli init',
    },
    {
      id: 'docs',
      label: 'Docs manifest',
      done: exists('docs', 'manifest.json'),
      hint: 'no docs/manifest.json — sync the component docs',
      command: 'npx @getsystemix/cli docs sync',
    },
    {
      id: 'experiment',
      label: 'First experiment',
      done: experimentCount > 0,
      hint: 'no experiments yet — frame the first bet',
      command: '/init-experiment',
    },
    {
      id: 'signals',
      label: 'Signals on',
      done: signalsOn,
      hint: 'no signal enabled — wire a data source so experiments can measure',
      command: '/connect-signal',
    },
    {
      id: 'drift',
      label: 'Drift history',
      done: driftCount > 0,
      hint: 'no drift snapshots yet — run the first scan',
      command: 'npx @getsystemix/cli drift scan',
    },
    {
      id: 'preview',
      label: 'Component previews',
      done: Boolean(config?.app?.preview?.url),
      hint: 'set app.preview.url in systemix.config.yaml for live component previews',
      command: null,
    },
  ]
}

// ---- design docs + skills ---------------------------------------------------

function loadFrontmatterDoc(file) {
  const raw = readText(file)
  if (raw == null) return null
  try {
    const { data, content } = matter(raw)
    return { frontmatter: data, body: content, raw }
  } catch {
    return { frontmatter: {}, body: raw, raw }
  }
}

export function loadDesign(root) {
  return {
    design: loadFrontmatterDoc(path.join(root, 'design', 'DESIGN.md')),
    guardrails: loadFrontmatterDoc(path.join(root, 'design', 'guardrails.mdx')),
  }
}

export function loadSkills(root) {
  const skillsDir = path.join(root, '.claude', 'skills')
  let skills = []
  try {
    skills = fs
      .readdirSync(skillsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => {
        const doc = loadFrontmatterDoc(path.join(skillsDir, d.name, 'SKILL.md'))
        const fm = doc?.frontmatter ?? {}
        return {
          name: fm.name ?? d.name,
          description: fm.description ?? null,
          userInvocable: fm['user-invocable'] ?? null,
          dir: `.claude/skills/${d.name}`,
        }
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  } catch {
    skills = []
  }
  let workflows = []
  try {
    workflows = fs
      .readdirSync(path.join(root, '.claude', 'workflows'), { withFileTypes: true })
      .filter((d) => d.isFile())
      .map((d) => ({ name: d.name.replace(/\.[^.]+$/, ''), file: `.claude/workflows/${d.name}` }))
      .sort((a, b) => a.name.localeCompare(b.name))
  } catch {
    workflows = []
  }
  return { skills, workflows }
}

export function loadDoc(root, slug) {
  if (!/^[a-z0-9-]+$/.test(slug)) return null
  const file = path.join(root, 'docs', 'components', `${slug}.md`)
  const raw = readText(file)
  if (raw == null) return null
  const { data, content } = matter(raw)
  return { slug, frontmatter: data, body: content, raw }
}

export function loadTokens(root, config) {
  const cssPath = tokensCssPath(config)
  const css = readText(path.join(root, cssPath))
  // optional generated-values seam: config app.tokens_generated: [paths]
  const generatedPaths = config?.app?.tokens_generated ?? []
  const generated = {}
  for (const p of generatedPaths) {
    generated[p] = readText(path.join(root, p))
  }
  return { cssPath, css, generated }
}

export function loadExperiments(root) {
  const dir = path.join(root, 'experiments')
  let files = []
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith('.mdx') && !f.startsWith('_'))
  } catch {
    return { experiments: [], learnings: null }
  }
  const experiments = files
    .map((f) => {
      const raw = readText(path.join(dir, f))
      if (raw == null) return null
      try {
        const { data, content } = matter(raw)
        return { file: `experiments/${f}`, frontmatter: data, body: content }
      } catch {
        return null
      }
    })
    .filter(Boolean)
    .sort((a, b) => String(b.frontmatter.created ?? '').localeCompare(String(a.frontmatter.created ?? '')))
  const learnings = readText(path.join(dir, 'LEARNINGS.md'))
  return { experiments, learnings }
}

// ---- HITL: two queue files exist today (unification is a follow-up) ----
// .systemix/queue.json      — CLI/dashboard decision cards {cards:[...]}
// .systemix/hitl-queue.json — MCP task queue {tasks:[...]}
const QUEUE = (root) => path.join(root, '.systemix', 'queue.json')
const HITL = (root) => path.join(root, '.systemix', 'hitl-queue.json')

export function loadQueue(root) {
  const cards = (readJson(QUEUE(root), {}).cards ?? []).map((c) => ({ ...c, _source: 'queue' }))
  const tasks = (readJson(HITL(root), {}).tasks ?? []).map((t) => ({ ...t, _source: 'hitl' }))
  const items = [...cards, ...tasks].sort((a, b) => {
    const ap = a.status === 'pending' ? 0 : 1
    const bp = b.status === 'pending' ? 0 : 1
    if (ap !== bp) return ap - bp
    const at = a.requestedAt ?? a.createdAt ?? ''
    const bt = b.requestedAt ?? b.createdAt ?? ''
    return String(bt).localeCompare(String(at))
  })
  return { items, pendingCount: items.filter((i) => i.status === 'pending').length }
}

function atomicWrite(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const tmp = file + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2))
  fs.renameSync(tmp, file)
}

/**
 * Resolve an item in whichever queue holds it. v1 deliberately writes ONLY
 * status + resolution (same shape as the POC dashboard/MCP) and returns a
 * nextHint — applying an experiment decision to MDX stays with the CLI/skills
 * so the app never grows write semantics of its own.
 */
export function resolveQueueItem(root, id, { action, note, resolvedBy }) {
  if (!action) return { error: 'action required', status: 400 }
  const now = new Date().toISOString()

  const queueData = readJson(QUEUE(root), null)
  const card = queueData?.cards?.find((c) => c.id === id)
  if (card) {
    if (card.status !== 'pending') return { error: 'already resolved', status: 409 }
    card.status = action === 'approve' ? 'approved' : 'declined'
    card.resolvedAt = now
    card.resolution = { action, note: note ?? null, resolvedBy: resolvedBy ?? 'human:app' }
    atomicWrite(QUEUE(root), queueData)
    const nextHint =
      card.type === 'close-proposal' && action === 'approve' && card.experimentId
        ? `apply the decision: npx @getsystemix/cli experiment close ${card.experimentId}`
        : card.type === 'hypothesis-proposal' && action === 'approve'
          ? 'scaffold it: npx @getsystemix/cli experiment new <id> (or /init-experiment)'
          : null
    return { item: card, nextHint }
  }

  const hitlData = readJson(HITL(root), null)
  const task = hitlData?.tasks?.find((t) => t.id === id)
  if (task) {
    if (task.status !== 'pending') return { error: 'already resolved', status: 409 }
    task.status = 'resolved'
    task.resolvedAt = now
    task.resolution = { action, note: note ?? null, resolvedBy: resolvedBy ?? 'human:app' }
    atomicWrite(HITL(root), hitlData)
    return { item: task, nextHint: null }
  }

  return { error: 'not found', status: 404 }
}

export function loadDrift(root) {
  const raw = readJson(path.join(root, '.systemix', 'drift-history.json'), { snapshots: [] })
  const snapshots = Array.isArray(raw) ? raw : (raw.snapshots ?? [])
  // the other strand of the sacred timeline: canonical-token history from git
  let tokensLog = []
  try {
    const { config } = loadConfig(root)
    const tokensPath = config?.design?.tokens ?? 'design/tokens.css'
    const out = execFileSync(
      'git',
      ['log', '--follow', '--format=%h\t%aI\t%s', '--max-count=60', '--', tokensPath],
      { cwd: root, encoding: 'utf8', timeout: 5000 }
    )
    tokensLog = out
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [hash, date, ...subject] = line.split('\t')
        return { hash, date, subject: subject.join('\t') }
      })
  } catch {
    tokensLog = [] // not a git repo / git unavailable — the timeline renders snapshots only
  }
  return { snapshots, tokensLog }
}

export function loadHome(root) {
  const { config, instance } = loadConfig(root)
  const manifest = loadDocsManifest(root)
  const { experiments } = loadExperiments(root)
  const { pendingCount } = loadQueue(root)
  const drift = loadDrift(root)
  const snapshots = drift.snapshots ?? drift ?? []
  const latestDrift = Array.isArray(snapshots) && snapshots.length ? snapshots[snapshots.length - 1] : null
  return {
    instance,
    projectRoot: root,
    context: config?.context ?? null,
    theme: loadTheme(root, config),
    setup: loadSetup(root, config),
    autonomy: config?.hermes?.autonomy ?? null,
    signals: config?.signals ?? null,
    preview: config?.app?.preview ?? null,
    counts: {
      components: manifest?.count ?? 0,
      experimentsRunning: experiments.filter((e) => e.frontmatter.status === 'running').length,
      experimentsTotal: experiments.length,
      queuePending: pendingCount,
    },
    latestDrift,
  }
}
