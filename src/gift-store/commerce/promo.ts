/** Promo codes the merchant honours. The backend is the source of truth. */

export interface PromoCode {
  readonly code: string;
  readonly percentOff: number;
}

export const KNOWN_PROMOS: readonly PromoCode[] = [
  { code: 'SAVE10', percentOff: 10 },
  { code: 'WELCOME15', percentOff: 15 },
];

export const resolvePromo = (code: string | undefined): PromoCode | null => {
  if (!code) return null;
  const normalized = code.trim().toUpperCase();
  return KNOWN_PROMOS.find((p) => p.code === normalized) ?? null;
};
