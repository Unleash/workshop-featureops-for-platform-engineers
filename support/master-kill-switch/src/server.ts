/**
 * Tiny webpage backend for the master kill switch: serves the button page and exposes POST /fire,
 * which fires the signal server-side. The signal token stays here — it never reaches the browser.
 *
 *   pnpm --filter master-kill-switch web   (then open http://localhost:8500)
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import { fireMasterKillSwitch } from './send';

const PORT = Number(process.env.MASTER_KILL_SWITCH_PORT ?? '8500');
const PAGE = path.join(path.dirname(fileURLToPath(import.meta.url)), '../public/index.html');

const app = Fastify({ logger: false });

app.get('/', (_request, reply) => {
  reply.type('text/html').send(fs.readFileSync(PAGE, 'utf8'));
});

app.post('/fire', async (request, reply) => {
  const reason =
    typeof (request.body as { reason?: unknown } | undefined)?.reason === 'string'
      ? (request.body as { reason: string }).reason
      : 'master kill switch (web button)';
  try {
    const result = await fireMasterKillSwitch(reason);
    reply.code(result.ok ? 200 : 502);
    return result;
  } catch (error: unknown) {
    reply.code(500);
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
});

app
  .listen({ port: PORT, host: '0.0.0.0' })
  .then(() => {
    console.log(`Master kill switch console → http://localhost:${PORT.toString()}`);
  })
  .catch((error: unknown) => {
    console.error('Failed to start the master kill switch console:', error);
    process.exit(1);
  });
