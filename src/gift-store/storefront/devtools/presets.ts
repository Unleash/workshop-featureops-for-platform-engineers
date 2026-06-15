import type { CartLine } from '../cart/useCart';

export interface Preset {
  id: string;
  label: string;
  lines: CartLine[];
}

/** Predefined baskets so reviewers can jump to a scenario in one click. */
export const PRESETS: Preset[] = [
  { id: 'empty', label: 'Empty basket', lines: [] },
  { id: 'single', label: 'Single tee', lines: [{ productId: 'badass-devs-tee', quantity: 1 }] },
  {
    id: 'stickers-tote',
    label: 'Stickers & tote (under free-shipping)',
    lines: [
      { productId: 'flag-sticker-pack', quantity: 2 },
      { productId: 'eco-tote', quantity: 1 },
    ],
  },
  {
    id: 'loaded',
    label: 'Loaded cart (free shipping)',
    lines: [
      { productId: 'badass-devs-tee', quantity: 2 },
      { productId: 'featureops-hoodie', quantity: 1 },
      { productId: 'flag-sticker-pack', quantity: 3 },
    ],
  },
  {
    id: 'summit',
    label: 'FeatureOps Summit bundle',
    lines: [
      { productId: 'featureops-summit-hoodie-dark', quantity: 1 },
      { productId: 'featureops-summit-polo-light', quantity: 1 },
      { productId: 'flag-sticker-pack', quantity: 1 },
    ],
  },
  {
    id: 'mixed',
    label: 'Mixed mega-cart',
    lines: [
      { productId: 'create-with-freedom-tee', quantity: 1 },
      { productId: 'featureops-hoodie', quantity: 1 },
      { productId: 'featureops-summit-polo-dark', quantity: 2 },
      { productId: 'eco-tote', quantity: 1 },
      { productId: 'flag-sticker-pack', quantity: 2 },
    ],
  },
];
