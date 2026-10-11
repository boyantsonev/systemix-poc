import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Node-environment runner for the Next.js app's API route handlers and
// contract helpers. The `@/` alias (→ ./src) is resolved by vite-tsconfig-paths
// from tsconfig.json. Collects src/**/*.test.ts plus the MCP server's TS tests
// (packages/mcp-server/test/) — packages/cli keeps Jest.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "packages/mcp-server/test/**/*.test.ts"],
  },
});
