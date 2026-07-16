import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: 'e2e',
  webServer: {
    command: 'pnpm db:ensure && pnpm dev',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: true,
    timeout: 120000,
  },
  use: { baseURL: 'http://127.0.0.1:3000' },
});
