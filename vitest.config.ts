import { defineConfig } from "vitest/config";

export default defineConfig({
  // Keep symlinked node_modules resolving to the *symlink's* location, not its real
  // target. This worktree's node_modules is a symlink to the primary checkout (per this
  // repo's agent-worktree convention: `ln -s <primary>/node_modules node_modules`, no
  // separate install). Without preserveSymlinks, packages that anchor `import.meta.glob`
  // to their own file path (e.g. convex-test's function-module discovery,
  // `import.meta.glob("../../../convex/**/*.*s")` in node_modules/convex-test) resolve
  // relative to the symlink's *real* path — the primary checkout's convex/ — and miss any
  // convex module that exists only in this worktree, silently testing a different
  // checkout's code or failing with "Could not find module for: <name>". It's a no-op for
  // a normal (non-symlinked) install.
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
