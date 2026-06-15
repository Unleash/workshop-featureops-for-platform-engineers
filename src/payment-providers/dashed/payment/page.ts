import type { Payment } from './store';

const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (c) => ENTITIES[c] ?? c);

const formatCents = (cents: number, currency: string): string =>
  `$${(cents / 100).toFixed(2)} ${currency}`;

/** The amount we actually charge (sandbox environments are charged $0.00). */
const formatCharged = (payment: Payment): string =>
  formatCents(payment.amountChargedCents, payment.currency);

/** The amount the merchant requested — shown struck through when it differs from the charge. */
const formatRequested = (payment: Payment): string =>
  formatCents(payment.amountCents, payment.currency);

/** A sandbox is keyed on the environment (development), NOT on charged ≠ requested — a real
 *  charge can differ from the request (partial capture, insufficient funds) yet not be a sandbox. */
const isSandbox = (payment: Payment): boolean => payment.environment === 'development';

/**
 * The Dashed-hosted checkout page. A deliberately modern, stylish gateway — a
 * vivid indigo→coral gradient backdrop with a single floating glass card, system
 * fonts and a biometric "scan your fingerprint to pay" affordance — so it feels
 * like a slick, contemporary system, distinct from both the calm merchant app
 * that redirected the shopper here and the older PayBro gateway next door.
 */
export const renderPaymentPage = (
  payment: Payment,
  logoSvg: string,
  fingerprintSvg: string,
): string => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Dashed &mdash; Secure payment</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <style>
    :root { --ink: #181a2e; --muted: #6b7090; }
    * { box-sizing: border-box; }
    body {
      margin: 0; min-height: 100vh;
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 42%, #fb7185 100%);
      display: flex; align-items: center; justify-content: center; padding: 48px 16px;
    }
    .card {
      width: 100%; max-width: 440px; border-radius: 24px; padding: 36px 34px 30px; color: var(--ink);
      background: rgba(255, 255, 255, 0.92);
      border: 1px solid rgba(255, 255, 255, 0.6);
      box-shadow: 0 40px 90px -25px rgba(31, 16, 80, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(10px);
    }
    .brandrow { display: flex; align-items: center; justify-content: space-between; margin-bottom: 30px; }
    .wordmark { display: flex; align-items: center; gap: 11px; font-weight: 750; font-size: 21px; letter-spacing: -0.02em; }
    .glyph { width: 30px; height: 30px; display: block; }
    .glyph svg { display: block; width: 30px; height: 30px; }
    .env {
      font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
      color: #6d28d9; background: #f3eeff; border-radius: 999px; padding: 4px 11px;
    }
    .label { font-size: 13px; color: var(--muted); margin: 0 0 2px; }
    .amount { font-size: 44px; font-weight: 760; letter-spacing: -0.03em; margin: 0 0 10px; }
    .amount span { font-size: 18px; color: var(--muted); font-weight: 600; }
    .requested { font-size: 14px; color: var(--muted); text-decoration: line-through; margin: 0 0 8px; }
    .sandbox-note {
      font-size: 12px; color: #6d28d9; background: #f3eeff; border: 1px solid #e3d9ff;
      border-radius: 12px; padding: 9px 12px; margin: 0 0 18px;
    }
    .fp-wrap { display: flex; flex-direction: column; align-items: center; margin: 18px 0 24px; }
    .fp-ring {
      width: 120px; height: 120px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
      background: radial-gradient(circle at 50% 45%, rgba(124, 58, 237, 0.16), rgba(251, 113, 133, 0.12) 60%, transparent 72%);
      border: 1px solid rgba(124, 58, 237, 0.18);
    }
    .fp { width: 60px; height: 60px; color: #6d28d9; }
    .fp-hint { font-size: 13px; color: var(--muted); margin-top: 14px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; margin: 2px 0 24px; }
    td { padding: 11px 2px; border-bottom: 1px solid rgba(24, 26, 46, 0.08); }
    td.k { color: var(--muted); }
    td.v { text-align: right; color: #252a4a; font-weight: 550; }
    .actions form { margin: 0; }
    .pay {
      width: 100%; border: 0; cursor: pointer; border-radius: 13px; padding: 16px;
      font-family: inherit; font-size: 15px; font-weight: 700; color: #fff;
      background: linear-gradient(90deg, #4f46e5, #fb7185);
      box-shadow: 0 14px 30px -10px rgba(124, 58, 237, 0.6);
    }
    .cancel {
      display: block; width: 100%; text-align: center; margin-top: 14px; background: none; border: 0;
      font-family: inherit; color: var(--muted); font-size: 13px; cursor: pointer;
    }
    .foot { text-align: center; color: rgba(24, 26, 46, 0.45); font-size: 11px; margin-top: 22px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brandrow">
      <div class="wordmark"><span class="glyph">${logoSvg}</span>Dashed</div>
      <span class="env">${escapeHtml(payment.environment)}</span>
    </div>

    <p class="label">You're paying</p>
    <div class="amount">${escapeHtml(formatCharged(payment))}</div>
    ${
      isSandbox(payment)
        ? `<p class="requested">${escapeHtml(formatRequested(payment))}</p>
    <p class="sandbox-note">Sandbox / test environment (${escapeHtml(
      payment.environment,
    )}) — no real charge. You would have paid ${escapeHtml(formatRequested(payment))}.</p>`
        : ''
    }

    <div class="fp-wrap">
      <div class="fp-ring">${fingerprintSvg}</div>
      <div class="fp-hint">Scan your fingerprint to pay</div>
    </div>

    <table>
      <tr><td class="k">Merchant memo</td><td class="v">${escapeHtml(payment.description)}</td></tr>
      <tr><td class="k">Order reference</td><td class="v">${escapeHtml(payment.reference)}</td></tr>
      <tr><td class="k">Dashed payment id</td><td class="v">${escapeHtml(payment.paymentId)}</td></tr>
    </table>

    <div class="actions">
      <form method="POST" action="/pay/${escapeHtml(payment.paymentId)}/confirm?decision=pay">
        <button class="pay" type="submit">Pay ${escapeHtml(formatCharged(payment))}</button>
      </form>
      <form method="POST" action="/pay/${escapeHtml(payment.paymentId)}/confirm?decision=decline">
        <button class="cancel" type="submit">Cancel and return to merchant</button>
      </form>
    </div>

    <div class="foot">Dashed · pay in a flash</div>
  </div>
</body>
</html>`;
