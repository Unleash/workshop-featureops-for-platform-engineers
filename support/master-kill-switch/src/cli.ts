/**
 * CLI for the master kill switch: `pnpm --filter master-kill-switch fire`. Fires the signal and
 * reports the outcome. Any extra args become the human-readable reason recorded with the signal.
 */
import { fireMasterKillSwitch } from './send';

const run = async (): Promise<void> => {
  const reason = process.argv.slice(2).join(' ').trim() || undefined;
  try {
    const { ok, status, body } = await fireMasterKillSwitch(reason);
    if (ok) {
      console.log(`✓ Master kill switch signal accepted (HTTP ${status.toString()}).`);
      console.log(
        '  Per-project actions fire in ~60s — the kill switch is now turned OFF in development and production.',
      );
    } else {
      console.error(`✗ Signal rejected (HTTP ${status.toString()}): ${body}`);
      process.exitCode = 1;
    }
  } catch (error: unknown) {
    console.error(
      '✗ Could not fire the master kill switch:',
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  }
};

void run();
