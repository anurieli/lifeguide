import { defineConfig } from "vitest/config";

export default defineConfig({
  // Keep symlinked node_modules resolving to the *symlink's* location, not its real
  // target. Without this, packages that anchor `import.meta.glob` to their own file
  // path (e.g. convex-test's function-module discovery) resolve relative to wherever
  // a symlinked node_modules physically lives — the wrong project when node_modules
  // is a symlink shared across git worktrees (an agent-worktree dev setup), silently
  // testing a different checkout's code.
  resolve: { preserveSymlinks: true },
  test: {
    environment: "node",
    server: {
      deps: {
        // Allow Vite's import.meta.glob transform to work in convex-test
        inline: ["convex-test"],
      },
    },
  },
});
