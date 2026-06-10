"use strict";

/**
 * Thin LLM client for Hermes synthesis.
 * Tries Ollama first; falls back to Anthropic API when ANTHROPIC_API_KEY is set
 * and Ollama is unreachable or returns an error.
 */

const OLLAMA_BASE = process.env.OLLAMA_URL
  ? process.env.OLLAMA_URL.replace(/\/api\/chat$/, "")
  : "http://localhost:11434";

const OLLAMA_MODEL = process.env.HERMES_MODEL ?? "hermes3";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_MODEL = process.env.HERMES_FALLBACK_MODEL ?? "claude-haiku-4-5-20251001";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

/** Check whether Ollama is reachable. Returns true/false. */
async function ollamaReachable() {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/tags`, {
      signal: AbortSignal.timeout(3_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Chat-style call (system + user messages → text response).
 * Used by evidence.js for hypothesis synthesis.
 */
async function chat(systemPrompt, userContent, { temperature = 0.1, maxTokens = 512 } = {}) {
  const reachable = await ollamaReachable();

  if (reachable) {
    const res = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        options: { temperature, num_predict: maxTokens },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (res.ok) {
      const json = await res.json();
      return json.message?.content?.trim() ?? null;
    }
  }

  // Fallback: Anthropic API
  if (!ANTHROPIC_API_KEY) return null;
  console.log("  [hermes] Ollama unavailable — using Anthropic API fallback");
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.content?.[0]?.text?.trim() ?? null;
}

/**
 * Generate-style call (single prompt → text response).
 * Used by watch.js for token prose and component synthesis.
 */
async function generate(prompt, { timeout = 30_000 } = {}) {
  const reachable = await ollamaReachable();

  if (reachable) {
    const res = await fetch(`${OLLAMA_BASE}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false }),
      signal: AbortSignal.timeout(timeout),
    });
    if (res.ok) {
      const json = await res.json();
      return json.response?.trim() ?? null;
    }
  }

  // Fallback: Anthropic API (prompt as user message, no system)
  if (!ANTHROPIC_API_KEY) return null;
  console.log("  [hermes] Ollama unavailable — using Anthropic API fallback");
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(timeout),
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.content?.[0]?.text?.trim() ?? null;
}

module.exports = { chat, generate };
