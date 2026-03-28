import { AppShell } from "@/components/systemix/AppShell";
import { githubPRs, githubCommits, githubRepo } from "@/lib/data/github";
import { ExternalLink, GitPullRequest, GitMerge, GitBranch, Plus, Minus } from "lucide-react";

const openPRs   = githubPRs.filter(p => p.state === "open");
const mergedPRs = githubPRs.filter(p => p.state === "merged");
const sortedPRs = [...openPRs, ...githubPRs.filter(p => p.state !== "open")];

const PR_STATE_LABEL: Record<string, string> = {
  open:   "Open",
  merged: "Merged",
  closed: "Closed",
};

const REVIEW_LABEL: Record<string, string> = {
  approved:             "Approved",
  "changes-requested":  "Changes requested",
  pending:              "Pending review",
};

export default function GitHubPage() {
  return (
    <AppShell>
      {/* Header */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Connected to{" "}
            <a
              href={`https://github.com/${githubRepo}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:underline inline-flex items-center gap-1"
            >
              {githubRepo} <ExternalLink size={9} className="opacity-50" />
            </a>
          </p>
        </div>

        <h1 className="text-2xl font-black text-foreground mt-3">GitHub</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Pull requests and commit activity for the design system repo.</p>

        <div className="flex items-center gap-6 mt-4 flex-wrap">
          <div>
            <p className="text-xl font-black text-foreground">{openPRs.length}</p>
            <p className="text-xs text-muted-foreground">Open PRs</p>
          </div>
          <div>
            <p className="text-xl font-black text-foreground">{mergedPRs.length}</p>
            <p className="text-xs text-muted-foreground">Merged PRs</p>
          </div>
          <div>
            <p className="text-xl font-black text-foreground">{githubCommits.length}</p>
            <p className="text-xs text-muted-foreground">Recent commits</p>
          </div>
        </div>
      </section>

      {/* Pull Requests */}
      <section>
        <h2 className="text-sm font-semibold text-foreground mb-3">Pull Requests</h2>
        <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
          {sortedPRs.map((pr) => (
            <div key={pr.number} className="bg-card px-4 py-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0">
                  {pr.state === "merged"
                    ? <GitMerge size={13} className="text-muted-foreground" />
                    : pr.state === "open"
                    ? <GitPullRequest size={13} className="text-muted-foreground" />
                    : <GitBranch size={13} className="text-muted-foreground" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground font-mono">#{pr.number}</span>
                    <span className="text-[10px] border border-border rounded px-1.5 py-0.5 text-muted-foreground">
                      {PR_STATE_LABEL[pr.state]}
                    </span>
                    {pr.agentCreated && pr.skill && (
                      <code className="text-[10px] border border-border rounded px-1.5 py-0.5 text-foreground/70 font-mono">
                        {pr.skill}
                      </code>
                    )}
                    {pr.reviewStatus && (
                      <span className="text-[10px] border border-border rounded px-1.5 py-0.5 text-muted-foreground">
                        {REVIEW_LABEL[pr.reviewStatus]}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground mt-1">{pr.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-muted-foreground">{pr.author}</span>
                    <span className="text-muted-foreground/30">·</span>
                    <span className="text-xs text-muted-foreground">{pr.files.length} file{pr.files.length !== 1 ? "s" : ""}</span>
                    {pr.labels.map(label => (
                      <span key={label} className="text-[10px] px-1.5 py-0.5 bg-muted rounded text-muted-foreground font-mono">
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
                <a href={pr.url} target="_blank" rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 mt-0.5">
                  <ExternalLink size={10} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Commits */}
      <section>
        <h2 className="text-sm font-semibold text-foreground mb-3">Recent Commits</h2>
        <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
          {githubCommits.map((commit) => (
            <div key={commit.sha} className="flex items-center gap-3 bg-card px-4 py-3">
              <code className="text-xs font-mono text-muted-foreground/50 flex-shrink-0 w-14">
                {commit.shortSha}
              </code>
              <p className="text-sm text-foreground flex-1 min-w-0 truncate">{commit.message}</p>
              <span className="text-xs text-muted-foreground flex-shrink-0 hidden sm:block">{commit.author}</span>
              <div className="flex items-center gap-1.5 flex-shrink-0 text-xs text-muted-foreground">
                <span className="flex items-center gap-0.5">
                  <Plus size={9} />{commit.additions}
                </span>
                <span className="flex items-center gap-0.5">
                  <Minus size={9} />{commit.deletions}
                </span>
              </div>
              <span className="text-xs text-muted-foreground/50 flex-shrink-0 hidden md:block">
                {new Date(commit.date).toLocaleDateString()}
              </span>
              <a href={`https://github.com/acme/design-system/commit/${commit.sha}`}
                target="_blank" rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
                <ExternalLink size={10} />
              </a>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
