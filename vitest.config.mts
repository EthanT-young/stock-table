import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Vitest runs our unit tests (like JUnit for TypeScript).
// We only test plain functions in src/lib, so no browser environment is needed.
export default defineConfig({
  resolve: {
    alias: {
      // Lets tests use the same "@/lib/..." import paths as the app (see tsconfig.json).
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // Next.js provides "server-only" in the app; tests use an empty stand-in.
      "server-only": fileURLToPath(
        new URL("./test/stubs/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    passWithNoTests: true,
  },
});
