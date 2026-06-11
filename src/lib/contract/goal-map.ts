import fs from "node:fs";
import path from "node:path";

// hypothesis id → parent goal id, read from contract/hypotheses frontmatter.
// Queue cards that only carry a hypothesisId can be scoped to a goal without
// duplicating the link on every card (single source: the hypothesis file).
export function hypothesisGoalMap(): Record<string, string> {
  const dir = path.join(process.cwd(), "contract", "hypotheses");
  const map: Record<string, string> = {};
  let files: string[] = [];
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith(".mdx"));
  } catch {
    return map;
  }
  for (const f of files) {
    const fm =
      fs.readFileSync(path.join(dir, f), "utf8").match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
    const id = fm.match(/^id:\s*(.+)$/m)?.[1]?.trim();
    const goal = fm.match(/^goal:\s*(.+)$/m)?.[1]?.trim();
    if (id && goal) map[id] = goal;
  }
  return map;
}
