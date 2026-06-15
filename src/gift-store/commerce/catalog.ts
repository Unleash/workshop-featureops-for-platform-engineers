/**
 * Catalog — the merchant's source of truth for products & prices.
 * Unofficial FeatureOps Gift — inspired by shop.getunleash.io.
 */

import { money, type Money } from './money';

export interface Product {
  readonly id: string;
  readonly name: string;
  readonly unitPrice: Money;
  /**
   * Image URL for the basket thumbnail. Populated by the catalog endpoint ONLY when the
   * `product-images` flag is enabled server-side — the back end is the source of truth for
   * whether (and which) images are shown; the browser merely renders what it receives.
   */
  readonly imageUrl?: string;
}

export const CATALOG: readonly Product[] = [
  { id: 'badass-devs-tee', name: 'Badass Devs T-Shirt', unitPrice: money(1900) },
  {
    id: 'create-with-freedom-tee',
    name: 'Create with Freedom Tri-Blend Tee',
    unitPrice: money(2200),
  },
  { id: 'featureops-hoodie', name: 'FeatureOps Hoodie', unitPrice: money(4800) },
  { id: 'flag-sticker-pack', name: 'Feature Flag Sticker Pack', unitPrice: money(600) },
  { id: 'eco-tote', name: 'Eco Tote Bag', unitPrice: money(1400) },
  // FeatureOps Summit drop — see shop.getunleash.io.
  {
    id: 'featureops-summit-hoodie-dark',
    name: 'FeatureOps Summit Hoodie (Dark)',
    unitPrice: money(2500),
  },
  {
    id: 'featureops-summit-hoodie-light',
    name: 'FeatureOps Summit Hoodie (Light)',
    unitPrice: money(2500),
  },
  {
    id: 'featureops-summit-polo-dark',
    name: 'FeatureOps Summit Polo (Dark)',
    unitPrice: money(2500),
  },
  {
    id: 'featureops-summit-polo-light',
    name: 'FeatureOps Summit Polo (Light)',
    unitPrice: money(2500),
  },
];

export const getProduct = (id: string): Product | undefined => CATALOG.find((p) => p.id === id);

/**
 * Product imagery, keyed by product id — the single source of truth for both tiers. The
 * `product-images` flag is evaluated on BOTH layers: the web app renders thumbnails from this
 * map gated by the flag (so the Unleash Toolbar flips them live), and the catalog API attaches
 * these URLs via `catalogWithImages()` only when the flag is enabled server-side. Files are
 * served same-origin by the web app from `public/products/`, so these relative paths resolve
 * against the web origin regardless of which tier emits them.
 */
export const PRODUCT_IMAGES: Record<string, string> = {
  'badass-devs-tee': '/products/badass-devs-tee.jpg',
  'create-with-freedom-tee': '/products/create-with-freedom-tee.jpg',
  'featureops-hoodie': '/products/featureops-hoodie.jpg',
  'flag-sticker-pack': '/products/flag-sticker-pack.svg',
  'eco-tote': '/products/eco-tote.svg',
  'featureops-summit-hoodie-dark': '/products/featureops-summit-hoodie-dark.jpg',
  'featureops-summit-hoodie-light': '/products/featureops-summit-hoodie-light.jpg',
  'featureops-summit-polo-dark': '/products/featureops-summit-polo-dark.jpg',
  'featureops-summit-polo-light': '/products/featureops-summit-polo-light.jpg',
};

/** The catalog with image URLs attached — what the API returns when product-images is ON. */
export const catalogWithImages = (): Product[] =>
  CATALOG.map((p) => ({ ...p, imageUrl: PRODUCT_IMAGES[p.id] }));
