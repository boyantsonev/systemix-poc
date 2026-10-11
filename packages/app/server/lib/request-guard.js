// Request checks for the local app server. It binds 127.0.0.1, but any page the
// browser has open can still send it requests, and a rebound DNS name can point
// at it. So API calls must address the app by its own loopback host, and
// state-changing calls must also be same-origin JSON — a browser can't send that
// cross-site without a CORS preflight, which this server never grants.

const appHosts = (port) => [`127.0.0.1:${port}`, `localhost:${port}`]

/** null when the Host header names this app, else { status, error }. */
export function checkHost(req, port) {
  const host = String(req.headers.host ?? '').toLowerCase()
  return appHosts(port).includes(host) ? null : { status: 403, error: 'unexpected Host header' }
}

/** null when a state-changing request is same-origin JSON, else { status, error }. */
export function checkMutation(req, port) {
  const hostProblem = checkHost(req, port)
  if (hostProblem) return hostProblem

  const origin = req.headers.origin
  if (origin !== undefined && !appHosts(port).some((h) => String(origin).toLowerCase() === `http://${h}`)) {
    return { status: 403, error: 'cross-origin request refused' }
  }
  const site = req.headers['sec-fetch-site']
  if (site !== undefined && site !== 'same-origin' && site !== 'none') {
    return { status: 403, error: 'cross-origin request refused' }
  }

  const type = String(req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase()
  if (type !== 'application/json') return { status: 415, error: 'expected Content-Type: application/json' }
  return null
}
