/** Basket modelling: the wire selection the browser sends and the resolved basket. */

import { money, type Money } from './money';
import { getProduct, type Product } from './catalog';

export interface BasketItem {
  readonly product: Product;
  readonly quantity: number;
}

export interface Basket {
  readonly items: readonly BasketItem[];
}

/** What the browser sends over the wire — product ids + quantities only. */
export interface BasketSelectionItem {
  readonly productId: string;
  readonly quantity: number;
}

export interface BasketSelection {
  readonly items: readonly BasketSelectionItem[];
}

/** Rebuild a full basket from a wire selection, dropping unknown/invalid items. */
export const buildBasket = (selection: BasketSelection): Basket => ({
  items: selection.items.flatMap((sel) => {
    const product = getProduct(sel.productId);
    if (!product || sel.quantity <= 0) return [];
    return [{ product, quantity: Math.floor(sel.quantity) }];
  }),
});

export const basketSubtotal = (basket: Basket): Money =>
  money(basket.items.reduce((sum, i) => sum + i.product.unitPrice.amountCents * i.quantity, 0));
