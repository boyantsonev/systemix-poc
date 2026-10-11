#!/usr/bin/env node
// @getsystemix/app — the per-instance local app server.
// Tiny stdlib http server: serves the prebuilt SPA (dist/ui) + a JSON API
// over the instance files at --project-root. Local tool: binds 127.0.0.1.
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  loadConfig,
  loadDesign,
  loadDoc,
  loadDocsManifest,
  loadDrift,
  loadExperiments,
  loadHome,
  loadQueue,
  loadSkills,
  loadTokens,
  resolveQueueItem,
} from './lib/instance.js'
import { checkHost, checkMutation } from './lib/request-guard.js'

const args = process.argv.slice(2)
const argOf = (name, fallback) => {
  const i = args.indexOf(name)
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback
}
const ROOT = path.resolve(argOf('--project-root', process.cwd()))
const PORT = Number(argOf('--port', 4400))
const UI_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'ui')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
}

const json = (res, status, data) => {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(data))
}

const readBody = (req) =>
  new Promise((resolve, reject) => {
    let body = ''
    req.on('data', (c) => {
      body += c
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'))
      } catch {
        reject(new Error('invalid JSON body'))
      }
    })
  })

async function handleApi(req, res, url) {
  const p = url.pathname
  if (p === '/api/home') return json(res, 200, loadHome(ROOT))
  if (p === '/api/config') {
    const { raw, config, instance } = loadConfig(ROOT)
    return json(res, 200, { instance, config, raw })
  }
  if (p === '/api/docs/manifest') {
    const manifest = loadDocsManifest(ROOT)
    return manifest
      ? json(res, 200, manifest)
      : json(res, 404, { error: 'no docs manifest', hint: 'run `npx systemix docs sync` (docs/ contract) in this repo' })
  }
  const docMatch = p.match(/^\/api\/docs\/([a-z0-9-]+)$/)
  if (docMatch) {
    const doc = loadDoc(ROOT, docMatch[1])
    return doc ? json(res, 200, doc) : json(res, 404, { error: 'doc not found' })
  }
  if (p === '/api/tokens') {
    const { config } = loadConfig(ROOT)
    return json(res, 200, loadTokens(ROOT, config))
  }
  if (p === '/api/design') return json(res, 200, loadDesign(ROOT))
  if (p === '/api/skills') return json(res, 200, loadSkills(ROOT))
  if (p === '/api/experiments') return json(res, 200, loadExperiments(ROOT))
  if (p === '/api/queue') return json(res, 200, loadQueue(ROOT))
  const resolveMatch = p.match(/^\/api\/queue\/([\w.-]+)\/resolve$/)
  if (resolveMatch && req.method === 'POST') {
    const denied = checkMutation(req, PORT)
    if (denied) return json(res, denied.status, { error: denied.error })
    let body
    try {
      body = await readBody(req)
    } catch (err) {
      return json(res, 400, { error: err.message })
    }
    if (!body || typeof body !== 'object') return json(res, 400, { error: 'expected a JSON object' })
    const result = resolveQueueItem(ROOT, resolveMatch[1], body)
    return result.error ? json(res, result.status, { error: result.error }) : json(res, 200, result)
  }
  if (p === '/api/drift') return json(res, 200, loadDrift(ROOT))
  return json(res, 404, { error: 'unknown endpoint' })
}

function serveStatic(res, urlPath) {
  let rel = urlPath === '/' ? '/index.html' : urlPath
  let file = path.join(UI_DIR, path.normalize(rel))
  if (!file.startsWith(UI_DIR)) file = path.join(UI_DIR, 'index.html')
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(UI_DIR, 'index.html')
  if (!fs.existsSync(file)) {
    res.writeHead(503, { 'content-type': 'text/plain' })
    return res.end('UI not built — run `npm run build` in @getsystemix/app (dist/ui missing)')
  }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] ?? 'application/octet-stream' })
  fs.createReadStream(file).pipe(res)
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`)
  try {
    if (url.pathname.startsWith('/api/')) {
      const denied = checkHost(req, PORT)
      if (denied) return json(res, denied.status, { error: denied.error })
      return await handleApi(req, res, url)
    }
    return serveStatic(res, url.pathname)
  } catch (err) {
    return json(res, 500, { error: String(err?.message ?? err) })
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`systemix app — instance: ${path.basename(ROOT)}`)
  console.log(`  root: ${ROOT}`)
  console.log(`  url:  http://localhost:${PORT}`)
})
