import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { prefersReducedMotion } from '../support/motion';

export interface PromoFieldProps {
  promoCode: string;
  onPromoChange: (value: string) => void;
}

/**
 * The promo-code field, animated as it appears/disappears when the flag flips.
 * Pop-in/out via Motion (spring), plus a little confetti when it shows up.
 * (Technique ported from the docs/ motion-enter-animations example.)
 */
export const PromoField = ({ promoCode, onPromoChange }: PromoFieldProps) => {
  const reduce = prefersReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (reduce) return;
    // Fire after the next paint so the input has its final on-screen position,
    // then burst the confetti from the promo field itself (not the page centre).
    const raf = requestAnimationFrame(() => {
      try {
        const el = inputRef.current;
        const origin = el
          ? (() => {
              const r = el.getBoundingClientRect();
              return {
                x: (r.left + r.width / 2) / window.innerWidth,
                y: (r.top + r.height / 2) / window.innerHeight,
              };
            })()
          : { y: 0.4 };
        void confetti({
          particleCount: 40,
          spread: 55,
          startVelocity: 28,
          scalar: 0.7,
          origin,
        });
      } catch {
        /* canvas unavailable (e.g. tests) — confetti is purely decorative */
      }
    });
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [reduce]);

  return (
    <motion.div
      style={{ overflow: 'hidden' }}
      initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0, scale: 0.8 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, height: 'auto', scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0, scale: 0.8 }}
      transition={
        reduce
          ? { duration: 0.2 }
          : {
              // Keep the springy pop on scale, but collapse height/opacity on a
              // quick tween so the row doesn't leave an empty gap while it exits.
              scale: { type: 'spring', visualDuration: 0.4, bounce: 0.5 },
              height: { duration: 0.2 },
              opacity: { duration: 0.15 },
            }
      }
    >
      <label className="block">
        <span className="text-sm font-semibold text-slate-600">Promo code</span>
        <input
          ref={inputRef}
          aria-label="Promo code"
          value={promoCode}
          onChange={(event) => {
            onPromoChange(event.target.value);
          }}
          placeholder="Try SAVE10 or WELCOME15"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 uppercase outline-none focus:border-brand"
        />
      </label>
    </motion.div>
  );
};
