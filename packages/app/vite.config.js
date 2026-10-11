import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const here = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: path.join(here, 'ui'),
  plugins: [react()],
  build: {
    outDir: path.join(here, 'dist', 'ui'),
    emptyOutDir: true,
  },
  server: {
    // dev convenience: point at a running `node server/index.js` instance.
    // The server only answers its own Host/Origin, so present the dev page's
    // same-origin calls as the server's; anything else keeps its Origin.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4400',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq, req) => {
            const { origin, host } = req.headers
            if (origin && /^(localhost|127\.0\.0\.1):\d+$/.test(host ?? '') && origin === `http://${host}`) {
              proxyReq.setHeader('origin', 'http://127.0.0.1:4400')
            }
          })
        },
      },
    },
  },
})
