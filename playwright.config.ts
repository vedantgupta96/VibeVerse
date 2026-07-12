import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 3107);
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: process.env.E2E_REUSE_SERVER === "1",
    timeout: 120_000,
    env: {
      DATABASE_URL:
        process.env.E2E_DATABASE_URL ??
        process.env.DATABASE_URL ??
        "postgres://vibeverse:vibeverse@127.0.0.1:5432/vibeverse",
      BETTER_AUTH_URL: baseURL,
      BETTER_AUTH_SECRET:
        process.env.BETTER_AUTH_SECRET ??
        "phase-11-e2e-only-deterministic-secret-32-characters",
      REDIS_URL: "",
    },
  },
});
