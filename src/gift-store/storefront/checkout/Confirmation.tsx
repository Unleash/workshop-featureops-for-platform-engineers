import { useEffect, useState } from 'react';
import type { Order } from '@gift-store/commerce';
import { fetchOrder } from '../support/api';
import { formatMoney } from '../support/format';

const STATE_COPY: Record<Order['state'], { title: string; tone: string }> = {
  paid: { title: '🎉 Payment complete', tone: 'text-green-600' },
  failed: { title: 'Payment cancelled', tone: 'text-red-600' },
  pending: { title: 'Payment pending…', tone: 'text-slate-500' },
};

export const Confirmation = ({ orderId }: { orderId: string }) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchOrder(orderId)
      .then((result) => {
        if (active) setOrder(result);
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : 'Could not load order');
      });
    return () => {
      active = false;
    };
  }, [orderId]);

  return (
    <div className="mx-auto max-w-2xl p-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        {error !== null && <p className="text-red-600">{error}</p>}
        {order === null && error === null && <p className="text-slate-500">Loading order…</p>}
        {order !== null && (
          <>
            <h2 className={`text-2xl font-extrabold ${STATE_COPY[order.state].tone}`}>
              {STATE_COPY[order.state].title}
            </h2>
            <p className="mt-2 text-slate-500">Order {order.id}</p>
            {(() => {
              // The development environment is a SANDBOX — it never moves real money, so the
              // provider charges $0.00 there. We key the sandbox treatment on the environment
              // itself (NOT on charged ≠ requested): a real provider can legitimately charge a
              // different amount — partial capture, insufficient funds — and that is not a sandbox.
              const sandbox = order.environment === 'development';
              return (
                <>
                  <p className="mt-4 text-3xl font-bold tabular-nums">
                    {formatMoney(order.amountCharged)}
                  </p>
                  {sandbox && (
                    <p className="mt-1 text-lg font-semibold tabular-nums text-slate-400 line-through">
                      {formatMoney(order.breakdown.total)}
                    </p>
                  )}
                  {sandbox && (
                    <p className="mx-auto mt-3 max-w-md text-sm text-slate-500">
                      You’re in the <span className="font-semibold">{order.environment}</span>{' '}
                      environment — a sandbox that never moves real money, so the charge is{' '}
                      <span className="font-semibold">{formatMoney(order.amountCharged)}</span>. The
                      struck-through amount is what production would have charged.
                    </p>
                  )}
                </>
              );
            })()}
          </>
        )}
        <a
          href="/?fresh=1"
          className="mt-8 inline-block rounded-xl bg-brand px-5 py-2.5 font-bold text-white transition hover:bg-brand-deep"
        >
          Back to the store
        </a>
      </section>
    </div>
  );
};
