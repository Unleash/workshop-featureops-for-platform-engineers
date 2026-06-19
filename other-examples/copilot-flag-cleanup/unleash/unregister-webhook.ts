/**
 * Removes the webhook integration created by `register-webhook.ts` (matched by ADDON_DESCRIPTION).
 * Mirror of register, so the example stays reversible. Run with `npm run unregister`.
 */
import { findExampleAddon, unleashApi } from './support';

const main = async (): Promise<void> => {
  const addon = await findExampleAddon();
  if (!addon) {
    console.log('[webhook] Not found — already removed.');
    return;
  }
  const { status } = await unleashApi(`/addons/${addon.id.toString()}`, { method: 'DELETE' });
  console.log(`[webhook] Removed (HTTP ${status.toString()}).`);
};

main().catch((err: unknown) => {
  console.error(err);
  process.exitCode = 1;
});
