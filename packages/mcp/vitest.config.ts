import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      reporter: ["text", "html"],
      exclude: ["node_modules/", "dist/", "src/__tests__/"],
    },
    testTimeout: 10000,
  },
});
