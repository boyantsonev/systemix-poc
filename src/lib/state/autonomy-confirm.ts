import crypto from "crypto";

/**
 * One-time codes for raising the autonomy dial. A web request alone can't raise
 * it: POST /api/config prints a code to the dev server's own terminal and the
 * human types it back into Settings. Single use, bound to the exact target,
 * expiring, and attempt-limited. Server-only.
 */

const TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I lookalikes
const LENGTH = 8;

interface Pending {
  digest: Buffer;
  target: string;
  expiresAt: number;
  attempts: number;
}

// On globalThis so a pending code survives dev-server module reloads.
const KEY = Symbol.for("systemix.autonomy-confirm");
type Store = { pending: Pending | null };
const store = (): Store =>
  ((globalThis as unknown as Record<symbol, Store>)[KEY] ??= { pending: null });

const digest = (code: string) => crypto.createHash("sha256").update(code).digest();
const normalize = (code: string) => code.toUpperCase().replace(/[^A-Z0-9]/g, "");

/** Issue a fresh code for `target`, replacing any pending one. Returns it as ABCD-EFGH. */
export function issueConfirmCode(target: string): string {
  let code = "";
  for (let i = 0; i < LENGTH; i++) code += ALPHABET[crypto.randomInt(ALPHABET.length)];
  store().pending = { digest: digest(code), target, expiresAt: Date.now() + TTL_MS, attempts: 0 };
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/** True (and the code is spent) when `code` matches the pending code for `target`. */
export function consumeConfirmCode(target: string, code: unknown): boolean {
  const s = store();
  const p = s.pending;
  if (!p || typeof code !== "string") return false;
  if (Date.now() > p.expiresAt || p.target !== target) {
    s.pending = null;
    return false;
  }
  p.attempts += 1;
  const ok = crypto.timingSafeEqual(digest(normalize(code)), p.digest);
  if (ok || p.attempts >= MAX_ATTEMPTS) s.pending = null;
  return ok;
}
