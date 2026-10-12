import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '../tests/tests',
  timeout: 60000,
  workers: 1,
  use: {
    baseURL: process.env.BASE_URL || 'https://cms.teamzuna.in',
    headless: true,
    channel: 'chrome',
  },
});
