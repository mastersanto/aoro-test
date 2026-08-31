import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Live network tests only (tests/live). Kept separate so `npm test` stays hermetic.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    include: ["tests/live/**/*.test.ts?(x)"],
    testTimeout: 30_000,
  },
});
