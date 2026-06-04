import { defineConfig } from "vitest/config";

export default defineConfig({
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
