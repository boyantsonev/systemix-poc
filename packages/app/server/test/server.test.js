// The app server end-to-end: the real `server/index.js` on a free port, real HTTP.
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { after, before, beforeEach, describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

const SERVER = fileURLToPath(new URL('../index.js', import.meta.url))

const freePort = () =>
  new Promise((resolve, reject) => {
    const s = net.createServer()
    s.on('error', reject)
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address()
      s.close(() => resolve(port))
    })
  })

let root
let port
let child

function request({ method = 'GET', path: urlPath, headers = {}, body }) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port, method, path: urlPath, headers: { host: `localhost:${port}`, ...headers } },
      (res) => {
        let data = ''
        res.on('data', (c) => (data += c))
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data ? JSON.parse(data) : null }))
      }
    )
    req.on('error', reject)
    if (body !== undefined) req.write(body)
    req.end()
  })
}

const queueFile = () => path.join(root, '.systemix', 'queue.json')
const cardStatus = () => JSON.parse(fs.readFileSync(queueFile(), 'utf8')).cards[0].status
const sameOrigin = () => ({ 'content-type': 'application/json', origin: `http://localhost:${port}` })
const resolveCard = (headers, body = JSON.stringify({ action: 'approve' })) =>
  request({ method: 'POST', path: '/api/queue/card-1/resolve', headers, body })

before(async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'systemix-app-'))
  fs.mkdirSync(path.join(root, '.systemix'))
  port = await freePort()
  child = spawn(process.execPath, [SERVER, '--project-root', root, '--port', String(port)], {
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  await new Promise((resolve, reject) => {
    child.stdout.on('data', (c) => String(c).includes('url:') && resolve())
    child.on('exit', (code) => reject(new Error(`server exited early (${code})`)))
  })
})

after(() => {
  child?.kill()
  fs.rmSync(root, { recursive: true, force: true })
})

beforeEach(() => {
  fs.writeFileSync(
    queueFile(),
    JSON.stringify({ cards: [{ id: 'card-1', type: 'close-proposal', status: 'pending', experimentId: 'exp-1' }] })
  )
})

describe('POST /api/queue/:id/resolve', () => {
  it('resolves a card for a same-origin JSON request (control)', async () => {
    const res = await resolveCard(sameOrigin())
    assert.equal(res.status, 200)
    assert.equal(cardStatus(), 'approved')
  })

  it('accepts the 127.0.0.1 address of the app too', async () => {
    const res = await resolveCard({
      host: `127.0.0.1:${port}`,
      origin: `http://127.0.0.1:${port}`,
      'content-type': 'application/json',
    })
    assert.equal(res.status, 200)
  })

  it('rejects a text/plain body (the no-preflight cross-site shape)', async () => {
    const res = await resolveCard({ ...sameOrigin(), 'content-type': 'text/plain' })
    assert.equal(res.status, 415)
    assert.equal(cardStatus(), 'pending')
  })

  it('rejects a foreign Origin', async () => {
    const res = await resolveCard({ ...sameOrigin(), origin: 'https://evil.example' })
    assert.equal(res.status, 403)
    assert.equal(cardStatus(), 'pending')
  })

  it('rejects another localhost port as Origin', async () => {
    const res = await resolveCard({ ...sameOrigin(), origin: `http://localhost:${port + 1}` })
    assert.equal(res.status, 403)
    assert.equal(cardStatus(), 'pending')
  })

  it('rejects Sec-Fetch-Site: cross-site', async () => {
    const res = await resolveCard({ 'content-type': 'application/json', 'sec-fetch-site': 'cross-site' })
    assert.equal(res.status, 403)
    assert.equal(cardStatus(), 'pending')
  })

  it('rejects a Host that is not the app (DNS rebinding)', async () => {
    const res = await resolveCard({
      host: `rebound.example:${port}`,
      origin: `http://rebound.example:${port}`,
      'content-type': 'application/json',
    })
    assert.equal(res.status, 403)
    assert.equal(cardStatus(), 'pending')
  })

  it('rejects malformed JSON and unknown actions', async () => {
    assert.equal((await resolveCard(sameOrigin(), '{ nope')).status, 400)
    assert.equal((await resolveCard(sameOrigin(), 'null')).status, 400)
    assert.equal((await resolveCard(sameOrigin(), JSON.stringify({ action: 'nuke' }))).status, 400)
    assert.equal(cardStatus(), 'pending')
  })
})

describe('GET /api/*', () => {
  it('answers only on the app’s own Host', async () => {
    assert.equal((await request({ path: '/api/queue' })).status, 200)
    assert.equal((await request({ path: '/api/queue', headers: { host: `rebound.example:${port}` } })).status, 403)
  })
})
