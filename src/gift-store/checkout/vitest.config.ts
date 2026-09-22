import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // support/feature-flags.ts reads these at import time and refuses to start without a project.
    // Set here — not as a `VAR=value vitest run` prefix in package.json — because npm (and pnpm)
    // run package scripts through cmd.exe on Windows, which has no such syntax.
    env: {
      UNLEASH_PROJECT_ID: 'project-000',
      UNLEASH_FLAG_PREFIX: 'p000_',
    },
  },
});
