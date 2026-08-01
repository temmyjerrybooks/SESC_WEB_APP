import { defineConfig, devices } from "@playwright/test";

const productionMode = process.env.PLAYWRIGHT_PRODUCTION === "true";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ??
  (productionMode ? "http://127.0.0.1:3110" : "http://127.0.0.1:3000");

export default defineConfig({
  testDir: "./e2e",
  timeout: 180_000,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: productionMode
          ? "node ./node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3110"
          : "node ./node_modules/next/dist/bin/next dev --hostname 127.0.0.1",
        url: `${baseURL}/api/health`,
        reuseExistingServer: !process.env.CI && !productionMode,
        timeout: 120_000,
      },
});
