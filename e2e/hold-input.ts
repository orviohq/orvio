import type { Page } from '@playwright/test';
import {
  readBindingProfile,
  resolvedModeBindings,
  isKeyMode,
} from '../src/key-mode-registry';
import { atKey } from './input';
/** Use the same current profile/migration as the app, not the legacy5K default. */
export async function heldBindingCodes(page: Page): Promise<string[]> {
  const { saved, mode } = await page.evaluate(() => ({
    saved: JSON.parse(localStorage.getItem('orvio.settings.v1') || '{}'),
    mode: (window as any).orvioDiagnostics.settings.lanes,
  }));
  if (!isKeyMode(mode)) throw Error('Unsupported held-note key mode');
  return resolvedModeBindings(
    readBindingProfile(saved.bindingProfile, saved.keys),
    mode,
  );
}
export async function atHeldKey(
  page: Page,
  at: number,
  code: string,
  down: boolean,
) {
  // Existing atKey accepts a letter or Space and constructs the DOM code.
  if (!/^Key[A-Z]$/.test(code) && code !== 'Space')
    throw Error('Held test key unsupported');
  return atKey(page, at, code === 'Space' ? code : code.slice(3), down);
}
