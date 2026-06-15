import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { prefersReducedMotion } from '../support/motion';
import { useRealStoreLinkFlag } from '../support/feature-flags';

const REAL_STORE_URL = 'https://shop.getunleash.io';
const DEFAULT_TAGLINE = 'Ship fast without breaking trust — now with merch.';

/**
 * Header tagline below the store name. Front-end only. While the
 * `kx_unleash-store-link` kill switch is OFF it swaps the tagline for a headline
 * pointing at the real Unleash store, springing in over the old line and firing
 * a little confetti to mark the reveal.
 */
const StoreLinkHeadline = () => {
  const reduce = prefersReducedMotion();
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (reduce) return;
    // Burst after the next paint, anchored to the headline rather than the page centre.
    const raf = requestAnimationFrame(() => {
      try {
        const el = ref.current;
        const origin = el
          ? (() => {
              const r = el.getBoundingClientRect();
              return {
                x: (r.left + r.width / 2) / window.innerWidth,
                y: (r.top + r.height / 2) / window.innerHeight,
              };
            })()
          : { y: 0.2 };
        void confetti({ particleCount: 60, spread: 70, startVelocity: 32, scalar: 0.8, origin });
      } catch {
        /* canvas unavailable (e.g. tests) — confetti is purely decorative */
      }
    });
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [reduce]);

  return (
    <motion.p
      ref={ref}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.95 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.95 }}
      transition={
        reduce ? { duration: 0.2 } : { type: 'spring', visualDuration: 0.4, bounce: 0.45 }
      }
      className="text-sm font-semibold text-brand"
    >
      🎉 Love the demo? Get the real merch at{' '}
      <a
        href={REAL_STORE_URL}
        target="_blank"
        rel="noreferrer"
        className="underline decoration-2 underline-offset-2 hover:text-brand-deep"
      >
        the official Unleash store →
      </a>
    </motion.p>
  );
};

export const StoreTagline = () => {
  const showStoreLink = useRealStoreLinkFlag();
  const reduce = prefersReducedMotion();

  // `mode="wait"` so the old line leaves before the new one springs in on top.
  return (
    <AnimatePresence mode="wait" initial={false}>
      {showStoreLink ? (
        <StoreLinkHeadline key="store-link" />
      ) : (
        <motion.p
          key="default"
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
          transition={{ duration: 0.2 }}
          className="text-sm text-slate-500"
        >
          {DEFAULT_TAGLINE}
        </motion.p>
      )}
    </AnimatePresence>
  );
};
