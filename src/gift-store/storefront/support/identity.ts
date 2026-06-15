/**
 * Thin UI-domain identity for the (guest) shopper — deliberately free of any Unleash
 * types so the SDK never leaks into the UI. The Unleash adapter (`unleash.ts`) maps these
 * plain values into an SDK context; the checkout sends them on to the API.
 *
 * - `userId`  — a human-typeable guest "visitor id" (e.g. `swift-otter-2481`), persisted in
 *               localStorage so it survives refreshes. Editable/regenerable in the DevTool.
 * - `SESSION_ID` — a fresh UUID per page load (not persisted); shown in the Unleash Toolbar.
 * - region    — pinned to `AMER` here; the full legal set lives in Terraform and the Toolbar
 *               can override it live.
 */
import { useCallback, useState } from 'react';

export interface UserProfile {
  userId: string;
}

/** Region context values — mirrors the Unleash context field's legal values (Terraform). */
export const REGIONS = ['AMER', 'APAC', 'EEA', 'EU', 'US'] as const;
export type Region = (typeof REGIONS)[number];

/** The region we pin the demo to; the Unleash Toolbar can override it for experiments. */
export const DEFAULT_REGION: Region = 'US';

/**
 * Email domains the DevTool cycles through. The front-part (local-part) is editable; the
 * button rotates the domain to flip the shopper between an external (`@example.org`) and an
 * internal (`@getunleash.io`) identity — the latter matches the `internal-users` segment.
 */
export const EMAIL_DOMAINS = ['@example.org', '@getunleash.io'] as const;
export type EmailDomain = (typeof EMAIL_DOMAINS)[number];

const ADJECTIVES = [
  'swift',
  'brave',
  'calm',
  'bright',
  'clever',
  'eager',
  'gentle',
  'jolly',
  'keen',
  'lively',
  'merry',
  'nimble',
  'proud',
  'quiet',
  'sunny',
  'witty',
];

const ANIMALS = [
  'otter',
  'lemur',
  'falcon',
  'panda',
  'koala',
  'tiger',
  'heron',
  'badger',
  'gecko',
  'puffin',
  'walrus',
  'marmot',
  'narwhal',
  'ocelot',
  'raven',
  'bison',
];

const pick = <T>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)] as T;

/** e.g. `swift-otter-2481` — easy to read, type, and reasonably unique. */
export const generateUserId = (): string => {
  const suffix = 1000 + Math.floor(Math.random() * 9000);
  return `${pick(ADJECTIVES)}-${pick(ANIMALS)}-${suffix.toString()}`;
};

const STORAGE_KEY = 'cff.userId';
const EMAIL_LOCAL_KEY = 'cff.emailLocal';
const EMAIL_DOMAIN_KEY = 'cff.emailDomain';

const readStored = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const saveStored = (key: string, value: string): void => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* localStorage unavailable (private mode / SSR / tests) — keep the in-memory value */
  }
};

export const saveUserId = (userId: string): void => {
  saveStored(STORAGE_KEY, userId);
};

/** Read the persisted userId, generating + persisting one on first visit. */
export const getInitialUserId = (): string => {
  const stored = readStored(STORAGE_KEY);
  if (stored) return stored;
  const fresh = generateUserId();
  saveUserId(fresh);
  return fresh;
};

/** The email local-part defaults to the userId on first visit, then is edited independently. */
export const getInitialEmailLocal = (): string => readStored(EMAIL_LOCAL_KEY) ?? getInitialUserId();

const isEmailDomain = (value: string | null): value is EmailDomain =>
  value !== null && (EMAIL_DOMAINS as readonly string[]).includes(value);

export const getInitialEmailDomain = (): EmailDomain => {
  const stored = readStored(EMAIL_DOMAIN_KEY);
  return isEmailDomain(stored) ? stored : EMAIL_DOMAINS[0];
};

/** Full `local@domain` used to seed the Unleash SDK context before React mounts. */
export const getInitialEmail = (): string => `${getInitialEmailLocal()}${getInitialEmailDomain()}`;

/** A fresh session id per page load — intentionally NOT persisted (changes on refresh). */
export const SESSION_ID = crypto.randomUUID();

export interface UseUserProfile {
  userId: string;
  setUserId: (value: string) => void;
  regenerate: () => void;
  /** Editable front-part of the email (before the @). */
  emailLocal: string;
  setEmailLocal: (value: string) => void;
  /** Current domain; cycle it to flip external ↔ internal. */
  emailDomain: EmailDomain;
  cycleEmailDomain: () => void;
  /** Full `local@domain`, sent to Unleash and the API. */
  email: string;
}

/**
 * Owns the shopper's identity: userId (editable/regenerable) plus an email whose local-part
 * is editable and whose domain cycles between external/internal. All three persist to
 * localStorage so the chosen identity survives refreshes.
 */
export const useUserProfile = (): UseUserProfile => {
  const [userId, setUserIdState] = useState<string>(getInitialUserId);
  const [emailLocal, setEmailLocalState] = useState<string>(getInitialEmailLocal);
  const [emailDomain, setEmailDomainState] = useState<EmailDomain>(getInitialEmailDomain);

  const setUserId = useCallback((value: string) => {
    setUserIdState(value);
    saveUserId(value);
  }, []);

  const regenerate = useCallback(() => {
    setUserId(generateUserId());
  }, [setUserId]);

  const setEmailLocal = useCallback((value: string) => {
    setEmailLocalState(value);
    saveStored(EMAIL_LOCAL_KEY, value);
  }, []);

  const cycleEmailDomain = useCallback(() => {
    setEmailDomainState((prev) => {
      const nextIndex = (EMAIL_DOMAINS.indexOf(prev) + 1) % EMAIL_DOMAINS.length;
      // Index is always in range; fall back to the first domain to satisfy the type checker.
      const next = EMAIL_DOMAINS[nextIndex] ?? EMAIL_DOMAINS[0];
      saveStored(EMAIL_DOMAIN_KEY, next);
      return next;
    });
  }, []);

  const email = `${emailLocal}${emailDomain}`;

  return {
    userId,
    setUserId,
    regenerate,
    emailLocal,
    setEmailLocal,
    emailDomain,
    cycleEmailDomain,
    email,
  };
};
