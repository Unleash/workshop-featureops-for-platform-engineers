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
 * The PayBro-hosted checkout page. Keeps a restrained late-90s online-payment
 * look — plain system fonts, a light grey shell, a simple bordered panel and a
 * static header bar — so it still feels like a different, older system than the
 * calm modern merchant app that redirected the shopper here. One lone <marquee>
 * scrolls under the header for period flavour; that single nod aside, it stays
 * clear of the blinking text and neon pile-on of the early web.
 */
export const renderPaymentPage = (payment: Payment, logoSvg: string): string => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>PayBro&#8482; Secure Payments</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <style>
    body {
      margin: 0;
      font-family: Verdana, Arial, Helvetica, sans-serif;
      color: #333333;
      background: #e8e8e8;
    }
    .topbar {
      background: #1f3a5f; color: #ffffff; padding: 8px 0;
      border-bottom: 2px solid #16293f; text-align: center; font-size: 13px;
    }
    .ticker {
      background: #fffbe6; color: #8a6d3b; border-bottom: 1px solid #e6d9a8;
      font-size: 12px; padding: 4px 0; letter-spacing: 0.02em;
    }
    .shell { max-width: 560px; margin: 28px auto; padding: 0 12px; }
    .panel {
      background: #ffffff; border: 1px solid #b8b8b8; padding: 20px; margin: 16px 0;
    }
    .brand { text-align: center; }
    .brand .logo { display: block; max-width: 200px; margin: 0 auto; }
    .brand .logo svg { display: block; width: 100%; height: auto; }
    .brand h1 { font-size: 16px; color: #1f3a5f; margin: 10px 0 0; }
    h2 { font-size: 15px; color: #1f3a5f; margin-top: 0; }
    .amount { font-size: 26px; font-weight: bold; color: #1f3a5f; margin: 6px 0 4px; }
    .requested {
      font-size: 14px; color: #888; text-decoration: line-through; margin: 0 0 6px;
    }
    .sandbox-note {
      font-size: 12px; color: #8a6d3b; background: #fcf8e3; border: 1px solid #faebcc;
      padding: 6px 9px; margin: 0 0 14px;
    }
    .env-badge {
      display: inline-block; font-size: 11px; font-weight: bold; letter-spacing: 0.04em;
      text-transform: uppercase; padding: 2px 8px; border: 1px solid #b8b8b8; color: #555;
      background: #f4f4f4; margin-top: 6px;
    }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    td { border: 1px solid #d8d8d8; padding: 7px 9px; text-align: left; }
    td.k { background: #f4f4f4; color: #555; width: 42%; }
    .actions { margin-top: 18px; }
    form { display: inline; }
    button {
      font-family: inherit; font-size: 14px; cursor: pointer;
      padding: 8px 18px; margin: 4px 6px 0 0; border: 1px solid #888;
      background: #ececec;
    }
    .pay { background: #2f6f3e; color: #ffffff; border-color: #245730; font-weight: bold; }
    .footer { color: #777; font-size: 11px; text-align: center; margin: 18px 0; }
    a { color: #1f3a5f; }
  </style>
</head>
<body>
  <div class="topbar">PayBro&#8482; &mdash; secure payments since 1998</div>
  <marquee class="ticker" scrollamount="5" behavior="scroll" direction="left">
    &#9733; 128-bit SSL secured &#9733; PayBro&#8482; &mdash; your payment buddy since 1998
    &#9733; Best viewed at 800&#215;600 &#9733; No cookies, just commerce &#9733;
  </marquee>

  <div class="shell">
    <div class="panel brand">
      <div class="logo">${logoSvg}</div>
      <h1>Secure payment</h1>
      <div class="env-badge">${escapeHtml(payment.environment)}</div>
    </div>

    <div class="panel">
      <h2>You are paying</h2>
      <div class="amount">${escapeHtml(formatCharged(payment))}</div>
      ${
        isSandbox(payment)
          ? `<p class="requested">${escapeHtml(formatRequested(payment))}</p>
      <p class="sandbox-note">Sandbox / test environment (${escapeHtml(
        payment.environment,
      )}) — no real charge. You would have paid ${escapeHtml(formatRequested(payment))}.</p>`
          : ''
      }
      <table>
        <tr><td class="k">Merchant memo</td><td>${escapeHtml(payment.description)}</td></tr>
        <tr><td class="k">Order reference</td><td>${escapeHtml(payment.reference)}</td></tr>
        <tr><td class="k">PayBro payment id</td><td>${escapeHtml(payment.paymentId)}</td></tr>
      </table>

      <div class="actions">
        <form method="POST" action="/pay/${escapeHtml(payment.paymentId)}/confirm?decision=pay">
          <button class="pay" type="submit">Pay now</button>
        </form>
        <form method="POST" action="/pay/${escapeHtml(payment.paymentId)}/confirm?decision=decline">
          <button class="decline" type="submit">Cancel</button>
        </form>
      </div>
    </div>

    <div class="footer">
      <p>&copy; 1998&ndash;2026 PayBro Inc. &mdash; your payment buddy on the web.</p>
    </div>
  </div>
</body>
</html>`;
