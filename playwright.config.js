import { defineConfig } from "@playwright/test";

const port = Number.parseInt(process.env.PORT ?? "4173", 10);
const baseURL = process.env.BASE_URL ?? `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    browserName: "chromium",
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  webServer: {
    command: `npx http-server . -p ${port} -c-1 --silent`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  reporter: [["list"]],
});
