import { defineConfig } from "vitest/config";

export default defineConfig({
  // This worktree's node_modules is a symlink to the primary checkout (per this
  // repo's agent-worktree convention: `ln -s <primary>/node_modules node_modules`,
  // no separate install). Without preserveSymlinks, convex-test's internal
  // `import.meta.glob("../../../convex/**/*.*s")` (in node_modules/convex-test)
  // resolves relative to the symlink's *real* path — the primary checkout's
  // convex/ — and misses any convex module that exists only in this worktree,
  // failing with "Could not find module for: <name>" even though the file is
  // right there on disk. Keeping the glob relative to the symlink as-written
  // fixes that; it's a no-op for a normal (non-symlinked) install.
  resolve: {
    preserveSymlinks: true,
  },
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
