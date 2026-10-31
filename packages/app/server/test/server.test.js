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
const resolveCard = (headers = { 'content-type': 'application/json' }, body = JSON.stringify({ action: 'approve' })) =>
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

describe('POST /api/queue/:id/resolve (the hub never rules)', () => {
  it('refuses even a same-origin JSON approve, and the card stays pending', async () => {
    const res = await resolveCard({ 'content-type': 'application/json', origin: `http://localhost:${port}` })
    assert.equal(res.status, 410)
    assert.equal(res.body.command, 'npx @getsystemix/cli experiment ack card-1')
    assert.equal(res.body.decline, 'npx @getsystemix/cli experiment ack card-1 --decline')
    assert.equal(cardStatus(), 'pending')
  })

  it('refuses a decline too', async () => {
    const res = await resolveCard(undefined, JSON.stringify({ action: 'decline' }))
    assert.equal(res.status, 410)
    assert.equal(cardStatus(), 'pending')
  })

  it('still checks the Host first (DNS rebinding)', async () => {
    const res = await resolveCard({ host: `rebound.example:${port}`, 'content-type': 'application/json' })
    assert.equal(res.status, 403)
    assert.equal(cardStatus(), 'pending')
  })
})

describe('GET /api/*', () => {
  it('answers only on the app’s own Host', async () => {
    assert.equal((await request({ path: '/api/queue' })).status, 200)
    assert.equal((await request({ path: '/api/queue', headers: { host: `rebound.example:${port}` } })).status, 403)
  })
})
