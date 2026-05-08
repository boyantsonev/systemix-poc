"use strict";

/**
 * skill-update.js — RED scaffold
 *
 * Exports the skillUpdate.update() driving port.
 * This module will probe Ollama availability, read hypothesis frontmatter,
 * resolve the target SKILL.md path, call Hermes to patch the relevant section,
 * classify the change, write atomically, and push HITL cards on failure or structural change.
 *
 * RED: all calls throw — implementation is the DELIVER wave responsibility.
 */

exports.__SCAFFOLD__ = true;

/**
 * Update the relevant SKILL.md after a hypothesis decision is committed.
 *
 * @param {string} hypothesisId   — e.g. "pricing-headline-v2"
 * @param {'promote'|'kill'} decision
 * @param {object} card           — the HITL card that triggered this update
 * @param {object} [opts]
 * @param {string} [opts.workspaceRoot] — override project root (for tests; defaults to cwd)
 * @param {Function} [opts.fetch]       — injectable fetch (for tests; defaults to global fetch)
 * @param {Function} [opts.onLog]       — structured log sink (entry => void); defaults to console.log
 * @returns {Promise<void>}
 */
async function update(hypothesisId, decision, card, opts = {}) {
  throw new Error("Not yet implemented — RED scaffold");
}

exports.update = update;
