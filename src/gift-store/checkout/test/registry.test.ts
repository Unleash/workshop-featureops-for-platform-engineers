import { describe, it, expect } from 'vitest';
import { getPaymentProvider } from '../payments/router';

describe('payment provider factory', () => {
  it('given "paybro", when resolving, then it returns the PayBro strategy', () => {
    expect(getPaymentProvider('paybro').id).toBe('paybro');
  });

  it('given no id, when resolving, then it returns the default (PayBro)', () => {
    expect(getPaymentProvider().id).toBe('paybro');
  });

  it('given an unregistered id, when resolving, then it falls back to the default', () => {
    // Dashed is built but not registered yet (the workshop exercise), so it falls back.
    expect(getPaymentProvider('dashed').id).toBe('paybro');
  });
});
