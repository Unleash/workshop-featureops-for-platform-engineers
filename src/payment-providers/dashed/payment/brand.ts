/** Loads Dashed's (sleek, modern) brand assets, resolved relative to this module. */
import { readFileSync } from 'node:fs';

const readAsset = (name: string): string =>
  readFileSync(new URL(`../assets/${name}`, import.meta.url), 'utf8');

export const DASHED_LOGO_SVG = readAsset('dashed-logo.svg');
export const DASHED_FAVICON_SVG = readAsset('favicon.svg');
/** A stylised fingerprint sensor, drawn as a few concentric ridges. */
export const DASHED_FINGERPRINT_SVG = readAsset('fingerprint.svg');
