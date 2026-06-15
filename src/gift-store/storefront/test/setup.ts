import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom doesn't implement matchMedia; provide a minimal stub so Motion's and our
// own reduced-motion checks don't throw under test. We report reduced-motion as
// true so decorative confetti (which needs a real canvas) is skipped headlessly.
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

// Unmount React trees between tests (no vitest globals, so register explicitly).
afterEach(() => {
  cleanup();
});
