import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, nodes, edges } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const slug = name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || "my-workflow";
    const workflowsDir = path.join(process.cwd(), ".systemix", "workflows");

    fs.mkdirSync(workflowsDir, { recursive: true });

    const filePath = path.join(workflowsDir, `${slug}.json`);
    const payload = {
      name: slug,
      displayName: name.trim(),
      savedAt: new Date().toISOString(),
      nodes: nodes ?? [],
      edges: edges ?? [],
    };

    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");

    return NextResponse.json({ ok: true, slug, path: `.systemix/workflows/${slug}.json` });
  } catch (err) {
    console.error("workflow save error", err);
    return NextResponse.json({ error: "failed to save workflow" }, { status: 500 });
  }
}
