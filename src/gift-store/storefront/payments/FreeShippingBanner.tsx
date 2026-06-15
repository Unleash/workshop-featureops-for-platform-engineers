import { motion } from 'motion/react';
import { money } from '@gift-store/commerce';
import { formatMoney } from '../support/format';
import { prefersReducedMotion } from '../support/motion';

export interface FreeShippingBannerProps {
  gapCents: number;
  goalCents: number;
}

/** Green banner + progress bar encouraging the shopper to reach the free-shipping goal. */
export const FreeShippingBanner = ({ gapCents, goalCents }: FreeShippingBannerProps) => {
  const reduce = prefersReducedMotion();
  const pct = Math.min(100, Math.round(((goalCents - gapCents) / goalCents) * 100));
  return (
    <motion.div
      style={{ overflow: 'hidden' }}
      initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, height: 'auto' }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-lg border border-green-200 bg-green-50 p-3"
    >
      <p className="text-sm font-semibold text-green-700">
        🚚 Add {formatMoney(money(gapCents))} more to unlock free shipping!
      </p>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-green-100">
        <motion.div
          className="h-full rounded-full bg-green-500"
          initial={false}
          animate={{ width: `${String(pct)}%` }}
          transition={
            reduce ? { duration: 0 } : { type: 'spring', visualDuration: 0.4, bounce: 0.2 }
          }
        />
      </div>
    </motion.div>
  );
};
