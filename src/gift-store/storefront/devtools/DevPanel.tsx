import { useState } from 'react';
import { CATALOG, PRODUCT_IMAGES } from '@gift-store/commerce';
import { PRESETS } from './presets';
import { formatMoney } from '../support/format';
import type { EmailDomain } from '../support/identity';
import type { CartLine } from '../cart/useCart';

export interface DevPanelProps {
  /** Fills the basket from a preset AND rotates the shopper (wired in App). */
  onApplyPreset: (lines: CartLine[]) => void;
  /** Adds a single unit of one product to the basket. */
  onAddProduct: (productId: string) => void;
  /** The guest shopper's userId (Unleash bucketing key). */
  userId: string;
  /** Edit the userId by hand. */
  onUserIdChange: (value: string) => void;
  /** Generate a fresh random userId. */
  onRegenerateUserId: () => void;
  /** Editable front-part of the email (before the @). */
  emailLocal: string;
  /** Current email domain (cycled by the button). */
  emailDomain: EmailDomain;
  /** Full `local@domain`, for the copy button. */
  email: string;
  /** Edit the email local-part by hand. */
  onEmailLocalChange: (value: string) => void;
  /** Cycle the domain external ↔ internal. */
  onCycleEmailDomain: () => void;
}

/** A copy button that flashes "Copied!" for 1.2s after writing `value` to the clipboard. */
const CopyButton = ({ value, title }: { value: string; title: string }) => {
  const [copied, setCopied] = useState(false);
  const copy = (): void => {
    void navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopied(true);
        setTimeout(() => {
          setCopied(false);
        }, 1200);
      })
      .catch(() => {
        /* clipboard unavailable — ignore */
      });
  };
  return (
    <button
      type="button"
      onClick={copy}
      title={title}
      className="cursor-pointer rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold transition hover:bg-white/20"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
};

type ShopperIdentityProps = Pick<
  DevPanelProps,
  | 'userId'
  | 'onUserIdChange'
  | 'onRegenerateUserId'
  | 'emailLocal'
  | 'emailDomain'
  | 'email'
  | 'onEmailLocalChange'
  | 'onCycleEmailDomain'
>;

/** Editable userId + email — the Unleash bucketing identity & targeting context for this browser. */
const ShopperIdentity = ({
  userId,
  onUserIdChange,
  onRegenerateUserId,
  emailLocal,
  emailDomain,
  email,
  onEmailLocalChange,
  onCycleEmailDomain,
}: ShopperIdentityProps) => (
  <section>
    <h2 className="text-xs font-bold uppercase tracking-widest text-white/50">Shopper identity</h2>
    <p className="mt-1 text-xs text-white/70">
      The <span className="font-semibold">userId</span> and{' '}
      <span className="font-semibold">email</span> sent to Unleash for flag bucketing and targeting.
    </p>
    <div className="mt-3 flex gap-2">
      <input
        aria-label="User ID"
        value={userId}
        onChange={(event) => {
          onUserIdChange(event.target.value);
        }}
        spellCheck={false}
        className="min-w-0 grow rounded-lg bg-white/10 px-3 py-2 font-mono text-sm outline-none focus:bg-white/15"
      />
      <CopyButton value={userId} title="Copy userId to clipboard" />
      <button
        type="button"
        onClick={onRegenerateUserId}
        title="Generate a new userId"
        className="cursor-pointer rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold transition hover:bg-white/20"
      >
        ↻
      </button>
    </div>
    {/* Email: editable local-part + a button cycling the domain (external @example.org ↔
        internal @getunleash.io, which matches the internal-users segment) + copy. */}
    <div className="mt-2 flex gap-2">
      <input
        aria-label="Email local-part"
        value={emailLocal}
        onChange={(event) => {
          onEmailLocalChange(event.target.value);
        }}
        spellCheck={false}
        className="min-w-0 grow rounded-lg bg-white/10 px-3 py-2 font-mono text-sm outline-none focus:bg-white/15"
      />
      <button
        type="button"
        onClick={onCycleEmailDomain}
        title="Cycle the email domain (external ↔ internal)"
        className="shrink-0 cursor-pointer rounded-lg bg-white/10 px-3 py-2 font-mono text-sm font-semibold transition hover:bg-white/20"
      >
        {emailDomain}
      </button>
      <CopyButton value={email} title="Copy email to clipboard" />
    </div>
  </section>
);

const TOOLBAR_HINT =
  'The Unleash icon should be pinned in the bottom-left, or you can enable it via scripts in the browser console. ' +
  'After showing it, flip any flag available there, and watch the checkout change instantly: no redeploy, no reload.';

/** The 30% "environment" panel: shape the demo, then watch the checkout react. */
export const DevPanel = ({
  onApplyPreset,
  onAddProduct,
  userId,
  onUserIdChange,
  onRegenerateUserId,
  emailLocal,
  emailDomain,
  email,
  onEmailLocalChange,
  onCycleEmailDomain,
}: DevPanelProps) => (
  // The sidebar scrolls internally (see App), so keep the rhythm tight; the Toolbar launcher is
  // hidden by default now, so no need to reserve a tall bottom gap for it.
  <div className="mt-4 flex grow flex-col gap-4 pb-6">
    {/* Make it unmistakable this is a testing aid, not the store checkout. */}
    <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs leading-relaxed text-amber-100">
      <span className="font-bold">⚠ This is development testing tool</span>: not part of the store
      checkout. Like the{' '}
      <a
        href="https://github.com/Unleash/unleash-toolbar"
        target="_blank"
        rel="noreferrer"
        className="font-semibold underline decoration-dotted underline-offset-2 hover:text-amber-50"
      >
        Unleash Toolbar
      </a>
      , it sits outside the page to shape demo state.{' '}
      {/* Tooltip lives here now — the toolbar widget itself is pinned bottom-left. */}
      <span
        tabIndex={0}
        title={TOOLBAR_HINT}
        aria-label={TOOLBAR_HINT}
        className="ml-0.5 inline-grid h-4 w-4 cursor-help place-items-center rounded-full border border-amber-400/60 align-middle text-[10px] text-amber-100"
      >
        i
      </span>
    </div>

    <ShopperIdentity
      userId={userId}
      onUserIdChange={onUserIdChange}
      onRegenerateUserId={onRegenerateUserId}
      emailLocal={emailLocal}
      emailDomain={emailDomain}
      email={email}
      onEmailLocalChange={onEmailLocalChange}
      onCycleEmailDomain={onCycleEmailDomain}
    />

    <section>
      <h2 className="text-xs font-bold uppercase tracking-widest text-white/50">Test scenarios</h2>
      <p className="mt-1 text-xs text-white/70">
        Pick one to fill the basket and rotate the shopper details.
      </p>
      <div className="mt-3 grid gap-2">
        {PRESETS.map((preset) => {
          // The "empty" preset clears the cart — set it apart with a warning tone.
          const tone =
            preset.id === 'empty'
              ? 'border border-orange-400/40 bg-orange-500/15 text-orange-200 hover:bg-orange-500/25'
              : 'bg-white/10 hover:bg-white/20';
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                onApplyPreset(preset.lines);
              }}
              className={`cursor-pointer rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${tone}`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    </section>

    <section>
      <h2 className="text-xs font-bold uppercase tracking-widest text-white/50">Add to basket</h2>
      <p className="mt-1 text-xs text-white/70">Click an item to add it to the basket.</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {CATALOG.map((product) => (
          <button
            key={product.id}
            type="button"
            onClick={() => {
              onAddProduct(product.id);
            }}
            title={`Add ${product.name}`}
            className="flex cursor-pointer flex-col overflow-hidden rounded-lg bg-white/10 text-left transition hover:bg-white/20"
          >
            {/* Picker thumbnails always show — independent of the product-images flag. */}
            <img
              src={PRODUCT_IMAGES[product.id]}
              alt=""
              className="aspect-square w-full bg-white object-cover"
            />
            <span className="flex flex-col gap-0.5 px-1.5 py-1">
              <span className="line-clamp-2 text-[11px] font-semibold leading-tight">
                {product.name}
              </span>
              <span className="text-[10px] text-white/60">{formatMoney(product.unitPrice)}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  </div>
);
