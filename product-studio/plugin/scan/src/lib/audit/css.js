"use strict";

// The declarations of a stylesheet, each with the line it is on. Selectors never reach the value
// scan, so `#add { … }` is an id, not a colour. Nested blocks (@media { :root { … } }) are read at
// their innermost level, which is where declarations live.

/** Comments become spaces of the same length, so offsets and line numbers still line up. */
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));

const lineAt = (text, index) => {
  let n = 1;
  for (let i = 0; i < index && i < text.length; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
};

/**
 * declarations(css, offset = 0, full = css) → [{ prop, value, line, index }]
 * `offset` places a <style> block inside a bigger file; `full` is that file, for line numbers.
 */
function declarations(css, offset = 0, full = css) {
  const text = stripComments(css);
  const out = [];
  const block = /\{([^{}]*)\}/g;
  let b;
  while ((b = block.exec(text))) {
    const start = b.index + 1;
    const decl = /([-\w]+)\s*:\s*([^;]+)/g;
    let d;
    while ((d = decl.exec(b[1]))) {
      const index = offset + start + d.index;
      out.push({ prop: d[1].toLowerCase(), value: d[2].trim(), index, valueIndex: index + d[0].indexOf(d[2]), line: lineAt(full, index) });
    }
  }
  return out;
}

/** The <style>…</style> blocks of a markup file, with where each one starts. */
function styleBlocks(markup) {
  const out = [];
  const re = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let m;
  while ((m = re.exec(markup))) out.push({ css: m[1], offset: m.index + m[0].indexOf(m[1]) });
  return out;
}

module.exports = { declarations, styleBlocks, lineAt, stripComments };
