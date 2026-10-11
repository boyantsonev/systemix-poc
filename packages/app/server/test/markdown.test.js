// The UI's markdown renderer feeds dangerouslySetInnerHTML with agent-written
// docs, so every link it emits must stay a plain, safe <a href>.
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { mdToHtml, safeHref } from '../../ui/lib.js'

const ANCHOR = /^<a href="([^"]*)" target="_blank" rel="noreferrer">$/
const anchors = (html) => [...html.matchAll(/<a\b[^>]*>/g)].map((m) => m[0])
// What a browser decodes out of a double-quoted attribute value.
const decodeAttr = (v) =>
  v.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')

/** Every anchor is exactly our markup, and its href resolves to http(s)/mailto. */
function assertSafeAnchors(html) {
  for (const a of anchors(html)) {
    const m = ANCHOR.exec(a)
    assert.ok(m, `unexpected anchor markup: ${a}`)
    const { protocol } = new URL(decodeAttr(m[1]), 'http://localhost:4400/')
    assert.ok(['http:', 'https:', 'mailto:'].includes(protocol), `unsafe href: ${m[1]}`)
  }
}

describe('mdToHtml links', () => {
  it('keeps http(s), mailto, relative and #fragment links', () => {
    const html = mdToHtml(
      '[a](https://example.com/x?y=1&z=2) [b](mailto:hi@example.com) [c](./tokens.md) [d](#setup) [e](/docs/x)'
    )
    assert.equal(anchors(html).length, 5)
    assertSafeAnchors(html)
    assert.match(html, /href="https:\/\/example\.com\/x\?y=1&amp;z=2"/)
  })

  for (const target of [
    'javascript:alert(1)',
    'JaVaScRiPt:alert(1)',
    'javascript:alert%281%29',
    '\u0001javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
  ]) {
    it(`renders ${JSON.stringify(target)} as plain text`, () => {
      const html = mdToHtml(`see [click](${target}) now`)
      assertSafeAnchors(html)
      assert.equal(anchors(html).length, 0)
      assert.match(html, /click/)
    })
  }

  it('cannot break out of the href attribute', () => {
    for (const target of ['https://ok.example/"onmouseover="alert(1)', "/x'onfocus='alert(1)", 'a"/autofocus/onfocus="alert(1)']) {
      const html = mdToHtml(`[x](${target})`)
      assert.equal(anchors(html).length, 1, html)
      assertSafeAnchors(html)
    }
  })

  it('reads the scheme the way a browser does', () => {
    assert.equal(safeHref(' \tjavascript:alert(1)'), null)
    assert.equal(safeHref('java\nscript:alert(1)'), null)
    assert.equal(safeHref('HTTPS://example.com'), 'HTTPS://example.com')
    assert.equal(safeHref('docs/a:b'), 'docs/a:b')
  })
})
