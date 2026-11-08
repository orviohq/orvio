import { AUDIO_QUOTA_LABEL } from './audio-quota-label';
import type { Language } from './i18n';
export const PATCH_V024 = {
  version: '0.2.24',
  date: '2026-11-08',
  notes: Object.fromEntries(
    Object.entries(AUDIO_QUOTA_LABEL).map(([language, text]) => [
      language,
      [text],
    ]),
  ) as Record<Language, string[]>,
};
