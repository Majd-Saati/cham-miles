import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/visual",
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: process.env.PREVIEW_URL ?? "http://localhost:5173",
    viewport: { width: 1324, height: 915 },
    launchOptions: process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : undefined,
  },
  webServer: process.env.PREVIEW_URL
    ? undefined
    : {
        command: "bun run dev",
        url: "http://localhost:5173",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});