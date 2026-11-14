import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Vitest runs our unit tests (like JUnit for TypeScript).
// We only test plain functions in src/lib, so no browser environment is needed.
export default defineConfig({
  resolve: {
    // Lets tests use the same "@/lib/..." import paths as the app (see tsconfig.json).
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    passWithNoTests: true,
  },
});
