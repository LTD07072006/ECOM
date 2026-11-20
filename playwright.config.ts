import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  timeout: 75_000,
  expect: { timeout: 10_000 },
  use: {
    browserName: "chromium",
    launchOptions: {
      executablePath: process.env.E2E_CHROMIUM_PATH,
      args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
    },
  },
});
