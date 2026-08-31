import { defineConfig, devices } from "@playwright/test";

/**
 * Appearance gate (feature 002 / VR-6).
 *
 * Separate from `npm test`: jsdom performs no layout and applies no cascade, so
 * it cannot judge visibility, size or contrast. These specs run against a real
 * production build in a real browser.
 *
 * The two viewports are the ones spec 002 names: desktop 1280, mobile 390.
 */
const PORT = 3210;

export default defineConfig({
  testDir: "./tests/visual",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: `npm run build && npx next start -p ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
