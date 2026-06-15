import { randomUUID } from 'node:crypto';
import type { Environment } from '../support/environment';

export type PaymentStatus = 'created' | 'paid' | 'failed';

export interface Payment {
  paymentId: string;
  reference: string;
  /** What the merchant asked us to charge (the requested quote). */
  amountCents: number;
  /** What we actually charge — $0.00 in a sandbox (development) environment. */
  amountChargedCents: number;
  currency: string;
  description: string;
  returnUrl: string;
  webhookUrl: string;
  /** The merchant's originating environment (e.g. development | production). */
  environment: Environment;
  status: PaymentStatus;
  /** Unified error code set when a capture fails; carried to the merchant on the webhook. */
  errorCode?: string;
}

/** The merchant supplies everything except what Dashed derives (id, charged amount, status, code). */
export type NewPayment = Omit<Payment, 'paymentId' | 'amountChargedCents' | 'status' | 'errorCode'>;

const payments = new Map<string, Payment>();

// Dashed is the authority on what it charges: development is a sandbox, so no real
// money moves and the charged amount is zero. Every other environment is charged in full.
const chargedAmount = (input: NewPayment): number =>
  input.environment === 'development' ? 0 : input.amountCents;

export const createPayment = (input: NewPayment): Payment => {
  const payment: Payment = {
    paymentId: `pay_${randomUUID()}`,
    status: 'created',
    amountChargedCents: chargedAmount(input),
    ...input,
  };
  payments.set(payment.paymentId, payment);
  return payment;
};

export const getPayment = (id: string): Payment | undefined => payments.get(id);

export const setStatus = (id: string, status: PaymentStatus): void => {
  const payment = payments.get(id);
  if (payment) payment.status = status;
};
