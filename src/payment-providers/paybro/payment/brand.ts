/** Loads PayBro's (gloriously dated) brand assets, resolved relative to this module. */
import { readFileSync } from 'node:fs';

const readAsset = (name: string): string =>
  readFileSync(new URL(`../assets/${name}`, import.meta.url), 'utf8');

export const PAYBRO_LOGO_SVG = readAsset('paybro-logo.svg');
export const PAYBRO_FAVICON_SVG = readAsset('favicon.svg');
