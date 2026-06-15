import { useCallback, useState } from 'react';
import type { BasketSelection } from '@gift-store/commerce';

export interface CartLine {
  productId: string;
  quantity: number;
}

export interface Cart {
  lines: CartLine[];
  selection: BasketSelection;
  setQuantity: (productId: string, quantity: number) => void;
  addOne: (productId: string) => void;
  removeLine: (productId: string) => void;
  reset: () => void;
  applyPreset: (lines: CartLine[]) => void;
}

/** Local cart state, lifted to the app so the dev panel and checkout share it. */
export const useCart = (initial: CartLine[] = []): Cart => {
  const [lines, setLines] = useState<CartLine[]>(initial);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setLines((prev) =>
      prev
        .map((line) => (line.productId === productId ? { ...line, quantity } : line))
        .filter((line) => line.quantity > 0),
    );
  }, []);

  const addOne = useCallback((productId: string) => {
    setLines((prev) => {
      const existing = prev.find((line) => line.productId === productId);
      if (existing) {
        return prev.map((line) =>
          line.productId === productId ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [...prev, { productId, quantity: 1 }];
    });
  }, []);

  const removeLine = useCallback((productId: string) => {
    setLines((prev) => prev.filter((line) => line.productId !== productId));
  }, []);

  const reset = useCallback(() => {
    setLines([]);
  }, []);

  const applyPreset = useCallback((next: CartLine[]) => {
    setLines(next.map((line) => ({ ...line })));
  }, []);

  return {
    lines,
    selection: { items: lines },
    setQuantity,
    addOne,
    removeLine,
    reset,
    applyPreset,
  };
};
