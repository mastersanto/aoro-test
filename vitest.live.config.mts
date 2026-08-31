import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Live tests need the real server env (ANTHROPIC_API_KEY). Vitest does not load
// .env into process.env, and Vite only exposes VITE_-prefixed vars, so load it
// here rather than adding a dotenv dependency for one file.
for (const file of [".env.local", ".env"]) {
  try {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/.exec(line);
      if (!m) continue;
      const value = m[2].trim().replace(/^["']|["']$/g, "");
      if (value && !process.env[m[1]]) process.env[m[1]] = value;
    }
  } catch {
    // file absent — live tests that need a key skip themselves
  }
}

// Live network tests only (tests/live). Kept separate so `npm test` stays hermetic.
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      // lib/ai/client.ts imports "server-only", whose whole job is to fail when
      // loaded outside a server context. The guard is correct and stays in the
      // app build; it is stubbed here so the live test can exercise the module.
      "server-only": new URL("./tests/live/noop.ts", import.meta.url).pathname,
    },
  },
  plugins: [react()],
  test: {
    // Node, not jsdom: these are API-level checks, and the Anthropic SDK refuses
    // to construct in a browser-like environment to avoid key exposure.
    environment: "node",
    globals: true,
    include: ["tests/live/**/*.test.ts?(x)"],
    testTimeout: 180_000,
  },
});
