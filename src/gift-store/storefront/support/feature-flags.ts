/**
 * ★ The single place the browser talks to Unleash. The Developer Toolbar wraps the
 *   standard FlagProvider, so flags can be flipped live from the on-screen toolbar.
 *   To add a flag: add it to `FLAGS` and read it with a `useFlag`-based hook here.
 */
import { useEffect } from 'react';
import '@unleash/toolbar/toolbar.css';
import { UnleashToolbarProvider } from '@unleash/toolbar/react';
import {
  useFlag,
  useFlagsStatus,
  useUnleashContext,
  useVariant,
} from '@unleash/proxy-client-react';
import { parseEnvironment } from '@gift-store/commerce';
import { DEFAULT_REGION, getInitialEmail, getInitialUserId, SESSION_ID } from './identity';

// Each attendee runs against their OWN project (project-NNN), and both the flag names and the
// context-field names carry that project's number as a `pNNN_` prefix. The number is baked at
// build time via VITE_UNLEASH_PROJECT_NUMBER. There is no default: an absent value means "not
// configured yet", so the build fails loudly rather than baking in some other project's number.
const requireProjectNumber = (): string => {
  const value = (import.meta.env.VITE_UNLEASH_PROJECT_NUMBER as string | undefined)?.trim();
  if (!value) {
    throw new Error(
      'VITE_UNLEASH_PROJECT_NUMBER is required. Run `make workshop-configure` (it infers your ' +
        'project from your Unleash permissions), or set it manually to your assigned number.',
    );
  }
  return value;
};
const PROJECT_NUMBER = requireProjectNumber();
const flag = (suffix: string): string => `p${PROJECT_NUMBER}_${suffix}`;
/** Context property key for this attendee's project-scoped context field (e.g. pNNN_region). */
const contextKey = (name: string): string => `p${PROJECT_NUMBER}_${name}`;

export const FLAGS = {
  /** When ON, the payment section shows a promo-code field. */
  promoCode: flag('rl_checkout-page_payment-section_promo-code'),
  /** When ON, the API returns product image URLs. */
  productImages: flag('rl_checkout-page_basket-preview_product-images'),
  /** Kill switch: when ON, hides the header link to the real Unleash store. */
  storeLinkKill: flag('kx_checkout-page_headline_link-to-real-unleash-store'),
  /** Experiment flag as a variant: nudges shoppers toward the free-shipping goal. */
  freeShippingNudge: flag('ex_v_checkout-page_payment-section_free-shipping-nudge'),
} as const;

export const unleashConfig = {
  // Cloud Unleash Frontend API — set VITE_UNLEASH_URL / VITE_UNLEASH_CLIENT_KEY in .env.
  url: import.meta.env.VITE_UNLEASH_URL ?? '',
  clientKey: import.meta.env.VITE_UNLEASH_CLIENT_KEY ?? '',
  // App identity is a dash-lower-case slug (VITE_APP_NAME), distinct from the human display
  // title (VITE_TITLE); mirrors the backend's APP_NAME.
  appName: import.meta.env.VITE_APP_NAME ?? 'gift-store-storefront',
  // The client key (token) is what actually scopes evaluation to an environment; this
  // declares it for the SDK/Toolbar so it reads e.g. "development" instead of "default".
  // Driven by VITE_NODE_ENV so a DEV and a PROD instance can run side by side, each
  // built/started with its own environment + client key (see the ribbon + orchestration).
  environment: parseEnvironment(import.meta.env.VITE_NODE_ENV),
  refreshInterval: 5,
  // Seed the SDK context so the very first flag evaluation is already bucketed by the
  // persisted shopper. Runtime changes (e.g. regenerating the userId) flow via
  // `useUnleashIdentity` below.
  context: {
    userId: getInitialUserId(),
    sessionId: SESSION_ID,
    properties: {
      [contextKey('region')]: DEFAULT_REGION,
      [contextKey('email')]: getInitialEmail(),
    },
  },
};

// Hidden by default; flip VITE_UNLEASH_TOOLBAR_ENABLED=true to show it on load. Either way it can be
// revealed live from the browser console via `window.unleashToolbar.show()` (see main.tsx). When
// disabled we also hide the toolbar's floating launcher icon via a body class (see index.css) — on its
// own, `initiallyVisible:false` only closes the panel and still shows that launcher.
export const toolbarEnabled = import.meta.env.VITE_UNLEASH_TOOLBAR_ENABLED === 'true';

export const toolbarOptions = {
  storageMode: 'local',
  position: 'bottom-left',
  // Note: `storageMode: 'local'` means a persisted choice from a previous visit wins over this.
  initiallyVisible: toolbarEnabled,
} as const;

export { UnleashToolbarProvider };

/** Plain (Unleash-free) identity the UI passes in; mapped to an SDK context here. */
export interface UnleashIdentity {
  userId: string;
  sessionId: string;
  region: string;
  email: string;
}

/**
 * Keeps the live Unleash context in sync with the UI identity (e.g. after the shopper
 * edits or regenerates their userId, or flips the email domain, in the DevTool). Confines
 * Unleash's context shape to this adapter so the UI never imports SDK types.
 */
export const useUnleashIdentity = ({ userId, sessionId, region, email }: UnleashIdentity): void => {
  const updateContext = useUnleashContext();
  useEffect(() => {
    void updateContext({
      userId,
      sessionId,
      properties: { [contextKey('region')]: region, [contextKey('email')]: email },
    });
  }, [updateContext, userId, sessionId, region, email]);
};

export const usePromoCodeFlag = (): boolean => useFlag(FLAGS.promoCode);

/**
 * Gates RENDERING of the basket thumbnails on the FRONT-END so the Unleash Toolbar mounts/unmounts
 * them live (driving the animation). The image URLs themselves come from the back end's /catalog,
 * which evaluates the same flag server-side — product-images is a both-layers flag (Layer tag:
 * BackEnd+FrontEnd).
 */
export const useProductImagesFlag = (): boolean => useFlag(FLAGS.productImages);

/**
 * Kill switch: a flag that DISABLES the feature when enabled. The store link shows
 * only while the kill switch is OFF, so we invert the raw flag value here.
 *
 * Gated on `flagsReady` so we don't show the link on the pre-fetch default (an unknown
 * flag reads as `false`, which would invert to "show"); without this the link springs in
 * and then animates straight back out once the real kill-switch value arrives.
 */
export const useRealStoreLinkFlag = (): boolean => {
  const { flagsReady } = useFlagsStatus();
  const killed = useFlag(FLAGS.storeLinkKill);
  return flagsReady && !killed;
};

export interface FreeShippingNudge {
  /** Whether the nudge flag is on. */
  enabled: boolean;
  /** Percent (0–100) of the free-shipping goal at which the nudge starts showing. */
  startPercent: number;
}

/**
 * The free-shipping nudge is a variant flag: the variant's string payload carries a
 * 0–100 percentage of the free-shipping goal at which the prompt begins. Defaults to 0
 * ("always") when no variant payload is present — e.g. when flipped on via the toolbar
 * before the server-side variants are provisioned.
 */
export const useFreeShippingNudge = (): FreeShippingNudge => {
  const enabled = useFlag(FLAGS.freeShippingNudge);
  const variant = useVariant(FLAGS.freeShippingNudge);
  const parsed = Number(variant.payload?.value);
  const startPercent = Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : 0;
  return { enabled, startPercent };
};
