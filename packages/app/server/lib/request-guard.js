// Request checks for the local app server. It binds 127.0.0.1, but any page the
// browser has open can still send it requests, and a rebound DNS name can point
// at it. So API calls must address the app by its own loopback host. The app
// has no state-changing calls: rulings are typed (`systemix experiment ack`).

const appHosts = (port) => [`127.0.0.1:${port}`, `localhost:${port}`]

/** null when the Host header names this app, else { status, error }. */
export function checkHost(req, port) {
  const host = String(req.headers.host ?? '').toLowerCase()
  return appHosts(port).includes(host) ? null : { status: 403, error: 'unexpected Host header' }
}
