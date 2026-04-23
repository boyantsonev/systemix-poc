const fs = require("fs");
const path = require("path");
const os = require("os");
const { listAvailable } = require("./add");

const SKILLS_DIR = path.join(os.homedir(), ".claude", "skills");

function list() {
  const available = listAvailable();

  console.log("\nAvailable workflows:\n");
  for (const p of available) {
    const installed = p.skills.every(s => fs.existsSync(path.join(SKILLS_DIR, s)));
    const status = installed ? "✓ installed" : "  available";
    console.log(`  ${status}  ${p.name.padEnd(24)} ${p.description}`);
  }

  console.log("\nInstalled skills:\n");
  if (!fs.existsSync(SKILLS_DIR)) {
    console.log("  (none — run `npx systemix add <workflow>` to install)\n");
    return;
  }

  const installed = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name);

  if (installed.length === 0) {
    console.log("  (none)\n");
  } else {
    for (const skill of installed) {
      console.log(`  /%-16s ~/.claude/skills/${skill}/`.replace("%", skill));
    }
    console.log();
  }
}

module.exports = { list };
