// Mock GitHub data for a design system repository

export type GithubPR = {
  number: number
  title: string
  branch: string
  state: "open" | "merged" | "closed"
  author: string
  createdAt: string
  updatedAt: string
  files: string[]
  agentCreated: boolean
  skill?: string
  labels: string[]
  reviewStatus?: "approved" | "changes-requested" | "pending"
  url: string
}

export type GithubCommit = {
  sha: string
  shortSha: string
  message: string
  author: string
  date: string
  files: string[]
  additions: number
  deletions: number
}

export const githubRepo = "acme/design-system"
export const githubBaseUrl = "https://github.com/acme/design-system"

export const githubPRs: GithubPR[] = [
  {
    number: 142,
    title: "fix(button): replace hardcoded #a855f7 with --color-primary token",
    branch: "ada/fix-button-token-drift",
    state: "open",
    author: "ada-agent",
    createdAt: "2026-03-09T10:14:00Z",
    updatedAt: "2026-03-09T10:14:00Z",
    files: [
      "src/components/ui/button.tsx",
      "src/app/globals.css",
    ],
    agentCreated: true,
    skill: "/generate-from-figma",
    labels: ["drift-fix", "tokens", "automated"],
    reviewStatus: "pending",
    url: "https://github.com/acme/design-system/pull/142",
  },
  {
    number: 141,
    title: "feat(table): add sortable columns and row selection",
    branch: "ada/table-sortable-columns",
    state: "open",
    author: "ada-agent",
    createdAt: "2026-03-08T16:40:00Z",
    updatedAt: "2026-03-09T08:22:00Z",
    files: [
      "src/components/ui/table.tsx",
      "src/components/ui/table.stories.tsx",
    ],
    agentCreated: true,
    skill: "/generate-from-figma",
    labels: ["feature", "data", "automated"],
    reviewStatus: "changes-requested",
    url: "https://github.com/acme/design-system/pull/141",
  },
  {
    number: 140,
    title: "chore(tokens): sync spacing scale from Figma variables",
    branch: "flux/sync-spacing-tokens",
    state: "open",
    author: "flux-agent",
    createdAt: "2026-03-08T09:05:00Z",
    updatedAt: "2026-03-08T09:05:00Z",
    files: [
      "src/app/globals.css",
      "src/lib/data/tokens.ts",
      "tailwind.config.ts",
    ],
    agentCreated: true,
    skill: "/sync-tokens",
    labels: ["tokens", "figma-sync", "automated"],
    reviewStatus: "pending",
    url: "https://github.com/acme/design-system/pull/140",
  },
  {
    number: 139,
    title: "feat(dialog): add accessible Dialog component",
    branch: "feat/dialog-component",
    state: "merged",
    author: "sarah.chen",
    createdAt: "2026-03-06T14:00:00Z",
    updatedAt: "2026-03-07T11:30:00Z",
    files: [
      "src/components/ui/dialog.tsx",
      "src/components/ui/dialog.stories.tsx",
      "src/lib/data/components.ts",
    ],
    agentCreated: false,
    labels: ["feature", "a11y", "feedback"],
    reviewStatus: "approved",
    url: "https://github.com/acme/design-system/pull/139",
  },
  {
    number: 138,
    title: "fix(badge): correct border-radius to use --radius-full",
    branch: "fix/badge-border-radius",
    state: "merged",
    author: "james.okafor",
    createdAt: "2026-03-05T10:00:00Z",
    updatedAt: "2026-03-05T15:45:00Z",
    files: [
      "src/components/ui/badge.tsx",
    ],
    agentCreated: false,
    labels: ["bug", "tokens"],
    reviewStatus: "approved",
    url: "https://github.com/acme/design-system/pull/138",
  },
  {
    number: 137,
    title: "docs(select): add Storybook stories for all Select variants",
    branch: "scout/select-stories",
    state: "merged",
    author: "scout-agent",
    createdAt: "2026-03-04T08:30:00Z",
    updatedAt: "2026-03-04T12:10:00Z",
    files: [
      "src/components/ui/select.stories.tsx",
    ],
    agentCreated: true,
    skill: "/drift-report",
    labels: ["storybook", "docs", "automated"],
    reviewStatus: "approved",
    url: "https://github.com/acme/design-system/pull/137",
  },
  {
    number: 136,
    title: "refactor(progress): migrate from inline styles to CSS variables",
    branch: "refactor/progress-css-vars",
    state: "merged",
    author: "sarah.chen",
    createdAt: "2026-03-03T13:20:00Z",
    updatedAt: "2026-03-04T09:00:00Z",
    files: [
      "src/components/ui/progress.tsx",
      "src/app/globals.css",
    ],
    agentCreated: false,
    labels: ["refactor", "tokens"],
    reviewStatus: "approved",
    url: "https://github.com/acme/design-system/pull/136",
  },
  {
    number: 135,
    title: "feat(avatar): add Avatar component with fallback initials",
    branch: "feat/avatar-component",
    state: "closed",
    author: "marcus.lee",
    createdAt: "2026-02-28T16:00:00Z",
    updatedAt: "2026-03-02T10:00:00Z",
    files: [
      "src/components/ui/avatar.tsx",
      "src/components/ui/avatar.stories.tsx",
    ],
    agentCreated: false,
    labels: ["feature", "primitives"],
    reviewStatus: "changes-requested",
    url: "https://github.com/acme/design-system/pull/135",
  },
]

export const githubCommits: GithubCommit[] = [
  {
    sha: "f3a9c1d2e4b5f6a7",
    shortSha: "f3a9c1d",
    message: "fix(button): replace hardcoded color with --color-primary token",
    author: "ada-agent",
    date: "2026-03-09T10:14:00Z",
    files: ["src/components/ui/button.tsx"],
    additions: 3,
    deletions: 3,
  },
  {
    sha: "a1b2c3d4e5f67890",
    shortSha: "a1b2c3d",
    message: "chore: update token sync from Figma variables export",
    author: "flux-agent",
    date: "2026-03-08T09:05:00Z",
    files: ["src/app/globals.css", "tailwind.config.ts"],
    additions: 14,
    deletions: 6,
  },
  {
    sha: "b4e8f2a1c9d30571",
    shortSha: "b4e8f2a",
    message: "feat(table): add sortable columns with aria-sort support",
    author: "ada-agent",
    date: "2026-03-08T16:40:00Z",
    files: ["src/components/ui/table.tsx", "src/components/ui/table.stories.tsx"],
    additions: 87,
    deletions: 12,
  },
  {
    sha: "c7d1a4b8e2f09653",
    shortSha: "c7d1a4b",
    message: "feat(dialog): add accessible Dialog with focus trap",
    author: "sarah.chen",
    date: "2026-03-07T11:30:00Z",
    files: [
      "src/components/ui/dialog.tsx",
      "src/components/ui/dialog.stories.tsx",
      "src/lib/data/components.ts",
    ],
    additions: 143,
    deletions: 0,
  },
  {
    sha: "d9e3f5c2a7b10842",
    shortSha: "d9e3f5c",
    message: "fix(badge): use --radius-full instead of hardcoded 9999px",
    author: "james.okafor",
    date: "2026-03-05T15:45:00Z",
    files: ["src/components/ui/badge.tsx"],
    additions: 2,
    deletions: 2,
  },
  {
    sha: "e5f7a1b3c4d82960",
    shortSha: "e5f7a1b",
    message: "docs(select): add Select stories for default, disabled, and error states",
    author: "scout-agent",
    date: "2026-03-04T12:10:00Z",
    files: ["src/components/ui/select.stories.tsx"],
    additions: 68,
    deletions: 0,
  },
  {
    sha: "f2a8d6e1b9c43075",
    shortSha: "f2a8d6e",
    message: "refactor(progress): migrate inline styles to CSS custom properties",
    author: "sarah.chen",
    date: "2026-03-04T09:00:00Z",
    files: ["src/components/ui/progress.tsx", "src/app/globals.css"],
    additions: 22,
    deletions: 18,
  },
  {
    sha: "a6b1c9d3e7f50284",
    shortSha: "a6b1c9d",
    message: "chore(tokens): add --spacing-18 and --spacing-22 to scale",
    author: "marcus.lee",
    date: "2026-03-03T11:00:00Z",
    files: ["src/app/globals.css", "src/lib/data/tokens.ts"],
    additions: 8,
    deletions: 0,
  },
  {
    sha: "b9c4e7f2a1d60358",
    shortSha: "b9c4e7f",
    message: "feat(tooltip): add delay prop and keyboard trigger support",
    author: "james.okafor",
    date: "2026-03-02T14:30:00Z",
    files: ["src/components/ui/tooltip.tsx", "src/components/ui/tooltip.stories.tsx"],
    additions: 31,
    deletions: 8,
  },
  {
    sha: "c2d8a5f3b1e70496",
    shortSha: "c2d8a5f",
    message: "fix(input): correct focus ring color to use --color-ring token",
    author: "marcus.lee",
    date: "2026-03-01T16:00:00Z",
    files: ["src/components/ui/input.tsx"],
    additions: 4,
    deletions: 4,
  },
  {
    sha: "d4f1b7e9c3a20587",
    shortSha: "d4f1b7e",
    message: "test(card): add interaction tests for CardHeader overflow",
    author: "sarah.chen",
    date: "2026-02-28T10:00:00Z",
    files: ["src/components/ui/card.test.tsx"],
    additions: 44,
    deletions: 0,
  },
  {
    sha: "e8a3c6f2b5d10769",
    shortSha: "e8a3c6f",
    message: "chore: update design-system README with token usage guide",
    author: "james.okafor",
    date: "2026-02-27T13:00:00Z",
    files: ["README.md", "docs/tokens.md"],
    additions: 120,
    deletions: 14,
  },
]
