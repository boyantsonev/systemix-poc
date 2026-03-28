import type { Component } from "@/lib/data/components";

type IntegrationStatusProps = {
  integrations: Component["integrations"];
  size?: "sm" | "md";
};

const figmaColors: Record<Component["integrations"]["figma"], string> = {
  synced:   "bg-violet-500",
  drifted:  "bg-amber-500",
  unlinked: "bg-slate-400",
};

const figmaLabels: Record<Component["integrations"]["figma"], string> = {
  synced:   "Figma: synced",
  drifted:  "Figma: drifted",
  unlinked: "Figma: unlinked",
};

const storybookColors: Record<Component["integrations"]["storybook"], string> = {
  synced:  "bg-emerald-500",
  drifted: "bg-amber-500",
  missing: "bg-slate-400",
};

const storybookLabels: Record<Component["integrations"]["storybook"], string> = {
  synced:  "Storybook: synced",
  drifted: "Storybook: drifted",
  missing: "Storybook: missing",
};

const githubColors: Record<Component["integrations"]["github"], string> = {
  clean:     "bg-blue-500",
  "pr-open": "bg-violet-500",
  "pr-merged": "bg-emerald-500",
};

const githubLabels: Record<Component["integrations"]["github"], string> = {
  clean:     "GitHub: clean",
  "pr-open": "GitHub: PR open",
  "pr-merged": "GitHub: PR merged",
};

export function IntegrationStatus({ integrations, size = "md" }: IntegrationStatusProps) {
  const dotSize = size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2";

  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`${dotSize} rounded-full flex-shrink-0 ${figmaColors[integrations.figma]}`}
        title={figmaLabels[integrations.figma]}
      />
      <span
        className={`${dotSize} rounded-full flex-shrink-0 ${storybookColors[integrations.storybook]}`}
        title={storybookLabels[integrations.storybook]}
      />
      <span
        className={`${dotSize} rounded-full flex-shrink-0 ${githubColors[integrations.github]}`}
        title={githubLabels[integrations.github]}
      />
    </div>
  );
}
