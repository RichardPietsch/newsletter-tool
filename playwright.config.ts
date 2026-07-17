import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  maxFailures: 0,
  reporter: 'list',
  webServer: {
    command: 'pnpm db:ensure && NEXT_PHASE=phase-production-build pnpm build && pnpm start',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    env: {
      SMTP_USER: 'playwright',
      SMTP_PASSWORD: 'playwright',
    },
  },
  use: { baseURL: 'http://127.0.0.1:3000' },
});
