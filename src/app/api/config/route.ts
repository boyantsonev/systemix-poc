import { NextResponse } from "next/server";
import {
  loadInstanceConfig,
  applyConfigPatch,
  writeInstanceConfig,
  raisesAutonomy,
  autonomyTarget,
} from "@/lib/state/instance-config";
import { consumeConfirmCode, issueConfirmCode } from "@/lib/state/autonomy-confirm";
import { rejectNonLocal } from "@/lib/local-request";

// Persist Config-layer edits to systemix.config.yaml. Single-tenant, local dev tool:
// the patch is whitelist-merged onto the on-disk config before writing.
export async function POST(req: Request) {
  const denied = rejectNonLocal(req);
  if (denied) return denied;

  const base = loadInstanceConfig();
  if (!base) {
    return NextResponse.json({ ok: false, error: "No systemix.config.yaml to update." }, { status: 404 });
  }

  let patch: unknown;
  try {
    patch = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const next = applyConfigPatch(base, patch);

    // Raising autonomy is a human decision: it needs the one-time code this
    // server prints to its own terminal. Lowering never does.
    if (raisesAutonomy(base, next)) {
      const target = autonomyTarget(next);
      const code = (patch as { confirmCode?: unknown } | null)?.confirmCode;
      if (code === undefined || code === null || code === "") {
        const issued = issueConfirmCode(target);
        console.log(
          `\n[systemix] Confirm raising autonomy (${autonomyTarget(base)} → ${target}):` +
            `\n[systemix]   enter ${issued} in Settings — expires in 5 minutes.\n`,
        );
        return NextResponse.json(
          {
            ok: false,
            needsConfirmation: true,
            error: "Raising autonomy needs a local OK — enter the code printed in the terminal running the dev server.",
          },
          { status: 403 },
        );
      }
      if (!consumeConfirmCode(target, code)) {
        return NextResponse.json(
          {
            ok: false,
            needsConfirmation: true,
            error: "That code didn't match or has expired — save again for a new one.",
          },
          { status: 403 },
        );
      }
    }

    writeInstanceConfig(next);
    return NextResponse.json({ ok: true, config: next });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Write failed." },
      { status: 500 },
    );
  }
}
