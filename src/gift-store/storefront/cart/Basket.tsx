import { AnimatePresence, motion } from 'motion/react';
import { getProduct, money } from '@gift-store/commerce';
import { formatMoney } from '../support/format';
import { prefersReducedMotion } from '../support/motion';
import { useProductImagesFlag } from '../support/feature-flags';
import type { Cart } from './useCart';

/** Flag-gated thumbnail that slides/scales in and out as the flag flips. */
const ProductThumb = ({ src, alt }: { src: string; alt: string }) => {
  const reduce = prefersReducedMotion();
  return (
    <motion.img
      src={src}
      alt={alt}
      initial={reduce ? { opacity: 0 } : { opacity: 0, width: 0, scale: 0.8 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, width: 56, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, width: 0, scale: 0.8 }}
      transition={
        reduce
          ? { duration: 0.2 }
          : {
              scale: { type: 'spring', visualDuration: 0.35, bounce: 0.4 },
              width: { duration: 0.25 },
              opacity: { duration: 0.2 },
            }
      }
      className="h-14 shrink-0 rounded-lg border border-slate-200 bg-white object-cover"
    />
  );
};

export const Basket = ({
  cart,
  imageUrls,
}: {
  cart: Cart;
  /** Per-product image URLs the back end returned (present only when product-images is ON). */
  imageUrls: Record<string, string>;
}) => {
  // Gated on the FRONT-END so the Unleash Toolbar mounts/unmounts the thumbnail (and triggers the
  // animation) live. The URLs themselves come from the back end, which evaluates the same flag —
  // product-images is a both-layers flag.
  const showImages = useProductImagesFlag();

  if (cart.lines.length === 0) {
    return <p className="text-slate-500">Your basket is empty.</p>;
  }

  return (
    <ul className="divide-y divide-slate-200">
      {cart.lines.map((line) => {
        const product = getProduct(line.productId);
        if (!product) return null;
        const lineTotal = money(product.unitPrice.amountCents * line.quantity);
        const image = imageUrls[line.productId];

        return (
          <li key={line.productId} className="flex items-center justify-between gap-4 py-2">
            <div className="flex min-w-0 items-center gap-3">
              <AnimatePresence initial={false}>
                {showImages && image && <ProductThumb key="thumb" src={image} alt={product.name} />}
              </AnimatePresence>
              <div className="min-w-0">
                <p className="truncate font-semibold">{product.name}</p>
                <p className="text-sm text-slate-500">{formatMoney(product.unitPrice)} each</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-lg border border-slate-300">
                <button
                  type="button"
                  aria-label={`Decrease ${product.name}`}
                  className="px-3 py-1 text-lg leading-none text-slate-600 hover:text-brand"
                  onClick={() => {
                    cart.setQuantity(line.productId, line.quantity - 1);
                  }}
                >
                  −
                </button>
                <span className="w-8 text-center tabular-nums">{line.quantity}</span>
                <button
                  type="button"
                  aria-label={`Increase ${product.name}`}
                  className="px-3 py-1 text-lg leading-none text-slate-600 hover:text-brand"
                  onClick={() => {
                    cart.addOne(line.productId);
                  }}
                >
                  +
                </button>
              </div>
              <span className="w-20 text-right font-semibold tabular-nums">
                {formatMoney(lineTotal)}
              </span>
              <button
                type="button"
                aria-label={`Remove ${product.name}`}
                className="text-slate-400 transition hover:text-red-500"
                onClick={() => {
                  cart.removeLine(line.productId);
                }}
              >
                ✕
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
};
