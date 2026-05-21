import Link from "next/link";

function Row({ label, official, console }: { label: string; official: string; console: string }) {
  return (
    <div className="grid grid-cols-[1fr_1fr_1fr] gap-px bg-border/40">
      <div className="bg-background px-3 py-3">
        <p className="text-[12px] text-muted-foreground leading-snug">{label}</p>
      </div>
      <div className="bg-background px-3 py-3">
        <p className="text-[12px] text-foreground/80 leading-snug">{official}</p>
      </div>
      <div className="bg-background px-3 py-3">
        <p className="text-[12px] text-foreground/80 leading-snug">{console}</p>
      </div>
    </div>
  );
}

function Rule({ label, body }: { label: string; body: React.ReactNode }) {
  return (
    <div className="border border-border/40 rounded-xl px-4 py-4">
      <p className="text-[13px] font-semibold text-foreground mb-1">{label}</p>
      <p className="text-[13px] text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}

function Code({ children }: { children: string }) {
  return (
    <code className="font-mono text-[12px] bg-muted/60 px-1 py-0.5 rounded text-foreground">
      {children}
    </code>
  );
}

const SKILL_MAP = [
  { skill: "/figma",          mcp: "Official",  direction: "Figma → code",   note: "get_design_context, get_screenshot" },
  { skill: "/tokens",         mcp: "Official",  direction: "Figma → code",   note: "get_variable_defs" },
  { skill: "/component",      mcp: "Official",  direction: "Figma → code",   note: "get_design_context, get_screenshot" },
  { skill: "/drift-report",   mcp: "Official",  direction: "Figma → code",   note: "get_variable_defs" },
  { skill: "/check-parity",   mcp: "Official",  direction: "Figma → code",   note: "get_design_context" },
  { skill: "/connect",        mcp: "Official",  direction: "Bidirectional",   note: "get_code_connect_map, send_code_connect_mappings" },
  { skill: "/deploy-annotate",mcp: "Official",  direction: "Code → Figma",   note: "post_comment" },
  { skill: "/sync-to-figma",  mcp: "Console",   direction: "Code → Figma",   note: "figma_batch_create_variables, figma_setup_design_tokens" },
  { skill: "/figma-push",     mcp: "Console",   direction: "Code → Figma",   note: "figma_capture_screenshot, figma_set_image_fill" },
  { skill: "/sync",           mcp: "Both",      direction: "Bidirectional",   note: "read with Official, write with Console" },
  { skill: "/design-to-code", mcp: "Both",      direction: "Bidirectional",   note: "read with Official, write with Console" },
];

export default function FigmaMcpsPage() {
  return (
    <article>
      <p className="text-[13px] font-mono text-muted-foreground mb-3">Concepts</p>
      <h1 className="text-[2rem] font-black tracking-tight leading-[1.15] mb-2">
        Figma MCPs
      </h1>
      <p className="text-[15px] text-muted-foreground leading-relaxed mb-10">
        Systemix uses two separate Figma MCP servers. They are complementary, not alternatives — one reads, one writes. Understanding which to call when is the single most important thing to know before running any Figma skill.
      </p>

      <hr className="border-border/40 mb-8" />

      <section className="mb-10">
        <h2 className="text-[1.1rem] font-bold tracking-tight mb-4">The two servers</h2>

        <div className="rounded-xl border border-border/40 overflow-hidden mb-4">
          <div className="grid grid-cols-[1fr_1fr_1fr] gap-px bg-border/40">
            <div className="bg-muted/30 px-3 py-2.5" />
            <div className="bg-muted/30 px-3 py-2.5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">Official Figma MCP</p>
            </div>
            <div className="bg-muted/30 px-3 py-2.5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">Figma Console MCP</p>
            </div>
          </div>
          <Row label="Made by"      official="Figma Inc."                       console="Southleft / TJ Pitre" />
          <Row label="Tool prefix"  official="mcp__claude_ai_Figma__*"          console="mcp__figma-console__*" />
          <Row label="Tools"        official="16 (1 generic write: use_figma)"  console="94 (35+ dedicated writes)" />
          <Row label="Connection"   official="REST API + Figma cloud"           console="WebSocket Desktop Bridge + REST" />
          <Row label="Auth"         official="OAuth"                            console="Personal Access Token" />
          <Row label="Source"       official="Closed"                           console="Open (MIT)" />
          <Row label="Cost"         official="Usage-based → paid"               console="Free, unlimited, self-hostable" />
          <Row label="Requires"     official="Figma OAuth (one-time login)"     console="Figma Desktop open on port 3845" />
        </div>

        <div className="flex gap-3 text-[12px] font-mono">
          <a href="https://www.figma.com/developers/mcp" target="_blank" rel="noopener noreferrer" className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">figma.com/developers/mcp ↗</a>
          <span className="text-muted-foreground/20">·</span>
          <a href="https://docs.figma-console-mcp.southleft.com" target="_blank" rel="noopener noreferrer" className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">docs.figma-console-mcp.southleft.com ↗</a>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-[1.1rem] font-bold tracking-tight mb-4">Decision rule</h2>
        <p className="text-[14px] text-muted-foreground leading-relaxed mb-4">
          One sentence: <strong className="text-foreground">read with Official, write with Console.</strong>
        </p>
        <div className="space-y-3">
          <Rule
            label="Reading from Figma → Official"
            body={<>Use <Code>mcp__claude_ai_Figma__*</Code> for all reads: <Code>get_design_context</Code>, <Code>get_variable_defs</Code>, <Code>get_screenshot</Code>, <Code>get_metadata</Code>. No Figma Desktop required.</>}
          />
          <Rule
            label="Writing to Figma → Console"
            body={<>Use <Code>mcp__figma-console__*</Code> for all writes: creating/updating variables, setting fills, pushing images, renaming nodes. Requires Figma Desktop open.</>}
          />
          <Rule
            label="Code Connect → Official only"
            body={<>Code Connect mapping (<Code>get_code_connect_map</Code>, <Code>send_code_connect_mappings</Code>) exists only in the Official MCP. Console has no equivalent.</>}
          />
          <Rule
            label="Batch variable ops → Console only"
            body={<><Code>figma_batch_create_variables</Code> and <Code>figma_batch_update_variables</Code> process 100 entries per call. The Official MCP has no batch path — each variable would be a sequential call.</>}
          />
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-[1.1rem] font-bold tracking-tight mb-4">Exclusive capabilities</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="border border-border/40 rounded-xl px-4 py-4">
            <p className="text-[11px] font-mono font-bold uppercase tracking-wide text-muted-foreground/50 mb-3">Only Official MCP can</p>
            <ul className="space-y-2">
              {[
                "Code Connect — map Figma components to codebase React components",
                "Framework code generation (React, Vue, etc.) from a Figma node",
                "Capture any live URL as a Figma layer via use_figma",
                "Create FigJam diagrams from Mermaid syntax",
                "Create new blank Figma files",
              ].map(item => (
                <li key={item} className="flex items-start gap-2 text-[13px] text-muted-foreground">
                  <span className="mt-[5px] shrink-0 w-1 h-1 rounded-full bg-muted-foreground/40" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="border border-border/40 rounded-xl px-4 py-4">
            <p className="text-[11px] font-mono font-bold uppercase tracking-wide text-muted-foreground/50 mb-3">Only Console MCP can</p>
            <ul className="space-y-2">
              {[
                "Batch variable create/update (100 per call)",
                "Design system health scoring and hardcoded value detection",
                "Real-time selection monitoring and document change events",
                "figma_execute — run arbitrary Plugin API code",
                "FigJam (9 tools), Slides (15 tools), Annotations (3 tools)",
              ].map(item => (
                <li key={item} className="flex items-start gap-2 text-[13px] text-muted-foreground">
                  <span className="mt-[5px] shrink-0 w-1 h-1 rounded-full bg-muted-foreground/40" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-[1.1rem] font-bold tracking-tight mb-4">Skill → MCP mapping</h2>
        <div className="rounded-xl border border-border/40 overflow-hidden">
          <div className="grid grid-cols-[auto_auto_1fr] gap-px bg-border/40">
            <div className="bg-muted/30 px-3 py-2.5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">Skill</p>
            </div>
            <div className="bg-muted/30 px-3 py-2.5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">MCP</p>
            </div>
            <div className="bg-muted/30 px-3 py-2.5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">Tools called</p>
            </div>
          </div>
          {SKILL_MAP.map(({ skill, mcp, direction, note }) => (
            <div key={skill} className="grid grid-cols-[auto_auto_1fr] gap-px bg-border/40">
              <div className="bg-background px-3 py-2.5 flex items-center">
                <code className="text-[12px] font-mono text-foreground/80">{skill}</code>
              </div>
              <div className="bg-background px-3 py-2.5 flex items-center">
                <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded border ${
                  mcp === "Official" ? "border-sky-500/30 text-sky-400 bg-sky-500/5" :
                  mcp === "Console"  ? "border-teal-500/30 text-teal-400 bg-teal-500/5" :
                                       "border-violet-500/30 text-violet-400 bg-violet-500/5"
                }`}>{mcp}</span>
              </div>
              <div className="bg-background px-3 py-2.5">
                <p className="text-[12px] text-muted-foreground/60 leading-snug">{note}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-[1.1rem] font-bold tracking-tight mb-3">If Console MCP errors</h2>
        <p className="text-[14px] text-muted-foreground leading-relaxed mb-4">
          Console MCP write tools fail with <Code>bridge not connected</Code> or <Code>no open file</Code> when Figma Desktop is not running or the target file is not open. Fix in order:
        </p>
        <ol className="space-y-2">
          {[
            "Open Figma Desktop and open the target file",
            "Reload the Figma Console MCP plugin inside Figma (Plugins → Development → Figma Console MCP → Run)",
            "Verify the MCP server is registered: claude mcp list should show figma-console",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-[13px] text-muted-foreground">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-muted/60 text-[10px] font-bold shrink-0 mt-0.5">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      <hr className="border-border/40 my-8" />

      <section>
        <h2 className="text-[1.1rem] font-bold tracking-tight mb-3">See also</h2>
        <div className="flex flex-col gap-1.5 text-[13px] font-mono">
          <Link href="/docs/skills" className="text-muted-foreground/60 hover:text-muted-foreground transition-colors">→ Skills library — full skill list with MCP badges</Link>
          <Link href="/docs/guides/setup" className="text-muted-foreground/60 hover:text-muted-foreground transition-colors">→ Setup Guide — how to register both MCPs</Link>
          <Link href="/docs/architecture" className="text-muted-foreground/60 hover:text-muted-foreground transition-colors">→ Architecture — where MCPs sit in the stack</Link>
        </div>
      </section>
    </article>
  );
}
