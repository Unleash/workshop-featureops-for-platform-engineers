import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { ShippingAddress } from '@gift-store/commerce';
import logoUrl from '../assets/logo.svg';
import sidebarToggleIcon from '../assets/sidebar-toggle.svg';
import { prefersReducedMotion } from '../support/motion';
import { useCart, type CartLine } from '../cart/useCart';
import { Checkout } from '../checkout/Checkout';
import { Confirmation } from '../checkout/Confirmation';
import { DevPanel } from '../devtools/DevPanel';
import { defaultShopper, pickRandomShopper } from '../devtools/shoppers';
import { StoreTagline } from './StoreTagline';
import { EnvRibbon } from './EnvRibbon';
import { activeEnvironment } from './env';
import { DEFAULT_REGION, SESSION_ID, useUserProfile } from '../support/identity';
import { fetchCatalog } from '../support/api';
import { useUnleashIdentity } from '../support/feature-flags';

const APP_TITLE = import.meta.env.VITE_TITLE ?? 'Unofficial FeatureOps Gift Store';

// The dev sidebar's width, in px. Used both for layout and as the negative left margin
// that flies it completely off the left edge when collapsed.
const DEV_PANEL_WIDTH = 340;
// The sidebar's INITIAL open state is steered by the environment (default enabled); a
// presenter can still collapse/reopen it live. Explicit 'false' starts it collapsed.
const DEV_TOOLS_INITIALLY_OPEN = import.meta.env.VITE_DEVTOOLS_ENABLED !== 'false';

export const App = () => {
  // One basket + shipping address, owned here and shared between the dev panel
  // (left) and the checkout (right). The checkout itself never sees the dev tooling.
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('order');
  // `?fresh=1` (used by the order confirmation's "Back to the store" link) starts
  // with an empty basket; a plain first visit keeps a seeded item for demo flavor.
  const startEmpty = params.has('fresh');
  const cart = useCart(startEmpty ? [] : [{ productId: 'badass-devs-tee', quantity: 1 }]);
  const [shipping, setShipping] = useState<ShippingAddress>(defaultShopper);
  // Whether the dev sidebar is expanded (slid in) or collapsed (flown off the left).
  const [devToolsOpen, setDevToolsOpen] = useState(DEV_TOOLS_INITIALLY_OPEN);
  // Skip the slide/fade for users (or tests) that ask for reduced motion.
  const reduceMotion = prefersReducedMotion();

  // Guest shopper identity (userId + email persisted; sessionId fresh per load; region pinned).
  const {
    userId,
    setUserId,
    regenerate,
    emailLocal,
    setEmailLocal,
    emailDomain,
    cycleEmailDomain,
    email,
  } = useUserProfile();
  const identity = { userId, sessionId: SESSION_ID, region: DEFAULT_REGION, email };
  // Push the identity into the Unleash SDK context (and keep it in sync on changes).
  useUnleashIdentity(identity);

  // Image URLs come from the back end, which includes them only when the product-images flag is
  // enabled SERVER-SIDE. Fetched on identity change (NOT on flag flips — the Basket gates rendering
  // on the front-end flag for instant Toolbar response, so refetching here is unnecessary).
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    void fetchCatalog({ userId, sessionId: SESSION_ID, region: DEFAULT_REGION, email })
      .then((catalog) => {
        if (cancelled) return;
        const urls: Record<string, string> = {};
        for (const product of catalog) {
          if (product.imageUrl) urls[product.id] = product.imageUrl;
        }
        setImageUrls(urls);
      })
      .catch(() => {
        if (!cancelled) setImageUrls({});
      });
    return () => {
      cancelled = true;
    };
  }, [userId, email]);

  // Mirror the corner ribbon's environment colour/label inside the sidebar headline.
  const env = activeEnvironment();

  // Dev panel action: fill the basket from a preset and rotate to a random shopper.
  const applyScenario = (lines: CartLine[]): void => {
    cart.applyPreset(lines);
    setShipping(pickRandomShopper());
  };

  return (
    <div className="flex min-h-screen">
      <EnvRibbon />

      {/* Reopen handle: only while collapsed. Deliberately low-contrast (gray on white) so it
          stays out of the way until you look for it; fades in/out to match the slide. */}
      <AnimatePresence>
        {!devToolsOpen && (
          <motion.button
            type="button"
            onClick={() => {
              setDevToolsOpen(true);
            }}
            aria-label="Show developer tools"
            title="Show developer tools"
            className="group fixed left-3 top-3 z-40 cursor-pointer rounded-lg border border-gray-200 bg-white p-2 shadow-sm transition"
            initial={{ opacity: reduceMotion ? 1 : 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: reduceMotion ? 1 : 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
          >
            <img
              src={sidebarToggleIcon}
              alt=""
              width={18}
              height={18}
              className="opacity-70 transition-opacity group-hover:opacity-100"
            />
          </motion.button>
        )}
      </AnimatePresence>

      <motion.aside
        className="sticky top-0 z-10 flex h-screen shrink-0 flex-col overflow-y-auto overflow-x-hidden bg-brand-ink p-6 text-white shadow-2xl"
        style={{ width: DEV_PANEL_WIDTH }}
        animate={{ marginLeft: devToolsOpen ? 0 : -DEV_PANEL_WIDTH }}
        transition={{ duration: reduceMotion ? 0 : 0.35, ease: 'easeInOut' }}
      >
        {/* Close handle: top-right of the panel, subtle but visible on the dark ink. */}
        <button
          type="button"
          onClick={() => {
            setDevToolsOpen(false);
          }}
          aria-label="Hide developer tools"
          title="Hide developer tools"
          className="absolute right-3 top-3 cursor-pointer rounded-md p-1 text-xl leading-none text-white/50 transition hover:text-white"
        >
          ×
        </button>
        <div className="flex items-center gap-3">
          <img src={logoUrl} alt="" className="h-10 w-10" />
          <div>
            <p className="font-extrabold leading-tight">FeatureOps</p>
            <p className="text-xs text-white/60">
              Demo Controls ·{' '}
              <span className={`font-bold uppercase tracking-wider ${env.text}`}>{env.label}</span>
            </p>
          </div>
        </div>
        <DevPanel
          onApplyPreset={applyScenario}
          onAddProduct={cart.addOne}
          userId={userId}
          onUserIdChange={setUserId}
          onRegenerateUserId={regenerate}
          emailLocal={emailLocal}
          emailDomain={emailDomain}
          email={email}
          onEmailLocalChange={setEmailLocal}
          onCycleEmailDomain={cycleEmailDomain}
        />
      </motion.aside>

      <main className="grow">
        <header className="border-b border-slate-200 bg-white px-8 py-3">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <img src={logoUrl} alt="" className="h-9 w-9" />
            <div>
              <h1 className="text-xl font-extrabold">{APP_TITLE}</h1>
              <StoreTagline />
            </div>
          </div>
        </header>

        {orderId !== null ? (
          <Confirmation orderId={orderId} />
        ) : (
          <Checkout
            cart={cart}
            shipping={shipping}
            onShippingChange={setShipping}
            identity={identity}
            imageUrls={imageUrls}
          />
        )}
      </main>
    </div>
  );
};
