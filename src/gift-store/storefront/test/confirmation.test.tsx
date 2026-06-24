import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { money, type Order } from '@gift-store/commerce';

// The confirmation screen fetches the order over the network; stub that seam.
vi.mock('../support/api', () => ({ fetchOrder: vi.fn() }));

import { fetchOrder } from '../support/api';
import { Confirmation } from '../checkout/Confirmation';

const order = (overrides: Partial<Order>): Order => ({
  id: 'order-1',
  state: 'paid',
  breakdown: {
    subtotal: money(4800),
    discount: money(0),
    shipping: money(0),
    total: money(4800),
  },
  provider: 'paybro',
  environment: 'production',
  amountCharged: money(4800),
  ...overrides,
});

describe('Confirmation — environment-aware charge', () => {
  beforeEach(() => {
    vi.mocked(fetchOrder).mockReset();
  });

  it('given production, when the order loads, then it shows the real total and no sandbox note', async () => {
    vi.mocked(fetchOrder).mockResolvedValue(order({}));

    render(<Confirmation orderId="order-1" />);

    expect(await screen.findByText('$48.00')).toBeInTheDocument();
    expect(screen.queryByText(/sandbox/i)).toBeNull();
  });

  it('given production where the charge differs from the request (e.g. partial capture), when it loads, then it is NOT shown as a sandbox', async () => {
    // A real provider can charge a different amount for legitimate reasons; that is not a
    // sandbox. Only the development environment is a sandbox.
    vi.mocked(fetchOrder).mockResolvedValue(order({ amountCharged: money(4500) }));

    render(<Confirmation orderId="order-1" />);

    expect(await screen.findByText('$45.00')).toBeInTheDocument();
    expect(screen.queryByText(/sandbox/i)).toBeNull();
    // The requested total is not rendered as a struck-through comparison in production.
    expect(screen.queryByText('$48.00')).toBeNull();
  });

  it('given development, when the order loads, then it shows the $0.00 charge with the requested total struck through + an explanation', async () => {
    vi.mocked(fetchOrder).mockResolvedValue(
      order({ environment: 'development', amountCharged: money(0) }),
    );

    render(<Confirmation orderId="order-1" />);

    // The charged headline is $0.00 (also echoed in the explanation copy); the requested
    // total is still shown, struck through, with the sandbox explanation.
    expect((await screen.findAllByText('$0.00')).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('$48.00')).toBeInTheDocument();
    expect(screen.getByText(/sandbox/i)).toBeInTheDocument();
  });
});

describe('Confirmation — provider errors', () => {
  beforeEach(() => {
    vi.mocked(fetchOrder).mockReset();
  });

  it('given a failed order with a provider error code, when it loads, then a friendly error and the raw code are shown', async () => {
    vi.mocked(fetchOrder).mockResolvedValue(
      order({ state: 'failed', errorCode: 'PAYMENT_CAPTURE_FAILED' }),
    );

    render(<Confirmation orderId="order-1" />);

    expect(await screen.findByText(/could not complete the payment/i)).toBeInTheDocument();
    expect(screen.getByText('PAYMENT_CAPTURE_FAILED')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('given an unknown error code, when it loads, then it falls back to showing the raw code', async () => {
    vi.mocked(fetchOrder).mockResolvedValue(order({ state: 'failed', errorCode: 'SOMETHING_NEW' }));

    render(<Confirmation orderId="order-1" />);

    expect(await screen.findByText(/Payment error: SOMETHING_NEW/i)).toBeInTheDocument();
  });

  it('given a failed order with no error code (a clean decline), when it loads, then no error block is shown', async () => {
    vi.mocked(fetchOrder).mockResolvedValue(order({ state: 'failed' }));

    render(<Confirmation orderId="order-1" />);

    // The title still renders, but there is no provider-error alert.
    expect(await screen.findByText('Payment cancelled')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
