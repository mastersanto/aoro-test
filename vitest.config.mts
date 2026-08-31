import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Vite resolves tsconfig `paths` (the "@/*" alias) natively — no plugin needed.
  resolve: { tsconfigPaths: true },
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    exclude: ["node_modules/**", ".next/**", "tests/live/**", "tests/visual/**"],
  },
});
