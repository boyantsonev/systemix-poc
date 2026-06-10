import { NextResponse } from "next/server";
import { loadInstanceConfig, applyConfigPatch, writeInstanceConfig } from "@/lib/state/instance-config";

// Persist Config-layer edits to systemix.config.yaml. Single-tenant, local dev tool:
// the patch is whitelist-merged onto the on-disk config before writing.
export async function POST(req: Request) {
  if (process.env.VERCEL) {
    return NextResponse.json(
      { ok: false, error: "Config saves require a local dev environment — edit systemix.config.yaml directly." },
      { status: 501 },
    );
  }

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
    writeInstanceConfig(next);
    return NextResponse.json({ ok: true, config: next });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Write failed." },
      { status: 500 },
    );
  }
}
